import { Router } from 'express';
import { supabase } from '../supabase';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Purchases
router.get('/purchases', async (req, res) => {
    const { startDate, endDate } = req.query;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const start = (page - 1) * limit;
    const end = start + limit - 1;

    let query = supabase
        .from('purchases')
        .select(`
            *,
            products (
                name,
                unit
            )
        `, { count: 'exact' })
        .order('purchase_date', { ascending: false })
        .range(start, end);

    if (startDate) query = query.gte('purchase_date', startDate);
    if (endDate) query = query.lte('purchase_date', endDate);

    const { data, count, error } = await query;

    if (error) return res.status(400).json({ error: error.message });

    res.json({
        data,
        count,
        page,
        totalPages: count ? Math.ceil(count / limit) : 0
    });
});

router.post('/purchases', requireAuth, async (req, res) => {
    const { product_id, quantity, purchase_date, expiry_date, image_url } = req.body;

    // Sanitize dates
    const finalExpiryDate = expiry_date === '' ? null : expiry_date;

    // Fetch product cost price
    const { data: product, error: productError } = await supabase
        .from('products')
        .select('cost_price')
        .eq('id', product_id)
        .single();

    if (productError || !product) {
        return res.status(400).json({ error: 'Product not found' });
    }

    const price = product.cost_price;

    const { data, error } = await supabase
        .from('purchases')
        .insert([{ product_id, quantity, price, purchase_date, expiry_date: finalExpiryDate }])
        .select();

    if (error) return res.status(400).json({ error: error.message });

    // Log to stock_logs
    const { error: logError } = await supabase
        .from('stock_logs')
        .insert([{
            product_id,
            quantity: quantity,
            action_type: 'IN', // Purchase is adding stock
            image_url: image_url || null,
            updated_by: 'system' // or could be req.user.id if auth was fully implemented
        }]);

    if (logError) {
        console.error('Error logging stock update:', logError);
        // We ensure purchase succeeded, so we don't fail request here, just log error
    }

    res.json(data);
});

router.put('/purchases/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    const { product_id, quantity, purchase_date, expiry_date } = req.body;

    // Create clean update object
    const updates: any = {};
    if (product_id !== undefined) updates.product_id = parseInt(product_id as any);
    if (quantity !== undefined) updates.quantity = parseFloat(quantity as any);
    if (purchase_date !== undefined) updates.purchase_date = purchase_date;
    if (expiry_date !== undefined) updates.expiry_date = expiry_date === '' ? null : expiry_date;

    const { data, error } = await supabase
        .from('purchases')
        .update(updates)
        .eq('id', id)
        .select();

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
});

router.delete('/purchases/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase.from('purchases').delete().eq('id', id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ message: 'Purchase deleted' });
});

// Sales
router.get('/sales', async (req, res) => {
    const { startDate, endDate } = req.query;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const start = (page - 1) * limit;
    const end = start + limit - 1;

    let query = supabase
        .from('sales')
        .select(`
            *,
            products (
                name,
                unit
            ),
            customers (
                name
            )
        `, { count: 'exact' })
        .order('sale_date', { ascending: false })
        .range(start, end);

    if (startDate) query = query.gte('sale_date', startDate);
    if (endDate) query = query.lte('sale_date', endDate);

    const { data, count, error } = await query;

    if (error) return res.status(400).json({ error: error.message });

    res.json({
        data,
        count,
        page,
        totalPages: count ? Math.ceil(count / limit) : 0
    });
});

router.post('/sales', requireAuth, async (req, res) => {
    const { product_id, quantity, sale_date, customer_id, status, due_date } = req.body;

    // Sanitize dates
    const finalDueDate = due_date === '' ? null : due_date;

    // Fetch product price
    const { data: product, error: productError } = await supabase
        .from('products')
        .select('price')
        .eq('id', product_id)
        .single();

    if (productError || !product) {
        return res.status(400).json({ error: 'Product not found' });
    }

    const price = product.price;

    // Generate Invoice Number (Simple timestamp based for now, or random)
    const invoice_number = `INV-${Date.now()}`;

    const { data, error } = await supabase
        .from('sales')
        .insert([{
            product_id,
            quantity,
            price,
            sale_date,
            customer_id: customer_id || null,
            status: status || 'paid',
            due_date: finalDueDate || null,
            invoice_number
        }])
        .select();

    if (error) return res.status(400).json({ error: error.message });

    // Log to stock_logs
    const { error: logError } = await supabase
        .from('stock_logs')
        .insert([{
            product_id,
            quantity: quantity,
            action_type: 'OUT', // Sale is removing stock
            updated_by: 'system'
        }]);

    if (logError) {
        console.error('Error logging sales stock update:', logError);
    }

    res.json(data);
});

router.put('/sales/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    const { product_id, customer_id, quantity, price, sale_date, status, due_date } = req.body;

    // Create clean update object
    const updates: any = {};
    if (product_id !== undefined) updates.product_id = parseInt(product_id as any);
    if (customer_id !== undefined) updates.customer_id = customer_id ? parseInt(customer_id as any) : null;
    if (quantity !== undefined) updates.quantity = parseFloat(quantity as any);
    if (price !== undefined) updates.price = parseFloat(price as any);
    if (sale_date !== undefined) updates.sale_date = sale_date;
    if (status !== undefined) updates.status = status;
    if (due_date !== undefined) updates.due_date = due_date === '' ? null : due_date;

    const { data, error } = await supabase
        .from('sales')
        .update(updates)
        .eq('id', id)
        .select();

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
});

router.delete('/sales/:id', requireAuth, async (req, res) => {
    const { id } = req.params;

    // Delete related payments first (manual cascade)
    const { error: paymentError } = await supabase.from('payments').delete().eq('sale_id', id);
    if (paymentError) console.error('Error deleting payments:', paymentError); // Log but continue

    const { error } = await supabase.from('sales').delete().eq('id', id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ message: 'Sale deleted' });
});

// Expenses
router.get('/expenses', async (req, res) => {
    const { startDate, endDate } = req.query;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const start = (page - 1) * limit;
    const end = start + limit - 1;

    let query = supabase
        .from('expenses')
        .select('*', { count: 'exact' })
        .order('expense_date', { ascending: false })
        .range(start, end);

    if (startDate) query = query.gte('expense_date', startDate);
    if (endDate) query = query.lte('expense_date', endDate);

    const { data, count, error } = await query;

    if (error) return res.status(400).json({ error: error.message });

    res.json({
        data,
        count,
        page,
        totalPages: count ? Math.ceil(count / limit) : 0
    });
});

router.post('/expenses', requireAuth, async (req, res) => {
    const { category, amount, notes, expense_date } = req.body;
    const { data, error } = await supabase
        .from('expenses')
        .insert([{ category, amount, notes, expense_date }])
        .select();

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
});

router.put('/expenses/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    const { category, amount, notes, expense_date } = req.body;

    // Create clean update object
    const updates: any = {};
    if (category !== undefined) updates.category = category;
    if (amount !== undefined) updates.amount = amount;
    if (notes !== undefined) updates.notes = notes;
    if (expense_date !== undefined) updates.expense_date = expense_date;

    const { data, error } = await supabase
        .from('expenses')
        .update(updates)
        .eq('id', id)
        .select();

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
});

router.delete('/expenses/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ message: 'Expense deleted' });
});

export default router;
