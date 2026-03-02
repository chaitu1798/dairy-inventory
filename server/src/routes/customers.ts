import { Router } from 'express';
import { collections } from '../firebase';
import { requireAuth } from '../middleware/auth';
import { validateRequest } from '../middleware/validateRequest';
import { CustomerSchema } from '../schemas';

const router = Router();

// Get all customers
router.get('/', requireAuth, async (req, res) => {
    try {
        const snapshot = await collections.customers.orderBy('name').get();
        const customers = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        res.json(customers);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// Create customer
router.post('/', requireAuth, validateRequest(CustomerSchema), async (req, res) => {
    try {
        const { name, phone, email, address, credit_limit } = req.body;
        const newCustomer = {
            name,
            phone,
            email,
            address,
            credit_limit: parseFloat(credit_limit as any) || 0,
            created_at: new Date().toISOString()
        };

        const docRef = await collections.customers.add(newCustomer);
        const doc = await docRef.get();

        res.json({ id: doc.id, ...doc.data() });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// Update customer
router.put('/:id', requireAuth, validateRequest(CustomerSchema), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, phone, email, address, credit_limit } = req.body;

        const updates: any = {};
        if (name !== undefined) updates.name = name;
        if (phone !== undefined) updates.phone = phone;
        if (email !== undefined) updates.email = email;
        if (address !== undefined) updates.address = address;
        if (credit_limit !== undefined) updates.credit_limit = parseFloat(credit_limit as any);

        await collections.customers.doc(id).update(updates);
        const doc = await collections.customers.doc(id).get();

        res.json({ id: doc.id, ...doc.data() });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// Delete customer
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;

        // Unlink related sales first (in Firestore, we need to query and update each document)
        const salesSnapshot = await collections.sales.where('customer_id', '==', id).get();
        const batch = collections.sales.firestore.batch();

        salesSnapshot.docs.forEach(doc => {
            batch.update(doc.ref, { customer_id: null });
        });

        await batch.commit();

        await collections.customers.doc(id).delete();
        res.json({ message: 'Customer deleted' });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

export default router;
