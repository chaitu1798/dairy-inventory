import { Router } from 'express';
import { supabase } from '../supabase';

const router = Router();

// Purchases
router.post('/purchases', async (req, res) => {
    const { product_id, quantity, price, purchase_date, expiry_date } = req.body;
    const { data, error } = await supabase
        .from('purchases')
        .insert([{ product_id, quantity, price, purchase_date, expiry_date }])
        .select();

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
});

// Sales
router.post('/sales', async (req, res) => {
    const { product_id, quantity, price, sale_date } = req.body;
    const { data, error } = await supabase
        .from('sales')
        .insert([{ product_id, quantity, price, sale_date }])
        .select();

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
});

// Expenses
router.post('/expenses', async (req, res) => {
    const { category, amount, notes, expense_date } = req.body;
    const { data, error } = await supabase
        .from('expenses')
        .insert([{ category, amount, notes, expense_date }])
        .select();

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
});

export default router;
