import { Router } from 'express';
import { supabase } from '../supabase';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/', async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50; // increased default to 50
    const start = (page - 1) * limit;
    const end = start + limit - 1;

    const { data, count, error } = await supabase
        .from('products')
        .select('*', { count: 'exact' })
        .order('id')
        .range(start, end);

    if (error) return res.status(400).json({ error: error.message });

    res.json({
        data,
        count,
        page,
        totalPages: count ? Math.ceil(count / limit) : 0
    });
});

router.post('/', requireAuth, async (req, res) => {
    const { name, category, unit, selling_price, cost_price, min_stock, track_expiry, expiry_days } = req.body;
    const { data, error } = await supabase
        .from('products')
        .insert([{ name, category, unit, selling_price, cost_price, min_stock, track_expiry, expiry_days }])
        .select();

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
});

router.put('/:id', requireAuth, async (req, res) => {
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

router.delete('/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ message: 'Product deleted' });
});

export default router;
