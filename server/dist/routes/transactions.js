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
const validateRequest_1 = require("../middleware/validateRequest");
const schemas_1 = require("../schemas");
const router = (0, express_1.Router)();
// Helper to fetch documents with their details (mimic joins)
function getDocsWithJoin(collection, joinConfigs, query) {
    return __awaiter(this, void 0, void 0, function* () {
        let baseQuery = query || collection;
        const snapshot = yield baseQuery.get();
        const docs = snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        for (const doc of docs) {
            for (const config of joinConfigs) {
                const id = doc[config.field];
                if (id) {
                    const joinDoc = yield config.collection.doc(id).get();
                    if (joinDoc.exists) {
                        doc[config.resultField] = Object.assign({ id: joinDoc.id }, joinDoc.data());
                    }
                }
            }
        }
        return { docs, total: snapshot.size };
    });
}
// Purchases
router.get('/purchases', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { startDate, endDate } = req.query;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        let query = firebase_1.collections.purchases.orderBy('purchase_date', 'desc');
        if (startDate)
            query = query.where('purchase_date', '>=', startDate);
        if (endDate)
            query = query.where('purchase_date', '<=', endDate);
        const snapshot = yield query.limit(limit * page).get();
        const allDocs = snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        const start = (page - 1) * limit;
        const purchases = allDocs.slice(start, start + limit);
        // Fetch product details for each purchase
        for (const p of purchases) {
            if (p.product_id) {
                const prodDoc = yield firebase_1.collections.products.doc(p.product_id).get();
                if (prodDoc.exists) {
                    p.products = { name: (_a = prodDoc.data()) === null || _a === void 0 ? void 0 : _a.name, unit: (_b = prodDoc.data()) === null || _b === void 0 ? void 0 : _b.unit };
                }
            }
        }
        const countSnapshot = yield firebase_1.collections.purchases.count().get();
        const count = countSnapshot.data().count;
        res.json({
            data: purchases,
            count,
            page,
            totalPages: Math.ceil(count / limit)
        });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
}));
router.post('/purchases', auth_1.requireAuth, (0, validateRequest_1.validateRequest)(schemas_1.PurchaseSchema), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { product_id, quantity, purchase_date, expiry_date, image_url } = req.body;
        const finalExpiryDate = expiry_date === '' ? null : expiry_date;
        const productDoc = yield firebase_1.collections.products.doc(product_id).get();
        if (!productDoc.exists) {
            return res.status(400).json({ error: 'Product not found' });
        }
        const price = ((_a = productDoc.data()) === null || _a === void 0 ? void 0 : _a.cost_price) || 0;
        const total = (parseFloat(quantity) || 0) * (parseFloat(price) || 0);
        const newPurchase = {
            product_id,
            quantity: parseFloat(quantity) || 0,
            price: parseFloat(price) || 0,
            total,
            purchase_date,
            expiry_date: finalExpiryDate
        };
        const docRef = yield firebase_1.collections.purchases.add(newPurchase);
        const doc = yield docRef.get();
        // Log to stock_logs
        yield firebase_1.collections.stock_logs.add({
            product_id,
            quantity: parseFloat(quantity) || 0,
            action_type: 'IN',
            image_url: image_url || null,
            updated_by: 'system',
            created_at: new Date().toISOString()
        });
        res.json([Object.assign({ id: doc.id }, doc.data())]);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
}));
router.put('/purchases/:id', auth_1.requireAuth, (0, validateRequest_1.validateRequest)(schemas_1.PurchaseSchema), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const { id } = req.params;
        const { product_id, quantity, purchase_date, expiry_date } = req.body;
        const updates = {};
        if (product_id !== undefined)
            updates.product_id = product_id;
        if (quantity !== undefined)
            updates.quantity = parseFloat(quantity);
        if (purchase_date !== undefined)
            updates.purchase_date = purchase_date;
        if (expiry_date !== undefined)
            updates.expiry_date = expiry_date === '' ? null : expiry_date;
        if (updates.quantity !== undefined || updates.product_id !== undefined) {
            // Re-calculate total if needed
            const currentDoc = yield firebase_1.collections.purchases.doc(id).get();
            const pid = updates.product_id || ((_a = currentDoc.data()) === null || _a === void 0 ? void 0 : _a.product_id);
            const qty = updates.quantity !== undefined ? updates.quantity : (_b = currentDoc.data()) === null || _b === void 0 ? void 0 : _b.quantity;
            const productDoc = yield firebase_1.collections.products.doc(pid).get();
            const price = ((_c = productDoc.data()) === null || _c === void 0 ? void 0 : _c.cost_price) || 0;
            updates.total = qty * price;
            updates.price = price;
        }
        yield firebase_1.collections.purchases.doc(id).update(updates);
        const doc = yield firebase_1.collections.purchases.doc(id).get();
        res.json([Object.assign({ id: doc.id }, doc.data())]);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
}));
router.delete('/purchases/:id', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield firebase_1.collections.purchases.doc(id).delete();
        res.json({ message: 'Purchase deleted' });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
}));
// Sales
router.get('/sales', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const { startDate, endDate } = req.query;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        let query = firebase_1.collections.sales.orderBy('sale_date', 'desc');
        if (startDate)
            query = query.where('sale_date', '>=', startDate);
        if (endDate)
            query = query.where('sale_date', '<=', endDate);
        const snapshot = yield query.limit(limit * page).get();
        const allDocs = snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        const start = (page - 1) * limit;
        const sales = allDocs.slice(start, start + limit);
        for (const s of sales) {
            if (s.product_id) {
                const prodDoc = yield firebase_1.collections.products.doc(s.product_id).get();
                if (prodDoc.exists)
                    s.products = { name: (_a = prodDoc.data()) === null || _a === void 0 ? void 0 : _a.name, unit: (_b = prodDoc.data()) === null || _b === void 0 ? void 0 : _b.unit };
            }
            if (s.customer_id) {
                const custDoc = yield firebase_1.collections.customers.doc(s.customer_id).get();
                if (custDoc.exists)
                    s.customers = { name: (_c = custDoc.data()) === null || _c === void 0 ? void 0 : _c.name };
            }
        }
        const countSnapshot = yield firebase_1.collections.sales.count().get();
        const count = countSnapshot.data().count;
        res.json({
            data: sales,
            count,
            page,
            totalPages: Math.ceil(count / limit)
        });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
}));
router.post('/sales', auth_1.requireAuth, (0, validateRequest_1.validateRequest)(schemas_1.SaleSchema), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { product_id, quantity, sale_date, customer_id, status, due_date } = req.body;
        const finalDueDate = due_date === '' ? null : due_date;
        const productDoc = yield firebase_1.collections.products.doc(product_id).get();
        if (!productDoc.exists) {
            return res.status(400).json({ error: 'Product not found' });
        }
        const price = ((_a = productDoc.data()) === null || _a === void 0 ? void 0 : _a.price) || 0;
        const total = (parseFloat(quantity) || 0) * (parseFloat(price) || 0);
        const invoice_number = `INV-${Date.now()}`;
        const newSale = {
            product_id,
            quantity: parseFloat(quantity) || 0,
            price: parseFloat(price) || 0,
            total,
            sale_date,
            customer_id: customer_id || null,
            status: status || 'paid',
            due_date: finalDueDate || null,
            invoice_number,
            created_at: new Date().toISOString()
        };
        const docRef = yield firebase_1.collections.sales.add(newSale);
        const doc = yield docRef.get();
        // Log to stock_logs
        yield firebase_1.collections.stock_logs.add({
            product_id,
            quantity: parseFloat(quantity) || 0,
            action_type: 'OUT',
            updated_by: 'system',
            created_at: new Date().toISOString()
        });
        res.json([Object.assign({ id: doc.id }, doc.data())]);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
}));
router.put('/sales/:id', auth_1.requireAuth, (0, validateRequest_1.validateRequest)(schemas_1.SaleSchema), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { id } = req.params;
        const { product_id, customer_id, quantity, price, sale_date, status, due_date } = req.body;
        const updates = {};
        if (product_id !== undefined)
            updates.product_id = product_id;
        if (customer_id !== undefined)
            updates.customer_id = customer_id || null;
        if (quantity !== undefined)
            updates.quantity = parseFloat(quantity);
        if (price !== undefined)
            updates.price = parseFloat(price);
        if (sale_date !== undefined)
            updates.sale_date = sale_date;
        if (status !== undefined)
            updates.status = status;
        if (due_date !== undefined)
            updates.due_date = due_date === '' ? null : due_date;
        if (updates.quantity !== undefined || updates.price !== undefined) {
            const currentDoc = yield firebase_1.collections.sales.doc(id).get();
            const qty = updates.quantity !== undefined ? updates.quantity : (_a = currentDoc.data()) === null || _a === void 0 ? void 0 : _a.quantity;
            const prc = updates.price !== undefined ? updates.price : (_b = currentDoc.data()) === null || _b === void 0 ? void 0 : _b.price;
            updates.total = qty * prc;
        }
        yield firebase_1.collections.sales.doc(id).update(updates);
        const doc = yield firebase_1.collections.sales.doc(id).get();
        res.json([Object.assign({ id: doc.id }, doc.data())]);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
}));
router.delete('/sales/:id', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        // Delete related payments
        const paymentsSnapshot = yield firebase_1.collections.payments.where('sale_id', '==', id).get();
        const batch = firebase_1.db.batch();
        paymentsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
        yield batch.commit();
        yield firebase_1.collections.sales.doc(id).delete();
        res.json({ message: 'Sale deleted' });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
}));
// Expenses
router.get('/expenses', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { startDate, endDate } = req.query;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        let query = firebase_1.collections.expenses.orderBy('expense_date', 'desc');
        if (startDate)
            query = query.where('expense_date', '>=', startDate);
        if (endDate)
            query = query.where('expense_date', '<=', endDate);
        const snapshot = yield query.limit(limit * page).get();
        const allDocs = snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        const start = (page - 1) * limit;
        const expenses = allDocs.slice(start, start + limit);
        const countSnapshot = yield firebase_1.collections.expenses.count().get();
        const count = countSnapshot.data().count;
        res.json({
            data: expenses,
            count,
            page,
            totalPages: Math.ceil(count / limit)
        });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
}));
router.post('/expenses', auth_1.requireAuth, (0, validateRequest_1.validateRequest)(schemas_1.ExpenseSchema), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { category, amount, notes, expense_date } = req.body;
        const newExpense = {
            category,
            amount: parseFloat(amount) || 0,
            notes,
            expense_date,
            created_at: new Date().toISOString()
        };
        const docRef = yield firebase_1.collections.expenses.add(newExpense);
        const doc = yield docRef.get();
        res.json([Object.assign({ id: doc.id }, doc.data())]);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
}));
router.put('/expenses/:id', auth_1.requireAuth, (0, validateRequest_1.validateRequest)(schemas_1.ExpenseSchema), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { category, amount, notes, expense_date } = req.body;
        const updates = {};
        if (category !== undefined)
            updates.category = category;
        if (amount !== undefined)
            updates.amount = parseFloat(amount);
        if (notes !== undefined)
            updates.notes = notes;
        if (expense_date !== undefined)
            updates.expense_date = expense_date;
        yield firebase_1.collections.expenses.doc(id).update(updates);
        const doc = yield firebase_1.collections.expenses.doc(id).get();
        res.json([Object.assign({ id: doc.id }, doc.data())]);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
}));
router.delete('/expenses/:id', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield firebase_1.collections.expenses.doc(id).delete();
        res.json({ message: 'Expense deleted' });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
}));
exports.default = router;
