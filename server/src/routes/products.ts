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

        // Simple pagination for Firestore
        const snapshot = await collections.products
            .orderBy('name')
            .limit(limit * page)
            .get();

        const allDocs = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        const start = (page - 1) * limit;
        const data = allDocs.slice(start, start + limit);
        const count = (await collections.products.count().get()).data().count;

        res.json({
            data,
            count,
            page,
            totalPages: Math.ceil(count / limit)
        });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

router.post('/', requireAuth, validateRequest(ProductSchema), async (req, res) => {
    try {
        const { name, type, unit, price, cost_price, low_stock_threshold, track_expiry, expiry_date } = req.body;

        const newProduct = {
            name,
            category: type,
            unit,
            price: parseFloat(price as any) || 0,
            cost_price: parseFloat(cost_price as any) || 0,
            min_stock: parseInt(low_stock_threshold as any) || 0,
            track_expiry: !!track_expiry,
            expiry_date: expiry_date || null,
            created_at: new Date().toISOString()
        };

        const docRef = await collections.products.add(newProduct);
        const doc = await docRef.get();

        res.json([{ id: doc.id, ...doc.data() }]); // Return array for client compatibility
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

router.put('/:id', requireAuth, validateRequest(ProductSchema), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, type, unit, price, cost_price, low_stock_threshold, track_expiry, expiry_date } = req.body;

        const updates: any = {};
        if (name !== undefined) updates.name = name;
        if (type !== undefined) updates.category = type;
        if (unit !== undefined) updates.unit = unit;
        if (price !== undefined) updates.price = parseFloat(price as any);
        if (cost_price !== undefined) updates.cost_price = parseFloat(cost_price as any);
        if (low_stock_threshold !== undefined) updates.min_stock = parseInt(low_stock_threshold as any);
        if (track_expiry !== undefined) updates.track_expiry = track_expiry;
        if (expiry_date !== undefined) updates.expiry_date = expiry_date || null;

        await collections.products.doc(id).update(updates);
        const doc = await collections.products.doc(id).get();

        res.json([{ id: doc.id, ...doc.data() }]); // Return array for client compatibility
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
