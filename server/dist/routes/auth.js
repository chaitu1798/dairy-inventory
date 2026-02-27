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
const isUpstreamNetworkError = (error) => {
    var _a, _b;
    if (!error || typeof error !== 'object')
        return false;
    const maybeError = error;
    const message = maybeError.message || '';
    const causeMessage = ((_a = maybeError.cause) === null || _a === void 0 ? void 0 : _a.message) || '';
    const code = maybeError.code || ((_b = maybeError.cause) === null || _b === void 0 ? void 0 : _b.code) || '';
    return (message.includes('fetch failed') ||
        causeMessage.includes('fetch failed') ||
        code === 'UND_ERR_CONNECT_TIMEOUT' ||
        code === 'ENOTFOUND' ||
        code === 'ETIMEDOUT');
};
router.post('/signup', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        const { data, error } = yield supabase_1.supabase.auth.signUp({
            email,
            password,
        });
        if (error)
            return res.status(400).json({ error: error.message });
        res.json(data);
    }
    catch (error) {
        if (isUpstreamNetworkError(error)) {
            return res.status(503).json({ error: 'Authentication service is unreachable. Please try again shortly.' });
        }
        console.error('Signup error:', error);
        return res.status(500).json({ error: 'Unexpected signup error' });
    }
}));
router.post('/login', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        const { data, error } = yield supabase_1.supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error)
            return res.status(400).json({ error: error.message });
        res.json(data);
    }
    catch (error) {
        if (isUpstreamNetworkError(error)) {
            return res.status(503).json({ error: 'Authentication service is unreachable. Please check internet/Supabase connectivity.' });
        }
        console.error('Login error:', error);
        return res.status(500).json({ error: 'Unexpected login error' });
    }
}));
router.post('/logout', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(' ')[1];
        if (token) {
            // Invalidate the session on Supabase side using admin API
            const { error } = yield supabase_1.supabase.auth.admin.signOut(token);
            if (error) {
                console.error('Supabase logout error:', error);
            }
        }
    }
    catch (err) {
        // Ignore errors during logout, we want to clear client state anyway
        console.error('Logout error:', err);
    }
    res.json({ message: 'Logged out successfully' });
}));
exports.default = router;
