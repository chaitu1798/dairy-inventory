import { Router } from 'express';
import { supabase } from '../supabase';
import { requireAuth } from '../middleware/auth';

const router = Router();

/**
 * ACCOUNTS RECEIVABLE (AR)
 */

// Get AR stats
router.get('/ar/stats', async (req, res) => {
    const { data: sales, error } = await supabase
        .from('sales')
        .select('total, amount_paid, status')
        .in('status', ['pending', 'overdue']);

    if (error) return res.status(400).json({ error: error.message });

    let totalReceivable = 0;
    let overdueAmount = 0;
    let pendingAmount = 0;

    sales.forEach(sale => {
        const due = sale.total - (sale.amount_paid || 0);
        totalReceivable += due;
        if (sale.status === 'overdue') {
            overdueAmount += due;
        } else {
            pendingAmount += due;
        }
    });

    res.json({
        totalReceivable,
        overdueAmount,
        pendingAmount
    });
});

/**
 * PAYMENTS
 */

// Get payments for a sale
router.get('/payments/:sale_id', async (req, res) => {
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
router.post('/payments', requireAuth, async (req, res) => {
    const { sale_id, amount, payment_date, payment_method, notes } = req.body;

    // 1. Record payment
    const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert([{
            sale_id: parseInt(sale_id as any),
            amount: parseFloat(amount as any),
            payment_date,
            payment_method,
            notes
        }])
        .select()
        .single();

    if (paymentError) return res.status(400).json({ error: paymentError.message });

    // 2. Update sale (amount_paid and status)
    const { data: sale, error: saleError } = await supabase
        .from('sales')
        .select('total, amount_paid')
        .eq('id', sale_id)
        .single();

    if (saleError) return res.status(400).json({ error: 'Sale not found' });

    const newAmountPaid = (sale.amount_paid || 0) + parseFloat(amount as any);
    const newStatus = newAmountPaid >= sale.total ? 'paid' : 'pending';

    const { error: updateError } = await supabase
        .from('sales')
        .update({ amount_paid: newAmountPaid, status: newStatus })
        .eq('id', sale_id);

    if (updateError) return res.status(400).json({ error: 'Failed to update sale status' });

    res.json(payment);
});

export default router;
