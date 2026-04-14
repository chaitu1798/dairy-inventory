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
        const search = (req.query.search || '').trim();
        const categoryId = req.query.categoryId || '';
        // Build query — remove orderBy from Firestore to avoid composite index requirement
        let query = firebase_1.collections.products;
        // Server-side search: Firestore range query on 'name'
        if (search) {
            query = query
                .where('name', '>=', search)
                .where('name', '<=', search + '\uf8ff');
            // If we have search, Firestore forced us to sort by 'name' anyway or it fails.
            // But search is usually specific enough.
        }
        // Server-side category filter
        if (categoryId && categoryId !== 'all') {
            query = query.where('categoryId', '==', categoryId);
        }
        // Execute query without strict limit to allow memory sorting
        // We use a high limit (5000) as a safety measure for small-medium inventories
        const snapshot = yield query.limit(5000).get();
        // If no results with categoryId, try legacy category field for older data
        let docs = snapshot.docs;
        if (docs.length === 0 && categoryId && categoryId !== 'all' && !search) {
            const legacySnapshot = yield firebase_1.collections.products
                .where('category', '==', categoryId)
                .limit(5000)
                .get();
            docs = legacySnapshot.docs;
        }
        let allDocs = docs.map(doc => {
            const data = doc.data();
            const normalizedData = Object.assign(Object.assign({ id: doc.id }, data), { name: data.name || '', categoryId: data.categoryId || data.category || 'products', categoryName: data.categoryName || (data.category ? data.category.charAt(0).toUpperCase() + data.category.slice(1) : 'General Product'), type: data.categoryId || data.category || 'products', low_stock_threshold: data.min_stock || 10 });
            return normalizedData;
        });
        // Perform in-memory sorting
        allDocs.sort((a, b) => (String(a.name) || '').localeCompare(String(b.name) || ''));
        // Client-side pagination matching the API request
        const start = (page - 1) * limit;
        const data = allDocs.slice(start, start + limit);
        // Count for total results found
        let totalCount = allDocs.length;
        // Defensive count: use aggregation if available, otherwise use fetched list size
        if (!categoryId || categoryId === 'all') {
            if (!search) {
                try {
                    const countSnapshot = yield firebase_1.collections.products.count().get();
                    totalCount = countSnapshot.data().count;
                }
                catch (e) {
                    console.warn('Firestore count() failed, falling back to document length:', e);
                    // totalCount already set to allDocs.length
                }
            }
        }
        res.json({
            data,
            count: totalCount,
            page,
            totalPages: Math.ceil(totalCount / limit)
        });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
}));
router.post('/', auth_1.requireAuth, (0, validateRequest_1.validateRequest)(schemas_1.ProductSchema), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, categoryId, categoryName, unit, price, cost_price, low_stock_threshold, reorder_level, track_expiry, expiry_date } = req.body;
        const newProduct = {
            name,
            categoryId,
            categoryName,
            category: categoryId, // Keep for backward compatibility
            unit: unit || 'unit',
            price: parseFloat(price) || 0,
            cost_price: parseFloat(cost_price) || 0,
            min_stock: parseInt((low_stock_threshold || reorder_level)) || 10,
            track_expiry: !!track_expiry,
            expiry_date: expiry_date || null,
            created_at: new Date().toISOString()
        };
        const docRef = yield firebase_1.collections.products.add(newProduct);
        const doc = yield docRef.get();
        res.json([Object.assign({ id: doc.id }, doc.data())]);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
}));
router.put('/:id', auth_1.requireAuth, (0, validateRequest_1.validateRequest)(schemas_1.ProductSchema), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { name, categoryId, categoryName, unit, price, cost_price, low_stock_threshold, reorder_level, track_expiry, expiry_date } = req.body;
        const updates = {};
        if (name !== undefined)
            updates.name = name;
        if (categoryId !== undefined) {
            updates.categoryId = categoryId;
            updates.category = categoryId; // Backwards compatibility
        }
        if (categoryName !== undefined)
            updates.categoryName = categoryName;
        if (unit !== undefined)
            updates.unit = unit;
        if (price !== undefined)
            updates.price = parseFloat(price);
        if (cost_price !== undefined)
            updates.cost_price = parseFloat(cost_price);
        if (low_stock_threshold !== undefined || reorder_level !== undefined) {
            updates.min_stock = parseInt((low_stock_threshold || reorder_level));
        }
        if (track_expiry !== undefined)
            updates.track_expiry = track_expiry;
        if (expiry_date !== undefined)
            updates.expiry_date = expiry_date || null;
        yield firebase_1.collections.products.doc(id).update(updates);
        const doc = yield firebase_1.collections.products.doc(id).get();
        res.json([Object.assign({ id: doc.id }, doc.data())]);
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
