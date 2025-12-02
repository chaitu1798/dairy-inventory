import { Router } from 'express';
import { supabase } from '../supabase';

const router = Router();

// Get AR stats
router.get('/stats', async (req, res) => {
    // Total Receivable (Pending + Overdue)
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

export default router;
