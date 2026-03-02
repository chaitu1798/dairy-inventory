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
router.get('/', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        // Simple pagination for Firestore
        const snapshot = yield firebase_1.collections.products
            .orderBy('name')
            .limit(limit * page)
            .get();
        const allDocs = snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        const start = (page - 1) * limit;
        const data = allDocs.slice(start, start + limit);
        const count = (yield firebase_1.collections.products.count().get()).data().count;
        res.json({
            data,
            count,
            page,
            totalPages: Math.ceil(count / limit)
        });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
}));
router.post('/', auth_1.requireAuth, (0, validateRequest_1.validateRequest)(schemas_1.ProductSchema), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, type, unit, price, cost_price, low_stock_threshold, track_expiry, expiry_date } = req.body;
        const newProduct = {
            name,
            category: type,
            unit,
            price: parseFloat(price) || 0,
            cost_price: parseFloat(cost_price) || 0,
            min_stock: parseInt(low_stock_threshold) || 0,
            track_expiry: !!track_expiry,
            expiry_date: expiry_date || null,
            created_at: new Date().toISOString()
        };
        const docRef = yield firebase_1.collections.products.add(newProduct);
        const doc = yield docRef.get();
        res.json([Object.assign({ id: doc.id }, doc.data())]); // Return array for client compatibility
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
}));
router.put('/:id', auth_1.requireAuth, (0, validateRequest_1.validateRequest)(schemas_1.ProductSchema), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { name, type, unit, price, cost_price, low_stock_threshold, track_expiry, expiry_date } = req.body;
        const updates = {};
        if (name !== undefined)
            updates.name = name;
        if (type !== undefined)
            updates.category = type;
        if (unit !== undefined)
            updates.unit = unit;
        if (price !== undefined)
            updates.price = parseFloat(price);
        if (cost_price !== undefined)
            updates.cost_price = parseFloat(cost_price);
        if (low_stock_threshold !== undefined)
            updates.min_stock = parseInt(low_stock_threshold);
        if (track_expiry !== undefined)
            updates.track_expiry = track_expiry;
        if (expiry_date !== undefined)
            updates.expiry_date = expiry_date || null;
        yield firebase_1.collections.products.doc(id).update(updates);
        const doc = yield firebase_1.collections.products.doc(id).get();
        res.json([Object.assign({ id: doc.id }, doc.data())]); // Return array for client compatibility
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
}));
router.delete('/:id', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield firebase_1.collections.products.doc(id).delete();
        res.json({ message: 'Product deleted' });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
}));
exports.default = router;
