import { Router } from 'express';
import { collections, db } from '../firebase';
import { requireAuth } from '../middleware/auth';
import { validateRequest } from '../middleware/validateRequest';
import { ProductSchema } from '../schemas';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;
        const search = (req.query.search as string || '').trim();
        const categoryId = req.query.categoryId as string || '';

        // Build query — remove orderBy from Firestore to avoid composite index requirement
        let query: FirebaseFirestore.Query = collections.products;

        // Execute query without strict limit to allow memory sorting
        // We use a high limit (5000) as a safety measure for small-medium inventories
        const snapshot = await query.limit(5000).get();

        let allDocs = snapshot.docs.map(doc => {
            const data = doc.data() as any;
            
            // Normalize for both new and legacy structures
            const productName = data.productName || data.name || '';
            const categoryName = data.category || data.categoryName || 'General Product';
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
                categoryId: data.categoryId || data.category || 'products',
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
            const categoryMap: Record<string, string> = {
                'milk-products': 'Milk Products',
                'lassi-items': 'Lassi Items',
                'curd-paneer': 'Curd & Paneer',
                'ghee': 'Ghee',
                'breads-cakes-biscuits': 'Breads Cakes & Biscuits',
                'sweets': 'Sweets',
                'savory-snacks-others': 'Savory Snacks & Others',
            };
            const targetCategory = categoryMap[categoryId] || categoryId;
            allDocs = allDocs.filter(doc => 
                doc.category === targetCategory || 
                doc.categoryName === targetCategory ||
                doc.categoryId === categoryId
            );
        }

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
            category: category || categoryName || 'General Product',
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
            categoryName: category || categoryName || 'General Product',
            category: category || categoryId,
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
            updates.category = category || categoryName || categoryId;
            updates.categoryName = category || categoryName;
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