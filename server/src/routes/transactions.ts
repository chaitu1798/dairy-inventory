import { Router } from 'express';
import { supabase } from '../supabase';

const router = Router();

// Purchases
router.get('/purchases', async (req, res) => {
    const { startDate, endDate } = req.query;
    let query = supabase
        .from('purchases')
        .select(`
            *,
            products (
                name,
                unit
            )
        `)
        .order('purchase_date', { ascending: false });

    if (startDate) query = query.gte('purchase_date', startDate);
    if (endDate) query = query.lte('purchase_date', endDate);

    const { data, error } = await query;

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
});

router.post('/purchases', async (req, res) => {
    const { product_id, quantity, price, purchase_date, expiry_date } = req.body;
    const { data, error } = await supabase
        .from('purchases')
        .insert([{ product_id, quantity, price, purchase_date, expiry_date }])
        .select();

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
});

router.put('/purchases/:id', async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    const { data, error } = await supabase
        .from('purchases')
        .update(updates)
        .eq('id', id)
        .select();

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
});

router.delete('/purchases/:id', async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase.from('purchases').delete().eq('id', id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ message: 'Purchase deleted' });
});

// Sales
router.get('/sales', async (req, res) => {
    const { startDate, endDate } = req.query;
    let query = supabase
        .from('sales')
        .select(`
            *,
            products (
                name,
                unit
            )
        `)
        .order('sale_date', { ascending: false });

    if (startDate) query = query.gte('sale_date', startDate);
    if (endDate) query = query.lte('sale_date', endDate);

    const { data, error } = await query;

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
});

router.post('/sales', async (req, res) => {
    const { product_id, quantity, price, sale_date } = req.body;
    const { data, error } = await supabase
        .from('sales')
        .insert([{ product_id, quantity, price, sale_date }])
        .select();

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
});

router.put('/sales/:id', async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    const { data, error } = await supabase
        .from('sales')
        .update(updates)
        .eq('id', id)
        .select();

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
});

router.delete('/sales/:id', async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase.from('sales').delete().eq('id', id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ message: 'Sale deleted' });
});

// Expenses
router.get('/expenses', async (req, res) => {
    const { startDate, endDate } = req.query;
    let query = supabase
        .from('expenses')
        .select('*')
        .order('expense_date', { ascending: false });

    if (startDate) query = query.gte('expense_date', startDate);
    if (endDate) query = query.lte('expense_date', endDate);

    const { data, error } = await query;

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
});

router.post('/expenses', async (req, res) => {
    const { category, amount, notes, expense_date } = req.body;
    const { data, error } = await supabase
        .from('expenses')
        .insert([{ category, amount, notes, expense_date }])
        .select();

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
});

router.put('/expenses/:id', async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    const { data, error } = await supabase
        .from('expenses')
        .update(updates)
        .eq('id', id)
        .select();

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
});

router.delete('/expenses/:id', async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ message: 'Expense deleted' });
});

export default router;
