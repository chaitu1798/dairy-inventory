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
const KNOWN_CATEGORY_NAMES = {
    'milk-products': 'Milk Products',
    'lassi-items': 'Lassi Items',
    'curd-paneer': 'Curd & Paneer',
    'ghee': 'Ghee',
    'breads-cakes-biscuits': 'Breads Cakes & Biscuits',
    'sweets': 'Sweets',
    'savory-snacks-others': 'Savory Snacks & Others',
};
const normalizeCategoryValue = (value) => String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
router.get('/', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const search = (req.query.search || '').trim();
        const categoryId = req.query.categoryId || '';
        // Build query — remove orderBy from Firestore to avoid composite index requirement
        let query = firebase_1.collections.products;
        // Execute query without strict limit to allow memory sorting
        // We use a high limit (5000) as a safety measure for small-medium inventories
        const snapshot = yield query.limit(5000).get();
        let allDocs = snapshot.docs.map(doc => {
            const data = doc.data();
            // Normalize for both new and legacy structures
            const productName = data.productName || data.name || '';
            const rawCategoryId = data.categoryId || '';
            const rawCategoryName = data.categoryName || '';
            const rawCategory = data.category || '';
            const categoryName = rawCategoryName ||
                KNOWN_CATEGORY_NAMES[rawCategory] ||
                (rawCategory && rawCategory !== rawCategoryId ? rawCategory : '') ||
                KNOWN_CATEGORY_NAMES[rawCategoryId] ||
                'General Product';
            const counterPrice = data.counterPrice || data.price || 0;
            const distributionPrice = data.distributionPrice || data.distribution_price || 0;
            const costPrice = data.costPrice || data.cost_price || counterPrice;
            const stock = data.stock || data.stock_quantity || 0;
            const thresholdLimit = data.thresholdLimit || data.min_stock || data.low_stock_threshold || 5;
            const isLowStock = stock <= thresholdLimit;
            return Object.assign(Object.assign({ id: doc.id }, data), { 
                // New fields
                productName, category: categoryName, costPrice,
                counterPrice,
                distributionPrice,
                stock,
                thresholdLimit, isActive: data.isActive !== false, is_low_stock: isLowStock, 
                // Legacy fields for compatibility
                name: productName, categoryId: rawCategoryId || rawCategory || 'products', categoryName: categoryName, unit: data.unit || 'packets', price: counterPrice, distribution_price: distributionPrice, cost_price: costPrice, min_stock: thresholdLimit, low_stock_threshold: thresholdLimit, stock_quantity: stock });
        });
        // Apply category filter in memory (since categories are stored as names now)
        if (categoryId && categoryId !== 'all') {
            const targetCategory = KNOWN_CATEGORY_NAMES[categoryId] || categoryId;
            const targetKeys = new Set([
                categoryId,
                targetCategory,
                normalizeCategoryValue(categoryId),
                normalizeCategoryValue(targetCategory),
            ].filter(Boolean));
            allDocs = allDocs.filter(doc => {
                const productCategoryKeys = [
                    doc.category,
                    doc.categoryName,
                    doc.categoryId,
                    normalizeCategoryValue(doc.category),
                    normalizeCategoryValue(doc.categoryName),
                    normalizeCategoryValue(doc.categoryId),
                ].filter(Boolean);
                return productCategoryKeys.some(value => targetKeys.has(value));
            });
        }
        // Apply search filter in memory
        if (search) {
            const searchLower = search.toLowerCase();
            allDocs = allDocs.filter(doc => doc.productName.toLowerCase().includes(searchLower) ||
                doc.name.toLowerCase().includes(searchLower));
        }
        // Perform in-memory sorting
        allDocs.sort((a, b) => (String(a.productName) || '').localeCompare(String(b.productName) || ''));
        // Client-side pagination matching the API request
        const start = (page - 1) * limit;
        const data = allDocs.slice(start, start + limit);
        res.json({
            data,
            count: allDocs.length,
            page,
            totalPages: Math.ceil(allDocs.length / limit)
        });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
}));
router.post('/', auth_1.requireAuth, (0, validateRequest_1.validateRequest)(schemas_1.ProductSchema), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, categoryId, categoryName, unit, price, distribution_price, cost_price, low_stock_threshold, reorder_level, track_expiry, expiry_date, productName, category, costPrice, counterPrice, distributionPrice, thresholdLimit, isActive } = req.body;
        const newProduct = {
            productName: productName || name || '',
            category: category || categoryName || KNOWN_CATEGORY_NAMES[categoryId] || 'General Product',
            costPrice: costPrice || counterPrice || price || 0,
            counterPrice: counterPrice || price || 0,
            distributionPrice: distributionPrice || distribution_price || 0,
            stock: 0,
            thresholdLimit: thresholdLimit || low_stock_threshold || reorder_level || 5,
            isActive: isActive !== false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            // Legacy fields for compatibility
            name: productName || name || '',
            categoryId: categoryId || category || 'products',
            categoryName: categoryName || category || KNOWN_CATEGORY_NAMES[categoryId] || 'General Product',
            unit: unit || 'packets',
            price: counterPrice || price || 0,
            distribution_price: distributionPrice || distribution_price || 0,
            cost_price: costPrice || cost_price || counterPrice || 0,
            min_stock: thresholdLimit || low_stock_threshold || 5,
            track_expiry: !!track_expiry,
            expiry_date: expiry_date || null,
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
        const { name, categoryId, categoryName, unit, price, distribution_price, cost_price, low_stock_threshold, reorder_level, track_expiry, expiry_date, productName, category, costPrice, counterPrice, distributionPrice, thresholdLimit, isActive } = req.body;
        const updates = {};
        if (name !== undefined || productName !== undefined) {
            updates.productName = productName || name;
            updates.name = productName || name;
        }
        if (category !== undefined || categoryName !== undefined || categoryId !== undefined) {
            updates.category = category || categoryName || KNOWN_CATEGORY_NAMES[categoryId] || categoryId;
            updates.categoryName = categoryName || category || KNOWN_CATEGORY_NAMES[categoryId] || categoryId;
            updates.categoryId = categoryId || category;
        }
        if (costPrice !== undefined || cost_price !== undefined) {
            updates.costPrice = costPrice || cost_price;
            updates.cost_price = costPrice || cost_price;
        }
        if (counterPrice !== undefined || price !== undefined) {
            updates.counterPrice = counterPrice || price;
            updates.price = counterPrice || price;
        }
        if (distributionPrice !== undefined || distribution_price !== undefined) {
            updates.distributionPrice = distributionPrice || distribution_price;
            updates.distribution_price = distributionPrice || distribution_price;
        }
        if (thresholdLimit !== undefined || low_stock_threshold !== undefined || reorder_level !== undefined) {
            updates.thresholdLimit = thresholdLimit || low_stock_threshold || reorder_level;
            updates.min_stock = thresholdLimit || low_stock_threshold || reorder_level;
            updates.low_stock_threshold = thresholdLimit || low_stock_threshold || reorder_level;
        }
        if (isActive !== undefined) {
            updates.isActive = isActive;
        }
        if (unit !== undefined) {
            updates.unit = unit;
        }
        if (track_expiry !== undefined) {
            updates.track_expiry = track_expiry;
        }
        if (expiry_date !== undefined) {
            updates.expiry_date = expiry_date;
        }
        updates.updatedAt = new Date().toISOString();
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
