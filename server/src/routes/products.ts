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
    const { name, type, unit, price, cost_price, low_stock_threshold, track_expiry, expiry_date } = req.body;

    // Map frontend 'type' to backend 'category' and 'low_stock_threshold' to 'min_stock'
    const { data, error } = await supabase
        .from('products')
        .insert([{
            name,
            category: type,
            unit,
            price: parseFloat(price as any),
            cost_price: parseFloat(cost_price as any),
            min_stock: parseInt(low_stock_threshold as any) || 0,
            track_expiry,
            expiry_date: expiry_date || null
        }])
        .select();

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
});

router.put('/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    const { name, type, unit, price, cost_price, low_stock_threshold, track_expiry, expiry_date } = req.body;

    // Create clean update object
    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (type !== undefined) updates.category = type;
    if (unit !== undefined) updates.unit = unit;
    if (price !== undefined) updates.price = parseFloat(price as any);
    if (cost_price !== undefined) updates.cost_price = parseFloat(cost_price as any);
    if (low_stock_threshold !== undefined) updates.min_stock = parseInt(low_stock_threshold as any);
    if (track_expiry !== undefined) updates.track_expiry = track_expiry;
    if (expiry_date !== undefined) updates.expiry_date = expiry_date || null;
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
