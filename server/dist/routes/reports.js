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
router.get('/daily', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { date } = req.query;
    // Note: The view 'daily_report' uses current_date. 
    // If we want to query a specific date, we might need to adjust the view or query tables directly.
    // For now, let's query the view and filter if possible, or just return the view's content which is for today.
    // Actually, the user requirement says GET /reports/daily?date=YYYY-MM-DD.
    // The view 'daily_report' is hardcoded to current_date.
    // Let's implement a dynamic query for the specific date instead of relying solely on the view for historical dates.
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
    if (salesError || purchasesError || expensesError) {
        return res.status(400).json({ error: 'Error fetching report data' });
    }
    const totalSales = (sales === null || sales === void 0 ? void 0 : sales.reduce((acc, curr) => acc + (curr.total || 0), 0)) || 0;
    const totalPurchases = (purchases === null || purchases === void 0 ? void 0 : purchases.reduce((acc, curr) => acc + (curr.total || 0), 0)) || 0;
    const totalExpenses = (expenses === null || expenses === void 0 ? void 0 : expenses.reduce((acc, curr) => acc + (curr.amount || 0), 0)) || 0;
    res.json({
        date: targetDate,
        total_sales: totalSales,
        total_purchases: totalPurchases,
        total_expenses: totalExpenses,
        net: totalSales - totalPurchases - totalExpenses
    });
}));
router.get('/monthly', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // Similar logic for monthly
    // GET /reports/monthly?month=MM&year=YYYY
    const { month, year } = req.query;
    if (!month || !year) {
        // Default to current month
        const now = new Date();
        // We can just use the monthly_report view if it groups by month properly.
        // The view groups by month. Let's try to query the view.
        const { data, error } = yield supabase_1.supabase.from('monthly_report').select('*');
        if (error)
            return res.status(400).json({ error: error.message });
        res.json(data);
        return;
    }
    // If specific filtering is needed we can add it, but the view returns all months.
    // Let's return the view data for now.
    const { data, error } = yield supabase_1.supabase.from('monthly_report').select('*');
    if (error)
        return res.status(400).json({ error: error.message });
    // Filter in memory or let client handle it, or improve query.
    // Let's filter here for simplicity if params are provided.
    // view returns 'month' as timestamp.
    const filtered = data === null || data === void 0 ? void 0 : data.filter(row => {
        const rowDate = new Date(row.month);
        return rowDate.getMonth() + 1 === parseInt(month) && rowDate.getFullYear() === parseInt(year);
    });
    res.json(filtered);
}));
router.get('/inventory', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { data, error } = yield supabase_1.supabase.from('inventory').select('*');
    if (error)
        return res.status(400).json({ error: error.message });
    res.json(data);
}));
exports.default = router;
