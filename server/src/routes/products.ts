import { Router } from 'express';
import { supabase } from '../supabase';

const router = Router();

router.get('/', async (req, res) => {
    const { data, error } = await supabase.from('products').select('*').order('id');
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
});

router.post('/', async (req, res) => {
    const { name, category, unit, selling_price, cost_price, min_stock } = req.body;
    const { data, error } = await supabase
        .from('products')
        .insert([{ name, category, unit, selling_price, cost_price, min_stock }])
        .select();

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
});

router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    const { data, error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', id)
        .select();

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
});

router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ message: 'Product deleted' });
});

export default router;
