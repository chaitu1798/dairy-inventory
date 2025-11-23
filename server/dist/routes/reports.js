"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const supabase_1 = require("../supabase");
const router = (0, express_1.Router)();
// Dashboard endpoint - comprehensive dashboard data
router.get('/dashboard', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Get today's stats
        const targetDate = new Date().toISOString().split('T')[0];
        const { data: sales, error: salesError } = yield supabase_1.supabase
            .from('sales')
            .select('total')
            .eq('sale_date', targetDate);
        const { data: purchases, error: purchasesError } = yield supabase_1.supabase
            .from('purchases')
            .select('total')
            .eq('purchase_date', targetDate);
        const { data: expenses, error: expensesError } = yield supabase_1.supabase
            .from('expenses')
            .select('amount')
            .eq('expense_date', targetDate);
        const { data: waste, error: wasteError } = yield supabase_1.supabase
            .from('waste')
            .select('cost_value')
            .eq('waste_date', targetDate);
        if (salesError || purchasesError || expensesError || wasteError) {
            return res.status(400).json({ error: 'Error fetching dashboard data' });
        }
        const totalSales = (sales === null || sales === void 0 ? void 0 : sales.reduce((acc, curr) => acc + (curr.total || 0), 0)) || 0;
        const totalPurchases = (purchases === null || purchases === void 0 ? void 0 : purchases.reduce((acc, curr) => acc + (curr.total || 0), 0)) || 0;
        const totalExpenses = (expenses === null || expenses === void 0 ? void 0 : expenses.reduce((acc, curr) => acc + (curr.amount || 0), 0)) || 0;
        const totalWaste = (waste === null || waste === void 0 ? void 0 : waste.reduce((acc, curr) => acc + (curr.cost_value || 0), 0)) || 0;
        // Get total stock value
        const { data: inventory, error: invError } = yield supabase_1.supabase
            .from('inventory')
            .select('stock_value');
        const totalStockValue = (inventory === null || inventory === void 0 ? void 0 : inventory.reduce((acc, curr) => acc + (curr.stock_value || 0), 0)) || 0;
        // Get low stock count
        const { data: lowStock, error: lowStockError } = yield supabase_1.supabase
            .from('low_stock_items')
            .select('id');
        const lowStockCount = (lowStock === null || lowStock === void 0 ? void 0 : lowStock.length) || 0;
        // Get expiring items count
        const { data: expiringItems, error: expiringError } = yield supabase_1.supabase
            .from('expiring_items')
            .select('id');
        const expiringCount = (expiringItems === null || expiringItems === void 0 ? void 0 : expiringItems.length) || 0;
        // Get top selling products (top 5)
        const { data: topSelling, error: topSellingError } = yield supabase_1.supabase
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
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}));
// Daily report
router.get('/daily', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];
    const { data: sales, error: salesError } = yield supabase_1.supabase
        .from('sales')
        .select('total')
        .eq('sale_date', targetDate);
    const { data: purchases, error: purchasesError } = yield supabase_1.supabase
        .from('purchases')
        .select('total')
        .eq('purchase_date', targetDate);
    const { data: expenses, error: expensesError } = yield supabase_1.supabase
        .from('expenses')
        .select('amount')
        .eq('expense_date', targetDate);
    const { data: waste, error: wasteError } = yield supabase_1.supabase
        .from('waste')
        .select('cost_value')
        .eq('waste_date', targetDate);
    if (salesError || purchasesError || expensesError || wasteError) {
        return res.status(400).json({ error: 'Error fetching report data' });
    }
    const totalSales = (sales === null || sales === void 0 ? void 0 : sales.reduce((acc, curr) => acc + (curr.total || 0), 0)) || 0;
    const totalPurchases = (purchases === null || purchases === void 0 ? void 0 : purchases.reduce((acc, curr) => acc + (curr.total || 0), 0)) || 0;
    const totalExpenses = (expenses === null || expenses === void 0 ? void 0 : expenses.reduce((acc, curr) => acc + (curr.amount || 0), 0)) || 0;
    const totalWaste = (waste === null || waste === void 0 ? void 0 : waste.reduce((acc, curr) => acc + (curr.cost_value || 0), 0)) || 0;
    res.json({
        date: targetDate,
        total_sales: totalSales,
        total_purchases: totalPurchases,
        total_expenses: totalExpenses,
        total_waste: totalWaste,
        profit: totalSales - totalPurchases - totalExpenses - totalWaste,
        net: totalSales - totalPurchases - totalExpenses - totalWaste
    });
}));
// Monthly report
router.get('/monthly', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { month, year } = req.query;
    if (!month || !year) {
        // Return all months
        const { data, error } = yield supabase_1.supabase.from('monthly_report').select('*');
        if (error)
            return res.status(400).json({ error: error.message });
        res.json(data);
        return;
    }
    // Filter for specific month
    const { data, error } = yield supabase_1.supabase.from('monthly_report').select('*');
    if (error)
        return res.status(400).json({ error: error.message });
    const filtered = data === null || data === void 0 ? void 0 : data.filter(row => {
        const rowDate = new Date(row.month);
        return rowDate.getMonth() + 1 === parseInt(month) && rowDate.getFullYear() === parseInt(year);
    });
    res.json(filtered);
}));
// Inventory report
router.get('/inventory', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { data, error } = yield supabase_1.supabase.from('inventory').select('*');
    if (error)
        return res.status(400).json({ error: error.message });
    res.json(data);
}));
// Expiring items
router.get('/expiring', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { days } = req.query;
    const daysAhead = days ? parseInt(days) : 7;
    const { data, error } = yield supabase_1.supabase
        .from('expiring_items')
        .select('*')
        .lte('days_until_expiry', daysAhead);
    if (error)
        return res.status(400).json({ error: error.message });
    res.json(data);
}));
// Low stock items
router.get('/low-stock', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { data, error } = yield supabase_1.supabase
        .from('low_stock_items')
        .select('*');
    if (error)
        return res.status(400).json({ error: error.message });
    res.json(data);
}));
// Top selling products
router.get('/top-selling', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { limit } = req.query;
    const limitNum = limit ? parseInt(limit) : 10;
    const { data, error } = yield supabase_1.supabase
        .from('top_selling_products')
        .select('*')
        .limit(limitNum);
    if (error)
        return res.status(400).json({ error: error.message });
    res.json(data);
}));
// Waste report
router.get('/waste', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { start_date, end_date } = req.query;
    let query = supabase_1.supabase
        .from('waste')
        .select(`
            *,
            products (
                name,
                category
            )
        `)
        .order('waste_date', { ascending: false });
    if (start_date)
        query = query.gte('waste_date', start_date);
    if (end_date)
        query = query.lte('waste_date', end_date);
    const { data, error } = yield query;
    if (error)
        return res.status(400).json({ error: error.message });
    // Calculate totals
    const totalWaste = (data === null || data === void 0 ? void 0 : data.reduce((acc, curr) => acc + (curr.cost_value || 0), 0)) || 0;
    const totalQuantity = (data === null || data === void 0 ? void 0 : data.reduce((acc, curr) => acc + (curr.quantity || 0), 0)) || 0;
    res.json({
        records: data,
        summary: {
            total_waste_value: totalWaste,
            total_quantity: totalQuantity,
            record_count: (data === null || data === void 0 ? void 0 : data.length) || 0
        }
    });
}));
exports.default = router;
