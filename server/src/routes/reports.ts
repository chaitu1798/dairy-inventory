import { Router } from 'express';
import { supabase } from '../supabase';

const router = Router();

// Dashboard endpoint - comprehensive dashboard data
router.get('/dashboard', async (req, res) => {
    try {
        // Get today's stats
        const targetDate = new Date().toISOString().split('T')[0];

        const { data: sales, error: salesError } = await supabase
            .from('sales')
            .select('total')
            .eq('sale_date', targetDate);

        const { data: purchases, error: purchasesError } = await supabase
            .from('purchases')
            .select('total')
            .eq('purchase_date', targetDate);

        const { data: expenses, error: expensesError } = await supabase
            .from('expenses')
            .select('amount')
            .eq('expense_date', targetDate);

        const { data: waste, error: wasteError } = await supabase
            .from('waste')
            .select('cost_value')
            .eq('waste_date', targetDate);

        if (salesError || purchasesError || expensesError || wasteError) {
            return res.status(400).json({ error: 'Error fetching dashboard data' });
        }

        const totalSales = sales?.reduce((acc, curr) => acc + (curr.total || 0), 0) || 0;
        const totalPurchases = purchases?.reduce((acc, curr) => acc + (curr.total || 0), 0) || 0;
        const totalExpenses = expenses?.reduce((acc, curr) => acc + (curr.amount || 0), 0) || 0;
        const totalWaste = waste?.reduce((acc, curr) => acc + (curr.cost_value || 0), 0) || 0;

        // Get total stock value
        const { data: inventory, error: invError } = await supabase
            .from('inventory')
            .select('stock_value');

        const totalStockValue = inventory?.reduce((acc, curr) => acc + (curr.stock_value || 0), 0) || 0;

        // Get low stock count
        const { data: lowStock, error: lowStockError } = await supabase
            .from('low_stock_items')
            .select('id');

        const lowStockCount = lowStock?.length || 0;

        // Get expiring items count
        const { data: expiringItems, error: expiringError } = await supabase
            .from('expiring_items')
            .select('id');

        const expiringCount = expiringItems?.length || 0;

        // Get top selling products (top 5)
        const { data: topSelling, error: topSellingError } = await supabase
            .from('top_selling_products')
            .select('*')
            .limit(5);

        res.json({
            today: {
                total_sales: totalSales,
                total_purchases: totalPurchases,
                total_expenses: totalExpenses,
                total_waste: totalWaste,
                net: totalSales - totalPurchases - totalExpenses - totalWaste
            },
            total_stock_value: totalStockValue,
            low_stock_count: lowStockCount,
            expiring_count: expiringCount,
            top_selling_products: topSelling || []
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Daily report
router.get('/daily', async (req, res) => {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select('total')
        .eq('sale_date', targetDate);

    const { data: purchases, error: purchasesError } = await supabase
        .from('purchases')
        .select('total')
        .eq('purchase_date', targetDate);

    const { data: expenses, error: expensesError } = await supabase
        .from('expenses')
        .select('amount')
        .eq('expense_date', targetDate);

    const { data: waste, error: wasteError } = await supabase
        .from('waste')
        .select('cost_value')
        .eq('waste_date', targetDate);

    if (salesError || purchasesError || expensesError || wasteError) {
        return res.status(400).json({ error: 'Error fetching report data' });
    }

    const totalSales = sales?.reduce((acc, curr) => acc + (curr.total || 0), 0) || 0;
    const totalPurchases = purchases?.reduce((acc, curr) => acc + (curr.total || 0), 0) || 0;
    const totalExpenses = expenses?.reduce((acc, curr) => acc + (curr.amount || 0), 0) || 0;
    const totalWaste = waste?.reduce((acc, curr) => acc + (curr.cost_value || 0), 0) || 0;

    res.json({
        date: targetDate,
        total_sales: totalSales,
        total_purchases: totalPurchases,
        total_expenses: totalExpenses,
        total_waste: totalWaste,
        profit: totalSales - totalPurchases - totalExpenses - totalWaste,
        net: totalSales - totalPurchases - totalExpenses - totalWaste
    });
});

// Monthly report
router.get('/monthly', async (req, res) => {
    const { month, year } = req.query;

    if (!month || !year) {
        // Return all months
        const { data, error } = await supabase.from('monthly_report').select('*');
        if (error) return res.status(400).json({ error: error.message });
        res.json(data);
        return;
    }

    // Filter for specific month
    const { data, error } = await supabase.from('monthly_report').select('*');
    if (error) return res.status(400).json({ error: error.message });

    const filtered = data?.filter(row => {
        const rowDate = new Date(row.month);
        return rowDate.getMonth() + 1 === parseInt(month as string) && rowDate.getFullYear() === parseInt(year as string);
    });

    res.json(filtered);
});

// Inventory report
router.get('/inventory', async (req, res) => {
    const { data, error } = await supabase.from('inventory').select('*');
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
});

// Expiring items
router.get('/expiring', async (req, res) => {
    const { days } = req.query;
    const daysAhead = days ? parseInt(days as string) : 7;

    const { data, error } = await supabase
        .from('expiring_items')
        .select('*')
        .lte('days_until_expiry', daysAhead);

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
});

// Low stock items
router.get('/low-stock', async (req, res) => {
    const { data, error } = await supabase
        .from('low_stock_items')
        .select('*');

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
});

// Top selling products
router.get('/top-selling', async (req, res) => {
    const { limit } = req.query;
    const limitNum = limit ? parseInt(limit as string) : 10;

    const { data, error } = await supabase
        .from('top_selling_products')
        .select('*')
        .limit(limitNum);

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
});

// Waste report
router.get('/waste', async (req, res) => {
    const { start_date, end_date } = req.query;

    let query = supabase
        .from('waste')
        .select(`
            *,
            products (
                name,
                category
            )
        `)
        .order('waste_date', { ascending: false });

    if (start_date) query = query.gte('waste_date', start_date);
    if (end_date) query = query.lte('waste_date', end_date);

    const { data, error } = await query;
    if (error) return res.status(400).json({ error: error.message });

    // Calculate totals
    const totalWaste = data?.reduce((acc, curr) => acc + (curr.cost_value || 0), 0) || 0;
    const totalQuantity = data?.reduce((acc, curr) => acc + (curr.quantity || 0), 0) || 0;

    res.json({
        records: data,
        summary: {
            total_waste_value: totalWaste,
            total_quantity: totalQuantity,
            record_count: data?.length || 0
        }
    });
});

export default router;
