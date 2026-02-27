import { Router } from 'express';
import { supabase } from '../supabase';
import { requireAuth } from '../middleware/auth';
import { validateRequest } from '../middleware/validateRequest';
import { CustomerSchema } from '../schemas';
const router = Router();

// Get all customers
router.get('/', requireAuth, async (req, res) => {
    const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name');

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
});

// Create customer
router.post('/', requireAuth, validateRequest(CustomerSchema), async (req, res) => {
    const { name, phone, email, address, credit_limit } = req.body;
    const { data, error } = await supabase
        .from('customers')
        .insert([{ name, phone, email, address, credit_limit }])
        .select();

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
});

// Update customer
router.put('/:id', requireAuth, validateRequest(CustomerSchema), async (req, res) => {
    const { id } = req.params;
    const { name, phone, email, address, credit_limit } = req.body;

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (phone !== undefined) updates.phone = phone;
    if (email !== undefined) updates.email = email;
    if (address !== undefined) updates.address = address;
    if (credit_limit !== undefined) updates.credit_limit = parseFloat(credit_limit as any);

    const { data, error } = await supabase
        .from('customers')
        .update(updates)
        .eq('id', id)
        .select();

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
});

// Delete customer
router.delete('/:id', requireAuth, async (req, res) => {
    const { id } = req.params;

    // Unlink related sales first (set customer_id to null)
    const { error: salesError } = await supabase
        .from('sales')
        .update({ customer_id: null })
        .eq('customer_id', id);

    if (salesError) console.error('Error unlinking sales:', salesError);

    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ message: 'Customer deleted' });
});

export default router;
