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
// Purchases
router.post('/purchases', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { product_id, quantity, price, purchase_date } = req.body;
    const { data, error } = yield supabase_1.supabase
        .from('purchases')
        .insert([{ product_id, quantity, price, purchase_date }])
        .select();
    if (error)
        return res.status(400).json({ error: error.message });
    res.json(data);
}));
// Sales
router.post('/sales', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { product_id, quantity, price, sale_date } = req.body;
    const { data, error } = yield supabase_1.supabase
        .from('sales')
        .insert([{ product_id, quantity, price, sale_date }])
        .select();
    if (error)
        return res.status(400).json({ error: error.message });
    res.json(data);
}));
// Expenses
router.post('/expenses', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { category, amount, notes, expense_date } = req.body;
    const { data, error } = yield supabase_1.supabase
        .from('expenses')
        .insert([{ category, amount, notes, expense_date }])
        .select();
    if (error)
        return res.status(400).json({ error: error.message });
    res.json(data);
}));
exports.default = router;
