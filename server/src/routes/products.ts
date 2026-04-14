import { Router } from 'express';
import { collections } from '../firebase';
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

        // Server-side search: Firestore range query on 'name'
        if (search) {
            query = query
                .where('name', '>=', search)
                .where('name', '<=', search + '\uf8ff');
            // If we have search, Firestore forced us to sort by 'name' anyway or it fails.
            // But search is usually specific enough.
        }

        // Server-side category filter
        if (categoryId && categoryId !== 'all') {
            query = query.where('categoryId', '==', categoryId);
        }

        // Execute query without strict limit to allow memory sorting
        // We use a high limit (5000) as a safety measure for small-medium inventories
        const snapshot = await query.limit(5000).get();

        // If no results with categoryId, try legacy category field for older data
        let docs = snapshot.docs;
        if (docs.length === 0 && categoryId && categoryId !== 'all' && !search) {
            const legacySnapshot = await collections.products
                .where('category', '==', categoryId)
                .limit(5000)
                .get();
            docs = legacySnapshot.docs;
        }

        let allDocs = docs.map(doc => {
            const data = doc.data() as any;
            const normalizedData = {
                id: doc.id,
                ...data,
                name: data.name || '',
                categoryId: data.categoryId || data.category || 'products',
                categoryName: data.categoryName || (data.category ? data.category.charAt(0).toUpperCase() + data.category.slice(1) : 'General Product'),
                type: data.categoryId || data.category || 'products',
                low_stock_threshold: data.min_stock || 10
            };
            return normalizedData;
        });

        // Perform in-memory sorting
        allDocs.sort((a, b) => (String(a.name) || '').localeCompare(String(b.name) || ''));

        // Client-side pagination matching the API request
        const start = (page - 1) * limit;
        const data = allDocs.slice(start, start + limit);

        // Count for total results found
        let totalCount = allDocs.length;
        
        // Defensive count: use aggregation if available, otherwise use fetched list size
        if (!categoryId || categoryId === 'all') {
            if (!search) {
                try {
                    const countSnapshot = await collections.products.count().get();
                    totalCount = countSnapshot.data().count;
                } catch (e) {
                    console.warn('Firestore count() failed, falling back to document length:', e);
                    // totalCount already set to allDocs.length
                }
            }
        }

        res.json({
            data,
            count: totalCount,
            page,
            totalPages: Math.ceil(totalCount / limit)
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
            cost_price, 
            low_stock_threshold, 
            reorder_level,
            track_expiry, 
            expiry_date 
        } = req.body;

        const newProduct = {
            name,
            categoryId,
            categoryName,
            category: categoryId, // Keep for backward compatibility
            unit: unit || 'unit',
            price: parseFloat(price as any) || 0,
            cost_price: parseFloat(cost_price as any) || 0,
            min_stock: parseInt((low_stock_threshold || reorder_level) as any) || 10,
            track_expiry: !!track_expiry,
            expiry_date: expiry_date || null,
            created_at: new Date().toISOString()
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
            cost_price, 
            low_stock_threshold, 
            reorder_level,
            track_expiry, 
            expiry_date 
        } = req.body;

        const updates: any = {};
        if (name !== undefined) updates.name = name;
        if (categoryId !== undefined) {
            updates.categoryId = categoryId;
            updates.category = categoryId; // Backwards compatibility
        }
        if (categoryName !== undefined) updates.categoryName = categoryName;
        if (unit !== undefined) updates.unit = unit;
        if (price !== undefined) updates.price = parseFloat(price as any);
        if (cost_price !== undefined) updates.cost_price = parseFloat(cost_price as any);
        if (low_stock_threshold !== undefined || reorder_level !== undefined) {
            updates.min_stock = parseInt((low_stock_threshold || reorder_level) as any);
        }
        if (track_expiry !== undefined) updates.track_expiry = track_expiry;
        if (expiry_date !== undefined) updates.expiry_date = expiry_date || null;

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
