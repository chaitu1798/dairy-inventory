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

// Detailed Daily Report for CSV
router.get('/daily/details', async (req, res) => {
    const { date } = req.query;
    const targetDate = date ? (date as string) : new Date().toISOString().split('T')[0];

    try {
        // 1. Fetch all products
        const { data: products, error: prodError } = await supabase
            .from('products')
            .select('id, name, cost_price, selling_price');

        if (prodError) throw prodError;

        // 2. Fetch past transactions (before targetDate) for Opening Stock
        // We need to sum quantities by product_id
        const { data: pastPurchases } = await supabase
            .from('purchases')
            .select('product_id, quantity')
            .lt('purchase_date', targetDate);

        const { data: pastSales } = await supabase
            .from('sales')
            .select('product_id, quantity')
            .lt('sale_date', targetDate);

        const { data: pastWaste } = await supabase
            .from('waste')
            .select('product_id, quantity')
            .lt('waste_date', targetDate);

        // 3. Fetch today's transactions (on targetDate)
        const { data: todayPurchases } = await supabase
            .from('purchases')
            .select('product_id, quantity, total')
            .eq('purchase_date', targetDate);

        const { data: todaySales } = await supabase
            .from('sales')
            .select('product_id, quantity, total')
            .eq('sale_date', targetDate);

        const { data: todayWaste } = await supabase
            .from('waste')
            .select('product_id, quantity')
            .eq('waste_date', targetDate);

        // 4. Fetch today's expenses (global)
        const { data: expenses } = await supabase
            .from('expenses')
            .select('amount')
            .eq('expense_date', targetDate);

        const totalExpenses = expenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0;

        // Helper to sum by product
        const sumByProduct = (items: any[], prodId: number, field: string = 'quantity') =>
            items?.filter(i => i.product_id === prodId).reduce((acc, curr) => acc + (curr[field] || 0), 0) || 0;

        // 5. Build Report Data
        const reportData = products?.map(product => {
            // Opening Stock Calculation
            const pastPurchasedQty = sumByProduct(pastPurchases || [], product.id);
            const pastSoldQty = sumByProduct(pastSales || [], product.id);
            const pastWastedQty = sumByProduct(pastWaste || [], product.id);
            const openingStock = pastPurchasedQty - pastSoldQty - pastWastedQty;

            // Today's Activity
            const purchasedQty = sumByProduct(todayPurchases || [], product.id);
            const soldQty = sumByProduct(todaySales || [], product.id);
            const wastedQty = sumByProduct(todayWaste || [], product.id); // Needed for closing stock

            // Closing Stock
            const closingStock = openingStock + purchasedQty - soldQty - wastedQty;

            // Values
            const purchaseValue = sumByProduct(todayPurchases || [], product.id, 'total');
            const salesValue = sumByProduct(todaySales || [], product.id, 'total');

            // Gross Profit: Sales Value - (Sold Qty * Cost Price)
            // Note: Using current cost price. Ideally should use FIFO/LIFO but that's complex.
            const costOfGoodsSold = soldQty * product.cost_price;
            const grossProfit = salesValue - costOfGoodsSold;

            return {
                date: targetDate,
                product_name: product.name,
                opening_stock: openingStock,
                purchases_qty: purchasedQty,
                sales_qty: soldQty,
                closing_stock: closingStock,
                total_purchase_value: purchaseValue,
                total_sales_value: salesValue,
                gross_profit: grossProfit,
                notes: ''
            };
        });

        res.json({
            records: reportData,
            totals: {
                total_purchase_value: reportData?.reduce((sum, r) => sum + r.total_purchase_value, 0) || 0,
                total_sales_value: reportData?.reduce((sum, r) => sum + r.total_sales_value, 0) || 0,
                total_gross_profit: reportData?.reduce((sum, r) => sum + r.gross_profit, 0) || 0,
                total_expenses: totalExpenses,
                net_profit: (reportData?.reduce((sum, r) => sum + r.gross_profit, 0) || 0) - totalExpenses
            }
        });

    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
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
