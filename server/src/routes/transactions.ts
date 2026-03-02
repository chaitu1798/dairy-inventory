import { Router } from 'express';
import { collections, db } from '../firebase';
import { requireAuth } from '../middleware/auth';
import { validateRequest } from '../middleware/validateRequest';
import { PurchaseSchema, SaleSchema, ExpenseSchema } from '../schemas';

const router = Router();

// Helper to fetch documents with their details (mimic joins)
async function getDocsWithJoin(collection: FirebaseFirestore.CollectionReference, joinConfigs: { field: string, collection: FirebaseFirestore.CollectionReference, resultField: string }[], query?: FirebaseFirestore.Query) {
    let baseQuery = query || collection;
    const snapshot = await baseQuery.get();
    const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    for (const doc of docs as any[]) {
        for (const config of joinConfigs) {
            const id = doc[config.field];
            if (id) {
                const joinDoc = await config.collection.doc(id).get();
                if (joinDoc.exists) {
                    doc[config.resultField] = { id: joinDoc.id, ...joinDoc.data() };
                }
            }
        }
    }
    return { docs, total: snapshot.size };
}

// Purchases
router.get('/purchases', requireAuth, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;

        let query: FirebaseFirestore.Query = collections.purchases.orderBy('purchase_date', 'desc');

        if (startDate) query = query.where('purchase_date', '>=', startDate);
        if (endDate) query = query.where('purchase_date', '<=', endDate);

        const snapshot = await query.limit(limit * page).get();
        const allDocs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const start = (page - 1) * limit;
        const purchases = allDocs.slice(start, start + limit);

        // Fetch product details for each purchase
        for (const p of purchases as any[]) {
            if (p.product_id) {
                const prodDoc = await collections.products.doc(p.product_id).get();
                if (prodDoc.exists) {
                    p.products = { name: prodDoc.data()?.name, unit: prodDoc.data()?.unit };
                }
            }
        }

        const countSnapshot = await collections.purchases.count().get();
        const count = countSnapshot.data().count;

        res.json({
            data: purchases,
            count,
            page,
            totalPages: Math.ceil(count / limit)
        });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

router.post('/purchases', requireAuth, validateRequest(PurchaseSchema), async (req, res) => {
    try {
        const { product_id, quantity, purchase_date, expiry_date, image_url } = req.body;
        const finalExpiryDate = expiry_date === '' ? null : expiry_date;

        const productDoc = await collections.products.doc(product_id).get();
        if (!productDoc.exists) {
            return res.status(400).json({ error: 'Product not found' });
        }

        const price = productDoc.data()?.cost_price || 0;
        const total = (parseFloat(quantity) || 0) * (parseFloat(price) || 0);

        const newPurchase = {
            product_id,
            quantity: parseFloat(quantity) || 0,
            price: parseFloat(price) || 0,
            total,
            purchase_date,
            expiry_date: finalExpiryDate
        };

        const docRef = await collections.purchases.add(newPurchase);
        const doc = await docRef.get();

        // Log to stock_logs
        await collections.stock_logs.add({
            product_id,
            quantity: parseFloat(quantity) || 0,
            action_type: 'IN',
            image_url: image_url || null,
            updated_by: 'system',
            created_at: new Date().toISOString()
        });

        res.json([{ id: doc.id, ...doc.data() }]);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

router.put('/purchases/:id', requireAuth, validateRequest(PurchaseSchema), async (req, res) => {
    try {
        const { id } = req.params;
        const { product_id, quantity, purchase_date, expiry_date } = req.body;

        const updates: any = {};
        if (product_id !== undefined) updates.product_id = product_id;
        if (quantity !== undefined) updates.quantity = parseFloat(quantity as any);
        if (purchase_date !== undefined) updates.purchase_date = purchase_date;
        if (expiry_date !== undefined) updates.expiry_date = expiry_date === '' ? null : expiry_date;

        if (updates.quantity !== undefined || updates.product_id !== undefined) {
            // Re-calculate total if needed
            const currentDoc = await collections.purchases.doc(id).get();
            const pid = updates.product_id || currentDoc.data()?.product_id;
            const qty = updates.quantity !== undefined ? updates.quantity : currentDoc.data()?.quantity;
            const productDoc = await collections.products.doc(pid).get();
            const price = productDoc.data()?.cost_price || 0;
            updates.total = qty * price;
            updates.price = price;
        }

        await collections.purchases.doc(id).update(updates);
        const doc = await collections.purchases.doc(id).get();
        res.json([{ id: doc.id, ...doc.data() }]);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

router.delete('/purchases/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        await collections.purchases.doc(id).delete();
        res.json({ message: 'Purchase deleted' });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// Sales
router.get('/sales', requireAuth, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;

        let query: FirebaseFirestore.Query = collections.sales.orderBy('sale_date', 'desc');

        if (startDate) query = query.where('sale_date', '>=', startDate);
        if (endDate) query = query.where('sale_date', '<=', endDate);

        const snapshot = await query.limit(limit * page).get();
        const allDocs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const start = (page - 1) * limit;
        const sales = allDocs.slice(start, start + limit);

        for (const s of sales as any[]) {
            if (s.product_id) {
                const prodDoc = await collections.products.doc(s.product_id).get();
                if (prodDoc.exists) s.products = { name: prodDoc.data()?.name, unit: prodDoc.data()?.unit };
            }
            if (s.customer_id) {
                const custDoc = await collections.customers.doc(s.customer_id).get();
                if (custDoc.exists) s.customers = { name: custDoc.data()?.name };
            }
        }

        const countSnapshot = await collections.sales.count().get();
        const count = countSnapshot.data().count;

        res.json({
            data: sales,
            count,
            page,
            totalPages: Math.ceil(count / limit)
        });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

router.post('/sales', requireAuth, validateRequest(SaleSchema), async (req, res) => {
    try {
        const { product_id, quantity, sale_date, customer_id, status, due_date } = req.body;
        const finalDueDate = due_date === '' ? null : due_date;

        const productDoc = await collections.products.doc(product_id).get();
        if (!productDoc.exists) {
            return res.status(400).json({ error: 'Product not found' });
        }

        const price = productDoc.data()?.price || 0;
        const total = (parseFloat(quantity) || 0) * (parseFloat(price) || 0);
        const invoice_number = `INV-${Date.now()}`;

        const newSale = {
            product_id,
            quantity: parseFloat(quantity) || 0,
            price: parseFloat(price) || 0,
            total,
            sale_date,
            customer_id: customer_id || null,
            status: status || 'paid',
            due_date: finalDueDate || null,
            invoice_number,
            created_at: new Date().toISOString()
        };

        const docRef = await collections.sales.add(newSale);
        const doc = await docRef.get();

        // Log to stock_logs
        await collections.stock_logs.add({
            product_id,
            quantity: parseFloat(quantity) || 0,
            action_type: 'OUT',
            updated_by: 'system',
            created_at: new Date().toISOString()
        });

        res.json([{ id: doc.id, ...doc.data() }]);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

router.put('/sales/:id', requireAuth, validateRequest(SaleSchema), async (req, res) => {
    try {
        const { id } = req.params;
        const { product_id, customer_id, quantity, price, sale_date, status, due_date } = req.body;

        const updates: any = {};
        if (product_id !== undefined) updates.product_id = product_id;
        if (customer_id !== undefined) updates.customer_id = customer_id || null;
        if (quantity !== undefined) updates.quantity = parseFloat(quantity as any);
        if (price !== undefined) updates.price = parseFloat(price as any);
        if (sale_date !== undefined) updates.sale_date = sale_date;
        if (status !== undefined) updates.status = status;
        if (due_date !== undefined) updates.due_date = due_date === '' ? null : due_date;

        if (updates.quantity !== undefined || updates.price !== undefined) {
            const currentDoc = await collections.sales.doc(id).get();
            const qty = updates.quantity !== undefined ? updates.quantity : currentDoc.data()?.quantity;
            const prc = updates.price !== undefined ? updates.price : currentDoc.data()?.price;
            updates.total = qty * prc;
        }

        await collections.sales.doc(id).update(updates);
        const doc = await collections.sales.doc(id).get();
        res.json([{ id: doc.id, ...doc.data() }]);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

router.delete('/sales/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;

        // Delete related payments
        const paymentsSnapshot = await collections.payments.where('sale_id', '==', id).get();
        const batch = db.batch();
        paymentsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();

        await collections.sales.doc(id).delete();
        res.json({ message: 'Sale deleted' });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// Expenses
router.get('/expenses', requireAuth, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;

        let query: FirebaseFirestore.Query = collections.expenses.orderBy('expense_date', 'desc');

        if (startDate) query = query.where('expense_date', '>=', startDate);
        if (endDate) query = query.where('expense_date', '<=', endDate);

        const snapshot = await query.limit(limit * page).get();
        const allDocs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const start = (page - 1) * limit;
        const expenses = allDocs.slice(start, start + limit);

        const countSnapshot = await collections.expenses.count().get();
        const count = countSnapshot.data().count;

        res.json({
            data: expenses,
            count,
            page,
            totalPages: Math.ceil(count / limit)
        });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

router.post('/expenses', requireAuth, validateRequest(ExpenseSchema), async (req, res) => {
    try {
        const { category, amount, notes, expense_date } = req.body;
        const newExpense = {
            category,
            amount: parseFloat(amount) || 0,
            notes,
            expense_date,
            created_at: new Date().toISOString()
        };

        const docRef = await collections.expenses.add(newExpense);
        const doc = await docRef.get();
        res.json([{ id: doc.id, ...doc.data() }]);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

router.put('/expenses/:id', requireAuth, validateRequest(ExpenseSchema), async (req, res) => {
    try {
        const { id } = req.params;
        const { category, amount, notes, expense_date } = req.body;

        const updates: any = {};
        if (category !== undefined) updates.category = category;
        if (amount !== undefined) updates.amount = parseFloat(amount as any);
        if (notes !== undefined) updates.notes = notes;
        if (expense_date !== undefined) updates.expense_date = expense_date;

        await collections.expenses.doc(id).update(updates);
        const doc = await collections.expenses.doc(id).get();
        res.json([{ id: doc.id, ...doc.data() }]);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

router.delete('/expenses/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        await collections.expenses.doc(id).delete();
        res.json({ message: 'Expense deleted' });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

export default router;
