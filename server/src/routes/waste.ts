import { Router } from 'express';
import { collections } from '../firebase';
import { requireAuth } from '../middleware/auth';
import { validateRequest } from '../middleware/validateRequest';
import { WasteSchema } from '../schemas';

const router = Router();

// Create waste record
router.post('/', requireAuth, validateRequest(WasteSchema), async (req, res) => {
    try {
        const { product_id, quantity, reason, cost_value, waste_date, notes } = req.body;

        if (!['expired', 'damaged', 'other'].includes(reason)) {
            return res.status(400).json({ error: 'Invalid reason. Must be expired, damaged, or other' });
        }

        const newWaste = {
            product_id,
            quantity: parseFloat(quantity as any) || 0,
            reason,
            cost_value: parseFloat(cost_value as any) || 0,
            waste_date,
            notes,
            created_at: new Date().toISOString()
        };

        const docRef = await collections.waste.add(newWaste);
        const doc = await docRef.get();
        res.json([{ id: doc.id, ...doc.data() }]);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// Get waste records with optional date filtering
router.get('/', requireAuth, async (req, res) => {
    try {
        const { start_date, end_date } = req.query;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;

        let query: FirebaseFirestore.Query = collections.waste.orderBy('waste_date', 'desc');

        if (start_date) query = query.where('waste_date', '>=', start_date);
        if (end_date) query = query.where('waste_date', '<=', end_date);

        const snapshot = await query.limit(limit * page).get();
        const allDocs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const start = (page - 1) * limit;
        const wasteRecords = allDocs.slice(start, start + limit);

        // Fetch product details for each waste record
        for (const w of wasteRecords as any[]) {
            if (w.product_id) {
                const prodDoc = await collections.products.doc(w.product_id).get();
                if (prodDoc.exists) {
                    w.products = {
                        id: prodDoc.id,
                        name: prodDoc.data()?.name,
                        category: prodDoc.data()?.category,
                        unit: prodDoc.data()?.unit
                    };
                }
            }
        }

        const countSnapshot = await collections.waste.count().get();
        const count = countSnapshot.data().count;

        res.json({
            data: wasteRecords,
            count,
            page,
            totalPages: Math.ceil(count / limit)
        });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// Get waste summary statistics
router.get('/summary', requireAuth, async (req, res) => {
    try {
        const { start_date, end_date } = req.query;

        let query: FirebaseFirestore.Query = collections.waste;
        if (start_date) query = query.where('waste_date', '>=', start_date);
        if (end_date) query = query.where('waste_date', '<=', end_date);

        const snapshot = await query.get();
        const wasteData = snapshot.docs.map(doc => doc.data());

        const totalWasteValue = wasteData.reduce((acc, curr) => acc + (curr.cost_value || 0), 0);

        const wasteByReason = wasteData.reduce((acc: any, curr) => {
            acc[curr.reason] = (acc[curr.reason] || 0) + (curr.cost_value || 0);
            return acc;
        }, {});

        // Waste by product - involves fetching product names
        const productStats: any = {};
        for (const waste of wasteData) {
            const pid = waste.product_id;
            if (!productStats[pid]) {
                const prodDoc = await collections.products.doc(pid).get();
                const productName = prodDoc.exists ? prodDoc.data()?.name : 'Unknown';
                productStats[pid] = { name: productName, value: 0, quantity: 0 };
            }
            productStats[pid].value += waste.cost_value || 0;
            productStats[pid].quantity += waste.quantity || 0;
        }

        const wasteByProduct = Object.values(productStats).reduce((acc: any, curr: any) => {
            acc[curr.name] = { value: curr.value, quantity: curr.quantity };
            return acc;
        }, {});

        res.json({
            total_waste_value: totalWasteValue,
            waste_by_reason: wasteByReason,
            waste_by_product: wasteByProduct
        });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// Update waste record
router.put('/:id', requireAuth, validateRequest(WasteSchema), async (req, res) => {
    try {
        const { id } = req.params;
        const { product_id, quantity, reason, cost_value, waste_date, notes } = req.body;

        const updates: any = {};
        if (product_id !== undefined) updates.product_id = product_id;
        if (quantity !== undefined) updates.quantity = parseFloat(quantity as any);
        if (reason !== undefined) {
            if (!['expired', 'damaged', 'other'].includes(reason)) {
                return res.status(400).json({ error: 'Invalid reason. Must be expired, damaged, or other' });
            }
            updates.reason = reason;
        }
        if (cost_value !== undefined) updates.cost_value = parseFloat(cost_value as any);
        if (waste_date !== undefined) updates.waste_date = waste_date;
        if (notes !== undefined) updates.notes = notes;

        await collections.waste.doc(id).update(updates);
        const doc = await collections.waste.doc(id).get();
        res.json([{ id: doc.id, ...doc.data() }]);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// Delete waste record
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        await collections.waste.doc(id).delete();
        res.json({ message: 'Waste record deleted' });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

export default router;
