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
// Create waste record
router.post('/', auth_1.requireAuth, (0, validateRequest_1.validateRequest)(schemas_1.WasteSchema), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { product_id, quantity, reason, cost_value, waste_date, notes } = req.body;
        if (!['expired', 'damaged', 'other'].includes(reason)) {
            return res.status(400).json({ error: 'Invalid reason. Must be expired, damaged, or other' });
        }
        const newWaste = {
            product_id,
            quantity: parseFloat(quantity) || 0,
            reason,
            cost_value: parseFloat(cost_value) || 0,
            waste_date,
            notes,
            created_at: new Date().toISOString()
        };
        const docRef = yield firebase_1.collections.waste.add(newWaste);
        const doc = yield docRef.get();
        res.json([Object.assign({ id: doc.id }, doc.data())]);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
}));
// Get waste records with optional date filtering
router.get('/', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const { start_date, end_date } = req.query;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        let query = firebase_1.collections.waste.orderBy('waste_date', 'desc');
        if (start_date)
            query = query.where('waste_date', '>=', start_date);
        if (end_date)
            query = query.where('waste_date', '<=', end_date);
        const snapshot = yield query.limit(limit * page).get();
        const allDocs = snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        const start = (page - 1) * limit;
        const wasteRecords = allDocs.slice(start, start + limit);
        // Fetch product details for each waste record
        for (const w of wasteRecords) {
            if (w.product_id) {
                const prodDoc = yield firebase_1.collections.products.doc(w.product_id).get();
                if (prodDoc.exists) {
                    w.products = {
                        id: prodDoc.id,
                        name: (_a = prodDoc.data()) === null || _a === void 0 ? void 0 : _a.name,
                        category: (_b = prodDoc.data()) === null || _b === void 0 ? void 0 : _b.category,
                        unit: (_c = prodDoc.data()) === null || _c === void 0 ? void 0 : _c.unit
                    };
                }
            }
        }
        const countSnapshot = yield firebase_1.collections.waste.count().get();
        const count = countSnapshot.data().count;
        res.json({
            data: wasteRecords,
            count,
            page,
            totalPages: Math.ceil(count / limit)
        });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
}));
// Get waste summary statistics
router.get('/summary', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { start_date, end_date } = req.query;
        let query = firebase_1.collections.waste;
        if (start_date)
            query = query.where('waste_date', '>=', start_date);
        if (end_date)
            query = query.where('waste_date', '<=', end_date);
        const snapshot = yield query.get();
        const wasteData = snapshot.docs.map(doc => doc.data());
        const totalWasteValue = wasteData.reduce((acc, curr) => acc + (curr.cost_value || 0), 0);
        const wasteByReason = wasteData.reduce((acc, curr) => {
            acc[curr.reason] = (acc[curr.reason] || 0) + (curr.cost_value || 0);
            return acc;
        }, {});
        // Waste by product - involves fetching product names
        const productStats = {};
        for (const waste of wasteData) {
            const pid = waste.product_id;
            if (!productStats[pid]) {
                const prodDoc = yield firebase_1.collections.products.doc(pid).get();
                const productName = prodDoc.exists ? (_a = prodDoc.data()) === null || _a === void 0 ? void 0 : _a.name : 'Unknown';
                productStats[pid] = { name: productName, value: 0, quantity: 0 };
            }
            productStats[pid].value += waste.cost_value || 0;
            productStats[pid].quantity += waste.quantity || 0;
        }
        const wasteByProduct = Object.values(productStats).reduce((acc, curr) => {
            acc[curr.name] = { value: curr.value, quantity: curr.quantity };
            return acc;
        }, {});
        res.json({
            total_waste_value: totalWasteValue,
            waste_by_reason: wasteByReason,
            waste_by_product: wasteByProduct
        });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
}));
// Update waste record
router.put('/:id', auth_1.requireAuth, (0, validateRequest_1.validateRequest)(schemas_1.WasteSchema), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { product_id, quantity, reason, cost_value, waste_date, notes } = req.body;
        const updates = {};
        if (product_id !== undefined)
            updates.product_id = product_id;
        if (quantity !== undefined)
            updates.quantity = parseFloat(quantity);
        if (reason !== undefined) {
            if (!['expired', 'damaged', 'other'].includes(reason)) {
                return res.status(400).json({ error: 'Invalid reason. Must be expired, damaged, or other' });
            }
            updates.reason = reason;
        }
        if (cost_value !== undefined)
            updates.cost_value = parseFloat(cost_value);
        if (waste_date !== undefined)
            updates.waste_date = waste_date;
        if (notes !== undefined)
            updates.notes = notes;
        yield firebase_1.collections.waste.doc(id).update(updates);
        const doc = yield firebase_1.collections.waste.doc(id).get();
        res.json([Object.assign({ id: doc.id }, doc.data())]);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
}));
// Delete waste record
router.delete('/:id', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield firebase_1.collections.waste.doc(id).delete();
        res.json({ message: 'Waste record deleted' });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
}));
exports.default = router;
