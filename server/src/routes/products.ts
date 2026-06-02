import { Router } from 'express';
import { collections, db } from '../firebase';
import { requireAuth } from '../middleware/auth';
import { validateRequest } from '../middleware/validateRequest';
import { ProductSchema } from '../schemas';

const router = Router();

const KNOWN_CATEGORY_NAMES: Record<string, string> = {
    'milk-products': 'Milk Products',
    'lassi-items': 'Lassi Items',
    'curd-paneer': 'Curd & Paneer',
    'ghee': 'Ghee',
    'breads-cakes-biscuits': 'Breads Cakes & Biscuits',
    'bread-cakes-biscuits': 'Bread Cakes & Biscuits',
    'sweets': 'Sweets',
    'savory-snacks-others': 'Savory Snacks & Others',
};

const normalizeCategoryValue = (value: unknown) =>
    String(value || '')
        .trim()
        .toLowerCase()
        .replace(/&/g, 'and')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

router.get('/', requireAuth, async (req, res) => {
  console.log('[products GET] Request received with params:', {
    page: req.query.page,
    limit: req.query.limit,
    search: req.query.search,
    categoryId: req.query.categoryId
  });
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const search = (req.query.search as string || '').trim();
    const categoryId = req.query.categoryId as string || '';

    let requestedCategoryName = '';
    if (categoryId && categoryId !== 'all' && !KNOWN_CATEGORY_NAMES[categoryId]) {
      const categoryDoc = await collections.categories.doc(categoryId).get();
      if (categoryDoc.exists) {
        requestedCategoryName = String(categoryDoc.data()?.name || '');
      }
    }
    console.log('[products GET] requestedCategoryName:', requestedCategoryName);

    // Build query — remove orderBy from Firestore to avoid composite index requirement
    let query: FirebaseFirestore.Query = collections.products;

    // Execute query without strict limit to allow memory sorting
    // We use a high limit (5000) as a safety measure for small-medium inventories
    const snapshot = await query.limit(5000).get();
    console.log('[products GET] Number of products from Firestore:', snapshot.size);

    let allDocs = snapshot.docs.map(doc => {
      const data = doc.data() as any;
      console.log('[products GET] Raw product from Firestore:', { id: doc.id, ...data });
            
            // Normalize for both new and legacy structures
            const productName = data.productName || data.name || '';
            const rawCategoryId = data.categoryId || '';
            const rawCategoryName = data.categoryName || '';
            const rawCategory = data.category || '';
            const categoryName =
                rawCategoryName ||
                KNOWN_CATEGORY_NAMES[rawCategory] ||
                KNOWN_CATEGORY_NAMES[normalizeCategoryValue(rawCategory)] ||
                (rawCategory && rawCategory !== rawCategoryId ? rawCategory : '') ||
                KNOWN_CATEGORY_NAMES[rawCategoryId] ||
                KNOWN_CATEGORY_NAMES[normalizeCategoryValue(rawCategoryId)] ||
                'General Product';
            const counterPrice = data.counterPrice || data.price || 0;
            const distributionPrice = data.distributionPrice || data.distribution_price || 0;
            const costPrice = data.costPrice || data.cost_price || counterPrice;
            const stock = data.stock || data.stock_quantity || 0;
            const thresholdLimit = data.thresholdLimit || data.min_stock || data.low_stock_threshold || 5;
            const isLowStock = stock <= thresholdLimit;

            return {
                id: doc.id,
                ...data,
                // New fields
                productName,
                category: categoryName,
                costPrice,
                counterPrice,
                distributionPrice,
                stock,
                thresholdLimit,
                isActive: data.isActive !== false,
                is_low_stock: isLowStock,
                // Legacy fields for compatibility
                name: productName,
                categoryId: rawCategoryId || rawCategory || 'products',
                categoryName: categoryName,
                unit: data.unit || 'packets',
                price: counterPrice,
                distribution_price: distributionPrice,
                cost_price: costPrice,
                min_stock: thresholdLimit,
                low_stock_threshold: thresholdLimit,
                stock_quantity: stock,
            };
        });

        // Apply category filter in memory (since categories are stored as names now)
    if (categoryId && categoryId !== 'all') {
        console.log('[products GET] Applying category filter for:', categoryId);
        const targetCategory =
            requestedCategoryName ||
            KNOWN_CATEGORY_NAMES[categoryId] ||
            KNOWN_CATEGORY_NAMES[normalizeCategoryValue(categoryId)] ||
            categoryId;
        console.log('[products GET] targetCategory:', targetCategory);
        
        // Create a set of lowercased target keys for case-insensitive matching
        const targetKeysLower = new Set([
            categoryId.toLowerCase(),
            targetCategory.toLowerCase(),
            normalizeCategoryValue(categoryId), // already lowercased
            normalizeCategoryValue(targetCategory), // already lowercased
        ].filter(Boolean));
        console.log('[products GET] targetKeysLower:', targetKeysLower);

        allDocs = allDocs.filter(doc => {
            const productCategoryKeysLower = [
                (doc.category || '').toLowerCase(),
                (doc.categoryName || '').toLowerCase(),
                (doc.categoryId || '').toLowerCase(),
                normalizeCategoryValue(doc.category),
                normalizeCategoryValue(doc.categoryName),
                normalizeCategoryValue(doc.categoryId),
            ].filter(Boolean);
            const matches = productCategoryKeysLower.some(value => targetKeysLower.has(value));
            console.log('[products GET] Product', doc.productName, 'productCategoryKeysLower:', productCategoryKeysLower, 'matches:', matches);
            return matches;
        });
    }
    console.log('[products GET] Number of products after category filter:', allDocs.length);

    // Apply search filter in memory
    if (search) {
      const searchLower = search.toLowerCase();
      allDocs = allDocs.filter(doc => 
        doc.productName.toLowerCase().includes(searchLower) || 
        doc.name.toLowerCase().includes(searchLower)
      );
    }

    // Perform in-memory sorting
    allDocs.sort((a, b) => (String(a.productName) || '').localeCompare(String(b.productName) || ''));

    // Client-side pagination matching the API request
    const start = (page - 1) * limit;
    const data = allDocs.slice(start, start + limit);

    console.log('[products GET] Sending response with count:', allDocs.length, 'data length:', data.length);
    res.json({
      data,
      count: allDocs.length,
      page,
      totalPages: Math.ceil(allDocs.length / limit)
    });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

router.post('/', requireAuth, validateRequest(ProductSchema), async (req, res) => {
    try {
        const { 
            name, 
            categoryId,
            categoryName,
            unit, 
            price, 
            distribution_price,
            cost_price, 
            low_stock_threshold, 
            reorder_level,
            track_expiry, 
            expiry_date,
            productName,
            category,
            costPrice,
            counterPrice,
            distributionPrice,
            thresholdLimit,
            isActive
        } = req.body;

        const newProduct = {
            productName: productName || name || '',
            category: category || categoryName || KNOWN_CATEGORY_NAMES[categoryId] || 'General Product',
            costPrice: costPrice || counterPrice || price || 0,
            counterPrice: counterPrice || price || 0,
            distributionPrice: distributionPrice || distribution_price || 0,
            stock: 0,
            thresholdLimit: thresholdLimit || low_stock_threshold || reorder_level || 5,
            isActive: isActive !== false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            // Legacy fields for compatibility
            name: productName || name || '',
            categoryId: categoryId || category || 'products',
            categoryName: categoryName || category || KNOWN_CATEGORY_NAMES[categoryId] || 'General Product',
            unit: unit || 'packets',
            price: counterPrice || price || 0,
            distribution_price: distributionPrice || distribution_price || 0,
            cost_price: costPrice || cost_price || counterPrice || 0,
            min_stock: thresholdLimit || low_stock_threshold || 5,
            track_expiry: !!track_expiry,
            expiry_date: expiry_date || null,
        };

        const docRef = await collections.products.add(newProduct);
        const doc = await docRef.get();

        res.json([{ id: doc.id, ...doc.data() }]);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

router.put('/:id', requireAuth, validateRequest(ProductSchema), async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            name, 
            categoryId,
            categoryName,
            unit, 
            price, 
            distribution_price,
            cost_price, 
            low_stock_threshold, 
            reorder_level,
            track_expiry, 
            expiry_date,
            productName,
            category,
            costPrice,
            counterPrice,
            distributionPrice,
            thresholdLimit,
            isActive
        } = req.body;

        const updates: any = {};
        if (name !== undefined || productName !== undefined) {
            updates.productName = productName || name;
            updates.name = productName || name;
        }
        if (category !== undefined || categoryName !== undefined || categoryId !== undefined) {
            updates.category = category || categoryName || KNOWN_CATEGORY_NAMES[categoryId] || categoryId;
            updates.categoryName = categoryName || category || KNOWN_CATEGORY_NAMES[categoryId] || categoryId;
            updates.categoryId = categoryId || category;
        }
        if (costPrice !== undefined || cost_price !== undefined) {
            updates.costPrice = costPrice || cost_price;
            updates.cost_price = costPrice || cost_price;
        }
        if (counterPrice !== undefined || price !== undefined) {
            updates.counterPrice = counterPrice || price;
            updates.price = counterPrice || price;
        }
        if (distributionPrice !== undefined || distribution_price !== undefined) {
            updates.distributionPrice = distributionPrice || distribution_price;
            updates.distribution_price = distributionPrice || distribution_price;
        }
        if (thresholdLimit !== undefined || low_stock_threshold !== undefined || reorder_level !== undefined) {
            updates.thresholdLimit = thresholdLimit || low_stock_threshold || reorder_level;
            updates.min_stock = thresholdLimit || low_stock_threshold || reorder_level;
            updates.low_stock_threshold = thresholdLimit || low_stock_threshold || reorder_level;
        }
        if (isActive !== undefined) {
            updates.isActive = isActive;
        }
        if (unit !== undefined) {
            updates.unit = unit;
        }
        if (track_expiry !== undefined) {
            updates.track_expiry = track_expiry;
        }
        if (expiry_date !== undefined) {
            updates.expiry_date = expiry_date;
        }
        updates.updatedAt = new Date().toISOString();

        await collections.products.doc(id).update(updates);
        const doc = await collections.products.doc(id).get();

        res.json([{ id: doc.id, ...doc.data() }]);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        await collections.products.doc(id).delete();
        res.json({ message: 'Product deleted' });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

export default router;
