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
const firebase_1 = require("../firebase");
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
    const [productSnapshot, purchaseSnapshot, salesSnapshot, wasteSnapshot] = yield Promise.all([
        firebase_1.collections.products.get(),
        firebase_1.collections.purchases.get(),
        firebase_1.collections.sales.get(),
        firebase_1.collections.waste.get()
    ]);
    const products = productSnapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
    const purchases = purchaseSnapshot.docs.map(doc => doc.data());
    const sales = salesSnapshot.docs.map(doc => doc.data());
    const waste = wasteSnapshot.docs.map(doc => doc.data());
    const purchasedByProduct = new Map();
    const soldByProduct = new Map();
    const wasteByProduct = new Map();
    purchases.forEach((row) => {
        purchasedByProduct.set(row.product_id, (purchasedByProduct.get(row.product_id) || 0) + toNumber(row.quantity));
    });
    sales.forEach((row) => {
        soldByProduct.set(row.product_id, (soldByProduct.get(row.product_id) || 0) + toNumber(row.quantity));
    });
    waste.forEach((row) => {
        wasteByProduct.set(row.product_id, (wasteByProduct.get(row.product_id) || 0) + toNumber(row.quantity));
    });
    const today = new Date();
    return products.map((product) => {
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
    const [salesSnapshot, purchaseSnapshot, expenseSnapshot, wasteSnapshot] = yield Promise.all([
        firebase_1.collections.sales.where('sale_date', '>=', start).where('sale_date', '<', end).get(),
        firebase_1.collections.purchases.where('purchase_date', '>=', start).where('purchase_date', '<', end).get(),
        firebase_1.collections.expenses.where('expense_date', '>=', start).where('expense_date', '<', end).get(),
        firebase_1.collections.waste.where('waste_date', '>=', start).where('waste_date', '<', end).get()
    ]);
    const totalSales = salesSnapshot.docs.reduce((sum, doc) => sum + toNumber(doc.data().total), 0);
    const totalPurchases = purchaseSnapshot.docs.reduce((sum, doc) => sum + toNumber(doc.data().total), 0);
    const totalExpenses = expenseSnapshot.docs.reduce((sum, doc) => sum + toNumber(doc.data().amount), 0);
    const totalWaste = wasteSnapshot.docs.reduce((sum, doc) => sum + toNumber(doc.data().cost_value), 0);
    return {
        month: start,
        total_sales: totalSales,
        total_purchases: totalPurchases,
        total_expenses: totalExpenses,
        total_waste: totalWaste,
        profit: totalSales - totalPurchases - totalExpenses - totalWaste
    };
});
// Dashboard endpoint
router.get('/dashboard', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const targetDate = new Date().toISOString().split('T')[0];
        const [todaySales, todayPurchases, todayExpenses, todayWaste, allSalesSnapshot, productsSnapshot, inventorySnapshot] = yield Promise.all([
            firebase_1.collections.sales.where('sale_date', '==', targetDate).get(),
            firebase_1.collections.purchases.where('purchase_date', '==', targetDate).get(),
            firebase_1.collections.expenses.where('expense_date', '==', targetDate).get(),
            firebase_1.collections.waste.where('waste_date', '==', targetDate).get(),
            firebase_1.collections.sales.select('product_id', 'quantity').get(),
            firebase_1.collections.products.select('name').get(),
            buildInventorySnapshot()
        ]);
        const totalSales = todaySales.docs.reduce((acc, doc) => acc + (doc.data().total || 0), 0);
        const totalPurchases = todayPurchases.docs.reduce((acc, doc) => acc + (doc.data().total || 0), 0);
        const totalExpenses = todayExpenses.docs.reduce((acc, doc) => acc + (doc.data().amount || 0), 0);
        const totalWaste = todayWaste.docs.reduce((acc, doc) => acc + (doc.data().cost_value || 0), 0);
        const totalStockValue = inventorySnapshot.reduce((acc, curr) => acc + toNumber(curr.stock_value), 0);
        const lowStockCount = inventorySnapshot.filter((item) => item.is_low_stock).length;
        const expiringCount = inventorySnapshot.filter((item) => item.track_expiry && item.days_until_expiry !== null && item.days_until_expiry >= 0 && item.days_until_expiry <= 7).length;
        const salesQtyByProduct = new Map();
        allSalesSnapshot.docs.forEach((doc) => {
            const row = doc.data();
            salesQtyByProduct.set(row.product_id, (salesQtyByProduct.get(row.product_id) || 0) + toNumber(row.quantity));
        });
        const productNameById = new Map();
        productsSnapshot.docs.forEach((doc) => {
            productNameById.set(doc.id, doc.data().name);
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
        res.status(500).json({ error: error.message });
    }
}));
// Daily report
router.get('/daily', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { date } = req.query;
        const targetDate = date || new Date().toISOString().split('T')[0];
        const [sales, purchases, expenses, waste] = yield Promise.all([
            firebase_1.collections.sales.where('sale_date', '==', targetDate).get(),
            firebase_1.collections.purchases.where('purchase_date', '==', targetDate).get(),
            firebase_1.collections.expenses.where('expense_date', '==', targetDate).get(),
            firebase_1.collections.waste.where('waste_date', '==', targetDate).get()
        ]);
        const totalSales = sales.docs.reduce((acc, doc) => acc + (doc.data().total || 0), 0);
        const totalPurchases = purchases.docs.reduce((acc, doc) => acc + (doc.data().total || 0), 0);
        const totalExpenses = expenses.docs.reduce((acc, doc) => acc + (doc.data().amount || 0), 0);
        const totalWaste = waste.docs.reduce((acc, doc) => acc + (doc.data().cost_value || 0), 0);
        res.json({
            date: targetDate,
            total_sales: totalSales,
            total_purchases: totalPurchases,
            total_expenses: totalExpenses,
            total_waste: totalWaste,
            profit: totalSales - totalPurchases - totalExpenses - totalWaste,
            net: totalSales - totalPurchases - totalExpenses - totalWaste
        });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
}));
// Detailed Daily Report for CSV
router.get('/daily/details', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { date } = req.query;
    const targetDate = date ? date : new Date().toISOString().split('T')[0];
    try {
        const [productsSnapshot, pastPurchasesSnapshot, pastSalesSnapshot, pastWasteSnapshot, todayPurchasesSnapshot, todaySalesSnapshot, todayWasteSnapshot, todayExpensesSnapshot] = yield Promise.all([
            firebase_1.collections.products.get(),
            firebase_1.collections.purchases.where('purchase_date', '<', targetDate).get(),
            firebase_1.collections.sales.where('sale_date', '<', targetDate).get(),
            firebase_1.collections.waste.where('waste_date', '<', targetDate).get(),
            firebase_1.collections.purchases.where('purchase_date', '==', targetDate).get(),
            firebase_1.collections.sales.where('sale_date', '==', targetDate).get(),
            firebase_1.collections.waste.where('waste_date', '==', targetDate).get(),
            firebase_1.collections.expenses.where('expense_date', '==', targetDate).get()
        ]);
        const products = productsSnapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        const pastPurchases = pastPurchasesSnapshot.docs.map(doc => doc.data());
        const pastSales = pastSalesSnapshot.docs.map(doc => doc.data());
        const pastWaste = pastWasteSnapshot.docs.map(doc => doc.data());
        const todayPurchases = todayPurchasesSnapshot.docs.map(doc => doc.data());
        const todaySales = todaySalesSnapshot.docs.map(doc => doc.data());
        const todayWaste = todayWasteSnapshot.docs.map(doc => doc.data());
        const todayExpenses = todayExpensesSnapshot.docs.map(doc => doc.data());
        const totalExpenses = todayExpenses.reduce((sum, exp) => sum + exp.amount, 0);
        const sumByProduct = (items, prodId, field = 'quantity') => items.filter(i => i.product_id === prodId).reduce((acc, curr) => acc + (curr[field] || 0), 0);
        const reportData = products.map(product => {
            const pastPurchasedQty = sumByProduct(pastPurchases, product.id);
            const pastSoldQty = sumByProduct(pastSales, product.id);
            const pastWastedQty = sumByProduct(pastWaste, product.id);
            const openingStock = pastPurchasedQty - pastSoldQty - pastWastedQty;
            const purchasedQty = sumByProduct(todayPurchases, product.id);
            const soldQty = sumByProduct(todaySales, product.id);
            const wastedQty = sumByProduct(todayWaste, product.id);
            const closingStock = openingStock + purchasedQty - soldQty - wastedQty;
            const purchaseValue = sumByProduct(todayPurchases, product.id, 'total');
            const salesValue = sumByProduct(todaySales, product.id, 'total');
            const costOfGoodsSold = soldQty * product.cost_price;
            const grossProfit = salesValue - costOfGoodsSold;
            return {
                date: targetDate,
                product_name: product.name,
                category: product.categoryName || product.category || 'General',
                unit_price: product.price || 0,
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
                total_purchase_value: reportData.reduce((sum, r) => sum + r.total_purchase_value, 0),
                total_sales_value: reportData.reduce((sum, r) => sum + r.total_sales_value, 0),
                total_gross_profit: reportData.reduce((sum, r) => sum + r.gross_profit, 0),
                total_expenses: totalExpenses,
                net_profit: reportData.reduce((sum, r) => sum + r.gross_profit, 0) - totalExpenses
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
        // Default to last 12 months
        const monthStarts = [];
        const now = new Date();
        for (let i = 0; i < 12; i += 1) {
            const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
            monthStarts.push(ymd(d));
        }
        const rows = yield Promise.all(monthStarts.map((monthStart) => __awaiter(void 0, void 0, void 0, function* () {
            const d = new Date(monthStart);
            const { start, end } = getMonthBounds(d.getUTCMonth() + 1, d.getUTCFullYear());
            return computeMonthlyRow(start, end);
        })));
        return res.json(rows);
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
}));
// Inventory report
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
        res.status(500).json({ error: error.message });
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
        res.status(500).json({ error: error.message });
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
        res.status(500).json({ error: error.message });
    }
}));
// Top selling products
router.get('/top-selling', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { limit } = req.query;
        const limitNum = limit ? parseInt(limit, 10) : 10;
        const [salesSnapshot, productsSnapshot] = yield Promise.all([
            firebase_1.collections.sales.select('product_id', 'quantity').get(),
            firebase_1.collections.products.select('name').get()
        ]);
        const qtyByProduct = new Map();
        salesSnapshot.docs.forEach((doc) => {
            const row = doc.data();
            qtyByProduct.set(row.product_id, (qtyByProduct.get(row.product_id) || 0) + toNumber(row.quantity));
        });
        const productNameById = new Map();
        productsSnapshot.docs.forEach((doc) => {
            productNameById.set(doc.id, doc.data().name);
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
        res.status(500).json({ error: error.message });
    }
}));
// Waste report
router.get('/waste', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { start_date, end_date } = req.query;
        let query = firebase_1.collections.waste.orderBy('waste_date', 'desc');
        if (start_date)
            query = query.where('waste_date', '>=', start_date);
        if (end_date)
            query = query.where('waste_date', '<=', end_date);
        const snapshot = yield query.get();
        const data = yield Promise.all(snapshot.docs.map((doc) => __awaiter(void 0, void 0, void 0, function* () {
            var _a, _b;
            const row = Object.assign({ id: doc.id }, doc.data());
            if (row.product_id) {
                const prodDoc = yield firebase_1.collections.products.doc(row.product_id).get();
                if (prodDoc.exists) {
                    row.products = { name: (_a = prodDoc.data()) === null || _a === void 0 ? void 0 : _a.name, category: (_b = prodDoc.data()) === null || _b === void 0 ? void 0 : _b.category };
                }
            }
            return row;
        })));
        const totalWaste = data.reduce((acc, curr) => acc + (curr.cost_value || 0), 0);
        const totalQuantity = data.reduce((acc, curr) => acc + (curr.quantity || 0), 0);
        res.json({
            records: data,
            summary: {
                total_waste_value: totalWaste,
                total_quantity: totalQuantity,
                record_count: data.length
            }
        });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
}));
exports.default = router;
