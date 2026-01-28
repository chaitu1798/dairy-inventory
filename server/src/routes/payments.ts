import { Router } from 'express';
import { supabase } from '../supabase';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Get payments for a sale
router.get('/:sale_id', async (req, res) => {
    const { sale_id } = req.params;
    const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('sale_id', sale_id)
        .order('payment_date', { ascending: false });

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
});

// Record a payment
router.post('/', requireAuth, async (req, res) => {
    const { sale_id, amount, payment_date, payment_method, notes } = req.body;

    // 1. Record payment
    const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert([{ sale_id, amount, payment_date, payment_method, notes }])
        .select()
        .single();

    if (paymentError) return res.status(400).json({ error: paymentError.message });

    // 2. Update sale (amount_paid and status)
    // First fetch current sale to calculate new totals
    const { data: sale, error: saleError } = await supabase
        .from('sales')
        .select('total, amount_paid')
        .eq('id', sale_id)
        .single();

    if (saleError) return res.status(400).json({ error: 'Sale not found' });

    const newAmountPaid = (sale.amount_paid || 0) + parseFloat(amount);
    const newStatus = newAmountPaid >= sale.total ? 'paid' : 'pending'; // Or keep 'overdue' if date passed? Simplified logic for now.

    const { error: updateError } = await supabase
        .from('sales')
        .update({ amount_paid: newAmountPaid, status: newStatus })
        .eq('id', sale_id);

    if (updateError) return res.status(400).json({ error: 'Failed to update sale status' });

    res.json(payment);
});

export default router;
