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
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { data, error } = yield supabase_1.supabase.from('products').select('*').order('id');
    if (error)
        return res.status(400).json({ error: error.message });
    res.json(data);
}));
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, category, unit, selling_price, cost_price, min_stock, track_expiry, expiry_days } = req.body;
    const { data, error } = yield supabase_1.supabase
        .from('products')
        .insert([{ name, category, unit, selling_price, cost_price, min_stock, track_expiry, expiry_days }])
        .select();
    if (error)
        return res.status(400).json({ error: error.message });
    res.json(data);
}));
router.put('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const updates = req.body;
    const { data, error } = yield supabase_1.supabase
        .from('products')
        .update(updates)
        .eq('id', id)
        .select();
    if (error)
        return res.status(400).json({ error: error.message });
    res.json(data);
}));
router.delete('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { error } = yield supabase_1.supabase.from('products').delete().eq('id', id);
    if (error)
        return res.status(400).json({ error: error.message });
    res.json({ message: 'Product deleted' });
}));
exports.default = router;
