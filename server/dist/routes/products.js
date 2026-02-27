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
const validateRequest_1 = require("../middleware/validateRequest");
const schemas_1 = require("../schemas");
const router = (0, express_1.Router)();
router.get('/', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50; // increased default to 50
    const start = (page - 1) * limit;
    const end = start + limit - 1;
    const { data, count, error } = yield supabase_1.supabase
        .from('products')
        .select('*', { count: 'exact' })
        .order('id')
        .range(start, end);
    if (error)
        return res.status(400).json({ error: error.message });
    res.json({
        data,
        count,
        page,
        totalPages: count ? Math.ceil(count / limit) : 0
    });
}));
router.post('/', auth_1.requireAuth, (0, validateRequest_1.validateRequest)(schemas_1.ProductSchema), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, type, unit, price, cost_price, low_stock_threshold, track_expiry, expiry_date } = req.body;
    // Map frontend 'type' to backend 'category' and 'low_stock_threshold' to 'min_stock'
    const { data, error } = yield supabase_1.supabase
        .from('products')
        .insert([{
            name,
            category: type,
            unit,
            price: parseFloat(price),
            cost_price: parseFloat(cost_price),
            min_stock: parseInt(low_stock_threshold) || 0,
            track_expiry,
            expiry_date: expiry_date || null
        }])
        .select();
    if (error)
        return res.status(400).json({ error: error.message });
    res.json(data);
}));
router.put('/:id', auth_1.requireAuth, (0, validateRequest_1.validateRequest)(schemas_1.ProductSchema), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { name, type, unit, price, cost_price, low_stock_threshold, track_expiry, expiry_date } = req.body;
    // Create clean update object
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
    const { data, error } = yield supabase_1.supabase
        .from('products')
        .update(updates)
        .eq('id', id)
        .select();
    if (error)
        return res.status(400).json({ error: error.message });
    res.json(data);
}));
router.delete('/:id', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { error } = yield supabase_1.supabase.from('products').delete().eq('id', id);
    if (error)
        return res.status(400).json({ error: error.message });
    res.json({ message: 'Product deleted' });
}));
exports.default = router;
