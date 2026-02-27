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
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const toNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
};
const ymd = (d) => d.toISOString().split('T')[0];
const getMonthBounds = (month, year) => {
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));
    return { start: ymd(start), end: ymd(end) };
};
const daysBetween = (fromDate, toDate) => {
    const ms = toDate.getTime() - fromDate.getTime();
    return Math.ceil(ms / (1000 * 60 * 60 * 24));
};
const buildInventorySnapshot = () => __awaiter(void 0, void 0, void 0, function* () {
    const [{ data: products, error: productError }, { data: purchases, error: purchaseError }, { data: sales, error: salesError }, { data: waste, error: wasteError }] = yield Promise.all([
        supabase_1.supabase.from('products').select('id, name, category, unit, cost_price, min_stock, expiry_date, track_expiry'),
        supabase_1.supabase.from('purchases').select('product_id, quantity'),
        supabase_1.supabase.from('sales').select('product_id, quantity'),
        supabase_1.supabase.from('waste').select('product_id, quantity')
    ]);
    if (productError || purchaseError || salesError || wasteError) {
        throw new Error((productError === null || productError === void 0 ? void 0 : productError.message) ||
            (purchaseError === null || purchaseError === void 0 ? void 0 : purchaseError.message) ||
            (salesError === null || salesError === void 0 ? void 0 : salesError.message) ||
            (wasteError === null || wasteError === void 0 ? void 0 : wasteError.message) ||
            'Failed to build inventory snapshot');
    }
    const purchasedByProduct = new Map();
    const soldByProduct = new Map();
    const wasteByProduct = new Map();
    purchases === null || purchases === void 0 ? void 0 : purchases.forEach((row) => {
        purchasedByProduct.set(row.product_id, (purchasedByProduct.get(row.product_id) || 0) + toNumber(row.quantity));
    });
    sales === null || sales === void 0 ? void 0 : sales.forEach((row) => {
        soldByProduct.set(row.product_id, (soldByProduct.get(row.product_id) || 0) + toNumber(row.quantity));
    });
    waste === null || waste === void 0 ? void 0 : waste.forEach((row) => {
        wasteByProduct.set(row.product_id, (wasteByProduct.get(row.product_id) || 0) + toNumber(row.quantity));
    });
    const today = new Date();
    return (products || []).map((product) => {
        const purchased = purchasedByProduct.get(product.id) || 0;
        const sold = soldByProduct.get(product.id) || 0;
        const wasted = wasteByProduct.get(product.id) || 0;
        const currentStock = purchased - sold - wasted;
        const costPrice = toNumber(product.cost_price);
        const minStock = toNumber(product.min_stock);
        const stockValue = currentStock * costPrice;
        let daysUntilExpiry = null;
        if (product.expiry_date) {
            daysUntilExpiry = daysBetween(today, new Date(product.expiry_date));
        }
        return {
            id: product.id,
            name: product.name,
            category: product.category,
            unit: product.unit || 'unit',
            current_stock: currentStock,
            min_stock: minStock,
            stock_value: stockValue,
            is_low_stock: currentStock <= minStock,
            expiry_date: product.expiry_date,
            days_until_expiry: daysUntilExpiry,
            track_expiry: Boolean(product.track_expiry)
        };
    });
});
const computeMonthlyRow = (start, end) => __awaiter(void 0, void 0, void 0, function* () {
    const [{ data: sales, error: salesError }, { data: purchases, error: purchaseError }, { data: expenses, error: expenseError }, { data: waste, error: wasteError }] = yield Promise.all([
        supabase_1.supabase.from('sales').select('total').gte('sale_date', start).lt('sale_date', end),
        supabase_1.supabase.from('purchases').select('total').gte('purchase_date', start).lt('purchase_date', end),
        supabase_1.supabase.from('expenses').select('amount').gte('expense_date', start).lt('expense_date', end),
        supabase_1.supabase.from('waste').select('cost_value').gte('waste_date', start).lt('waste_date', end)
    ]);
    if (salesError || purchaseError || expenseError || wasteError) {
        throw new Error((salesError === null || salesError === void 0 ? void 0 : salesError.message) ||
            (purchaseError === null || purchaseError === void 0 ? void 0 : purchaseError.message) ||
            (expenseError === null || expenseError === void 0 ? void 0 : expenseError.message) ||
            (wasteError === null || wasteError === void 0 ? void 0 : wasteError.message) ||
            'Failed to compute monthly report');
    }
    const totalSales = (sales || []).reduce((sum, row) => sum + toNumber(row.total), 0);
    const totalPurchases = (purchases || []).reduce((sum, row) => sum + toNumber(row.total), 0);
    const totalExpenses = (expenses || []).reduce((sum, row) => sum + toNumber(row.amount), 0);
    const totalWaste = (waste || []).reduce((sum, row) => sum + toNumber(row.cost_value), 0);
    return {
        month: start,
        total_sales: totalSales,
        total_purchases: totalPurchases,
        total_expenses: totalExpenses,
        total_waste: totalWaste,
        profit: totalSales - totalPurchases - totalExpenses - totalWaste
    };
});
// Dashboard endpoint - comprehensive dashboard data
router.get('/dashboard', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const targetDate = new Date().toISOString().split('T')[0];
        // Run all queries in parallel for performance
        const [{ data: sales, error: salesError }, { data: purchases, error: purchasesError }, { data: expenses, error: expensesError }, { data: waste, error: wasteError }, { data: allSales, error: allSalesError }, { data: products, error: productsError }, inventorySnapshot] = yield Promise.all([
            supabase_1.supabase.from('sales').select('total').eq('sale_date', targetDate),
            supabase_1.supabase.from('purchases').select('total').eq('purchase_date', targetDate),
            supabase_1.supabase.from('expenses').select('amount').eq('expense_date', targetDate),
            supabase_1.supabase.from('waste').select('cost_value').eq('waste_date', targetDate),
            supabase_1.supabase.from('sales').select('product_id, quantity'),
            supabase_1.supabase.from('products').select('id, name'),
            buildInventorySnapshot()
        ]);
        if (salesError || purchasesError || expensesError || wasteError || allSalesError || productsError) {
            return res.status(400).json({ error: 'Error fetching dashboard data' });
        }
        const totalSales = (sales === null || sales === void 0 ? void 0 : sales.reduce((acc, curr) => acc + (curr.total || 0), 0)) || 0;
        const totalPurchases = (purchases === null || purchases === void 0 ? void 0 : purchases.reduce((acc, curr) => acc + (curr.total || 0), 0)) || 0;
        const totalExpenses = (expenses === null || expenses === void 0 ? void 0 : expenses.reduce((acc, curr) => acc + (curr.amount || 0), 0)) || 0;
        const totalWaste = (waste === null || waste === void 0 ? void 0 : waste.reduce((acc, curr) => acc + (curr.cost_value || 0), 0)) || 0;
        const totalStockValue = inventorySnapshot.reduce((acc, curr) => acc + toNumber(curr.stock_value), 0);
        const lowStockCount = inventorySnapshot.filter((item) => item.is_low_stock).length;
        const expiringCount = inventorySnapshot.filter((item) => item.track_expiry && item.days_until_expiry !== null && item.days_until_expiry >= 0 && item.days_until_expiry <= 7).length;
        const salesQtyByProduct = new Map();
        (allSales || []).forEach((row) => {
            const productId = row.product_id;
            const quantity = toNumber(row.quantity);
            salesQtyByProduct.set(productId, (salesQtyByProduct.get(productId) || 0) + quantity);
        });
        const productNameById = new Map();
        (products || []).forEach((p) => {
            productNameById.set(p.id, p.name);
        });
        const topSelling = [...salesQtyByProduct.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([product_id, total_quantity]) => ({
            product_id,
            product_name: productNameById.get(product_id) || `Product ${product_id}`,
            total_quantity
        }));
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
            top_selling_products: topSelling
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unexpected dashboard error';
        res.status(500).json({ error: message });
    }
}));
// Daily report
router.get('/daily', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
// Detailed Daily Report for CSV
router.get('/daily/details', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { date } = req.query;
    const targetDate = date ? date : new Date().toISOString().split('T')[0];
    try {
        // 1. Fetch all products
        const { data: products, error: prodError } = yield supabase_1.supabase
            .from('products')
            .select('id, name, cost_price, price');
        if (prodError)
            throw prodError;
        // 2. Fetch past transactions (before targetDate) for Opening Stock
        // We need to sum quantities by product_id
        const { data: pastPurchases } = yield supabase_1.supabase
            .from('purchases')
            .select('product_id, quantity')
            .lt('purchase_date', targetDate);
        const { data: pastSales } = yield supabase_1.supabase
            .from('sales')
            .select('product_id, quantity')
            .lt('sale_date', targetDate);
        const { data: pastWaste } = yield supabase_1.supabase
            .from('waste')
            .select('product_id, quantity')
            .lt('waste_date', targetDate);
        // 3. Fetch today's transactions (on targetDate)
        const { data: todayPurchases } = yield supabase_1.supabase
            .from('purchases')
            .select('product_id, quantity, total')
            .eq('purchase_date', targetDate);
        const { data: todaySales } = yield supabase_1.supabase
            .from('sales')
            .select('product_id, quantity, total')
            .eq('sale_date', targetDate);
        const { data: todayWaste } = yield supabase_1.supabase
            .from('waste')
            .select('product_id, quantity')
            .eq('waste_date', targetDate);
        // 4. Fetch today's expenses (global)
        const { data: expenses } = yield supabase_1.supabase
            .from('expenses')
            .select('amount')
            .eq('expense_date', targetDate);
        const totalExpenses = (expenses === null || expenses === void 0 ? void 0 : expenses.reduce((sum, exp) => sum + exp.amount, 0)) || 0;
        // Helper to sum by product
        const sumByProduct = (items, prodId, field = 'quantity') => (items === null || items === void 0 ? void 0 : items.filter(i => i.product_id === prodId).reduce((acc, curr) => acc + (curr[field] || 0), 0)) || 0;
        // 5. Build Report Data
        const reportData = products === null || products === void 0 ? void 0 : products.map(product => {
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
                total_purchase_value: (reportData === null || reportData === void 0 ? void 0 : reportData.reduce((sum, r) => sum + r.total_purchase_value, 0)) || 0,
                total_sales_value: (reportData === null || reportData === void 0 ? void 0 : reportData.reduce((sum, r) => sum + r.total_sales_value, 0)) || 0,
                total_gross_profit: (reportData === null || reportData === void 0 ? void 0 : reportData.reduce((sum, r) => sum + r.gross_profit, 0)) || 0,
                total_expenses: totalExpenses,
                net_profit: ((reportData === null || reportData === void 0 ? void 0 : reportData.reduce((sum, r) => sum + r.gross_profit, 0)) || 0) - totalExpenses
            }
        });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
}));
// Monthly report
router.get('/monthly', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { month, year } = req.query;
        if (month && year) {
            const monthNum = parseInt(month, 10);
            const yearNum = parseInt(year, 10);
            const { start, end } = getMonthBounds(monthNum, yearNum);
            const row = yield computeMonthlyRow(start, end);
            return res.json([row]);
        }
        const { data: months, error: monthError } = yield supabase_1.supabase
            .from('calendar_months')
            .select('month_start')
            .order('month_start', { ascending: false })
            .limit(12);
        let monthStarts = [];
        if (!monthError && months && months.length > 0) {
            monthStarts = months.map((m) => m.month_start);
        }
        else {
            const now = new Date();
            for (let i = 0; i < 12; i += 1) {
                const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
                monthStarts.push(ymd(d));
            }
        }
        const rows = yield Promise.all(monthStarts.map((monthStart) => __awaiter(void 0, void 0, void 0, function* () {
            const d = new Date(monthStart);
            const { start, end } = getMonthBounds(d.getUTCMonth() + 1, d.getUTCFullYear());
            return computeMonthlyRow(start, end);
        })));
        return res.json(rows);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Error fetching monthly report';
        return res.status(500).json({ error: message });
    }
}));
// Inventory report with pagination, search, and sort
router.get('/inventory', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { page = 1, limit = 10, search = '', sortBy = 'name', sortOrder = 'asc' } = req.query;
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const offset = (pageNum - 1) * limitNum;
        const term = String(search).toLowerCase().trim();
        const ascending = sortOrder === 'asc';
        let snapshot = yield buildInventorySnapshot();
        if (term) {
            snapshot = snapshot.filter((item) => item.name.toLowerCase().includes(term) ||
                (item.category || '').toLowerCase().includes(term));
        }
        const sortKey = String(sortBy);
        snapshot.sort((a, b) => {
            const av = a[sortKey];
            const bv = b[sortKey];
            if (typeof av === 'number' && typeof bv === 'number') {
                return ascending ? av - bv : bv - av;
            }
            const as = String(av !== null && av !== void 0 ? av : '').toLowerCase();
            const bs = String(bv !== null && bv !== void 0 ? bv : '').toLowerCase();
            if (as < bs)
                return ascending ? -1 : 1;
            if (as > bs)
                return ascending ? 1 : -1;
            return 0;
        });
        const paginated = snapshot.slice(offset, offset + limitNum);
        res.json({
            data: paginated,
            count: snapshot.length,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(snapshot.length / limitNum)
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Error fetching inventory report';
        res.status(500).json({ error: message });
    }
}));
// Expiring items
router.get('/expiring', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { days } = req.query;
        const daysAhead = days ? parseInt(days, 10) : 7;
        const snapshot = yield buildInventorySnapshot();
        const data = snapshot.filter((item) => item.track_expiry &&
            item.days_until_expiry !== null &&
            item.days_until_expiry >= 0 &&
            item.days_until_expiry <= daysAhead);
        res.json(data);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Error fetching expiring items';
        res.status(500).json({ error: message });
    }
}));
// Low stock items
router.get('/low-stock', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const snapshot = yield buildInventorySnapshot();
        const data = snapshot.filter((item) => item.is_low_stock);
        res.json(data);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Error fetching low stock items';
        res.status(500).json({ error: message });
    }
}));
// Top selling products
router.get('/top-selling', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { limit } = req.query;
        const limitNum = limit ? parseInt(limit, 10) : 10;
        const [{ data: sales, error: salesError }, { data: products, error: productError }] = yield Promise.all([
            supabase_1.supabase.from('sales').select('product_id, quantity'),
            supabase_1.supabase.from('products').select('id, name')
        ]);
        if (salesError || productError) {
            return res.status(400).json({ error: (salesError === null || salesError === void 0 ? void 0 : salesError.message) || (productError === null || productError === void 0 ? void 0 : productError.message) || 'Error fetching top-selling data' });
        }
        const qtyByProduct = new Map();
        (sales || []).forEach((row) => {
            const productId = row.product_id;
            const quantity = toNumber(row.quantity);
            qtyByProduct.set(productId, (qtyByProduct.get(productId) || 0) + quantity);
        });
        const productNameById = new Map();
        (products || []).forEach((p) => {
            productNameById.set(p.id, p.name);
        });
        const data = [...qtyByProduct.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, limitNum)
            .map(([product_id, total_quantity]) => ({
            product_id,
            product_name: productNameById.get(product_id) || `Product ${product_id}`,
            total_quantity
        }));
        res.json(data);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Error fetching top-selling products';
        res.status(500).json({ error: message });
    }
}));
// Waste report
router.get('/waste', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
