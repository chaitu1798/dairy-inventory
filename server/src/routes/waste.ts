import { Router } from 'express';
import { supabase } from '../supabase';

const router = Router();

// Create waste record
router.post('/', async (req, res) => {
    const { product_id, quantity, reason, cost_value, waste_date, notes } = req.body;

    // Validate reason
    if (!['expired', 'damaged', 'other'].includes(reason)) {
        return res.status(400).json({ error: 'Invalid reason. Must be expired, damaged, or other' });
    }

    const { data, error } = await supabase
        .from('waste')
        .insert([{ product_id, quantity, reason, cost_value, waste_date, notes }])
        .select();

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
});

// Get waste records with optional date filtering
router.get('/', async (req, res) => {
    const { start_date, end_date } = req.query;

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
        `)
        .order('waste_date', { ascending: false });

    if (start_date) {
        query = query.gte('waste_date', start_date);
    }
    if (end_date) {
        query = query.lte('waste_date', end_date);
    }

    const { data, error } = await query;
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
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

export default router;
