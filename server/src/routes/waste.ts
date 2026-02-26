import { Router } from 'express';
import { supabase } from '../supabase';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Create waste record
router.post('/', requireAuth, async (req, res) => {
    const { product_id, quantity, reason, cost_value, waste_date, notes } = req.body;

    // Validate reason
    if (!['expired', 'damaged', 'other'].includes(reason)) {
        return res.status(400).json({ error: 'Invalid reason. Must be expired, damaged, or other' });
    }

    const { data, error } = await supabase
        .from('waste')
        .insert([{
            product_id: parseInt(product_id as any),
            quantity: parseFloat(quantity as any),
            reason,
            cost_value: parseFloat(cost_value as any),
            waste_date,
            notes
        }])
        .select();

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
});

// Get waste records with optional date filtering
router.get('/', async (req, res) => {
    const { start_date, end_date } = req.query;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const start = (page - 1) * limit;
    const end = start + limit - 1;

    let query = supabase
        .from('waste')
        .select(`
            *,
            products (
                id,
                name,
                category,
                unit
            )
        `, { count: 'exact' })
        .order('waste_date', { ascending: false })
        .range(start, end);

    if (start_date) {
        query = query.gte('waste_date', start_date);
    }
    if (end_date) {
        query = query.lte('waste_date', end_date);
    }

    const { data, count, error } = await query;
    if (error) return res.status(400).json({ error: error.message });

    res.json({
        data,
        count,
        page,
        totalPages: count ? Math.ceil(count / limit) : 0
    });
});

// Get waste summary statistics
router.get('/summary', async (req, res) => {
    const { start_date, end_date } = req.query;

    // Total waste value
    let totalQuery = supabase
        .from('waste')
        .select('cost_value');

    if (start_date) totalQuery = totalQuery.gte('waste_date', start_date);
    if (end_date) totalQuery = totalQuery.lte('waste_date', end_date);

    const { data: wasteData, error: wasteError } = await totalQuery;
    if (wasteError) return res.status(400).json({ error: wasteError.message });

    const totalWasteValue = wasteData?.reduce((acc, curr) => acc + (curr.cost_value || 0), 0) || 0;

    // Waste by reason
    let reasonQuery = supabase
        .from('waste')
        .select('reason, cost_value');

    if (start_date) reasonQuery = reasonQuery.gte('waste_date', start_date);
    if (end_date) reasonQuery = reasonQuery.lte('waste_date', end_date);

    const { data: reasonData, error: reasonError } = await reasonQuery;
    if (reasonError) return res.status(400).json({ error: reasonError.message });

    const wasteByReason = reasonData?.reduce((acc: any, curr) => {
        acc[curr.reason] = (acc[curr.reason] || 0) + (curr.cost_value || 0);
        return acc;
    }, {});

    // Waste by product
    let productQuery = supabase
        .from('waste')
        .select(`
            product_id,
            cost_value,
            quantity,
            products (
                name
            )
        `);

    if (start_date) productQuery = productQuery.gte('waste_date', start_date);
    if (end_date) productQuery = productQuery.lte('waste_date', end_date);

    const { data: productData, error: productError } = await productQuery;
    if (productError) return res.status(400).json({ error: productError.message });

    const wasteByProduct = productData?.reduce((acc: any, curr: any) => {
        const productName = curr.products?.name || 'Unknown';
        if (!acc[productName]) {
            acc[productName] = { value: 0, quantity: 0 };
        }
        acc[productName].value += curr.cost_value || 0;
        acc[productName].quantity += curr.quantity || 0;
        return acc;
    }, {});

    res.json({
        total_waste_value: totalWasteValue,
        waste_by_reason: wasteByReason,
        waste_by_product: wasteByProduct
    });
});

// Update waste record
router.put('/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    const { product_id, quantity, reason, cost_value, waste_date, notes } = req.body;

    // Create clean update object
    const updates: any = {};
    if (product_id !== undefined) updates.product_id = parseInt(product_id as any);
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

    const { data, error } = await supabase
        .from('waste')
        .update(updates)
        .eq('id', id)
        .select();

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
});

// Delete waste record
router.delete('/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase.from('waste').delete().eq('id', id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ message: 'Waste record deleted' });
});

export default router;
