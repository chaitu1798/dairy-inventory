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
// Create waste record
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { product_id, quantity, reason, cost_value, waste_date, notes } = req.body;
    // Validate reason
    if (!['expired', 'damaged', 'other'].includes(reason)) {
        return res.status(400).json({ error: 'Invalid reason. Must be expired, damaged, or other' });
    }
    const { data, error } = yield supabase_1.supabase
        .from('waste')
        .insert([{ product_id, quantity, reason, cost_value, waste_date, notes }])
        .select();
    if (error)
        return res.status(400).json({ error: error.message });
    res.json(data);
}));
// Get waste records with optional date filtering
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { start_date, end_date } = req.query;
    let query = supabase_1.supabase
        .from('waste')
        .select(`
            *,
            products (
                id,
                name,
                category,
                unit
            )
        `)
        .order('waste_date', { ascending: false });
    if (start_date) {
        query = query.gte('waste_date', start_date);
    }
    if (end_date) {
        query = query.lte('waste_date', end_date);
    }
    const { data, error } = yield query;
    if (error)
        return res.status(400).json({ error: error.message });
    res.json(data);
}));
// Get waste summary statistics
router.get('/summary', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { start_date, end_date } = req.query;
    // Total waste value
    let totalQuery = supabase_1.supabase
        .from('waste')
        .select('cost_value');
    if (start_date)
        totalQuery = totalQuery.gte('waste_date', start_date);
    if (end_date)
        totalQuery = totalQuery.lte('waste_date', end_date);
    const { data: wasteData, error: wasteError } = yield totalQuery;
    if (wasteError)
        return res.status(400).json({ error: wasteError.message });
    const totalWasteValue = (wasteData === null || wasteData === void 0 ? void 0 : wasteData.reduce((acc, curr) => acc + (curr.cost_value || 0), 0)) || 0;
    // Waste by reason
    let reasonQuery = supabase_1.supabase
        .from('waste')
        .select('reason, cost_value');
    if (start_date)
        reasonQuery = reasonQuery.gte('waste_date', start_date);
    if (end_date)
        reasonQuery = reasonQuery.lte('waste_date', end_date);
    const { data: reasonData, error: reasonError } = yield reasonQuery;
    if (reasonError)
        return res.status(400).json({ error: reasonError.message });
    const wasteByReason = reasonData === null || reasonData === void 0 ? void 0 : reasonData.reduce((acc, curr) => {
        acc[curr.reason] = (acc[curr.reason] || 0) + (curr.cost_value || 0);
        return acc;
    }, {});
    // Waste by product
    let productQuery = supabase_1.supabase
        .from('waste')
        .select(`
            product_id,
            cost_value,
            quantity,
            products (
                name
            )
        `);
    if (start_date)
        productQuery = productQuery.gte('waste_date', start_date);
    if (end_date)
        productQuery = productQuery.lte('waste_date', end_date);
    const { data: productData, error: productError } = yield productQuery;
    if (productError)
        return res.status(400).json({ error: productError.message });
    const wasteByProduct = productData === null || productData === void 0 ? void 0 : productData.reduce((acc, curr) => {
        var _a;
        const productName = ((_a = curr.products) === null || _a === void 0 ? void 0 : _a.name) || 'Unknown';
        if (!acc[productName]) {
            acc[productName] = { value: 0, quantity: 0 };
        }
        acc[productName].value += curr.cost_value || 0;
        acc[productName].quantity += curr.quantity || 0;
        return acc;
    }, {});
    res.json({
        total_waste_value: totalWasteValue,
        waste_by_reason: wasteByReason,
        waste_by_product: wasteByProduct
    });
}));
exports.default = router;
