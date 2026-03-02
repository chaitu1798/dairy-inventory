import { Router } from 'express';
import { collections, db } from '../firebase';
import { requireAuth } from '../middleware/auth';
import { validateRequest } from '../middleware/validateRequest';
import { PaymentSchema } from '../schemas';

const router = Router();

/**
 * ACCOUNTS RECEIVABLE (AR)
 */

// Get AR stats
router.get('/ar/stats', requireAuth, async (req, res) => {
    try {
        const snapshot = await collections.sales
            .where('status', 'in', ['pending', 'overdue'])
            .get();

        const sales = snapshot.docs.map(doc => doc.data());

        let totalReceivable = 0;
        let overdueAmount = 0;
        let pendingAmount = 0;

        sales.forEach(sale => {
            const due = (sale.total || 0) - (sale.amount_paid || 0);
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
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * PAYMENTS
 */

// Get payments for a sale
router.get('/payments/:sale_id', requireAuth, async (req, res) => {
    try {
        const { sale_id } = req.params;
        const snapshot = await collections.payments
            .where('sale_id', '==', sale_id)
            .orderBy('payment_date', 'desc')
            .get();

        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(data);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// Record a payment
router.post('/payments', requireAuth, validateRequest(PaymentSchema), async (req, res) => {
    try {
        const { sale_id, amount, payment_date, payment_method, notes } = req.body;

        const result = await db.runTransaction(async (transaction) => {
            const saleRef = collections.sales.doc(sale_id);
            const saleDoc = await transaction.get(saleRef);

            if (!saleDoc.exists) {
                throw new Error('Sale not found');
            }

            const saleData = saleDoc.data()!;
            const newAmountPaid = (saleData.amount_paid || 0) + parseFloat(amount as any);
            const newStatus = newAmountPaid >= saleData.total ? 'paid' : 'pending';

            // 1. Record payment
            const paymentRef = collections.payments.doc();
            const paymentData = {
                sale_id,
                amount: parseFloat(amount as any),
                payment_date,
                payment_method,
                notes,
                created_at: new Date().toISOString()
            };
            transaction.set(paymentRef, paymentData);

            // 2. Update sale
            transaction.update(saleRef, {
                amount_paid: newAmountPaid,
                status: newStatus
            });

            return { id: paymentRef.id, ...paymentData };
        });

        res.json(result);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

export default router;
