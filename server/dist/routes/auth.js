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
const router = (0, express_1.Router)();
// Firebase Auth mostly happens on the client, so these routes are for backend operations if needed.
router.post('/signup', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        const userRecord = yield firebase_1.auth.createUser({
            email,
            password,
        });
        res.json({ uid: userRecord.uid, email: userRecord.email });
    }
    catch (error) {
        console.error('Signup error:', error);
        return res.status(400).json({ error: error.message });
    }
}));
// Firebase Admin SDK does not support direct login with password (it's for user management).
// The client should use the Firebase Client SDK to login and send the ID token.
router.post('/login', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.status(405).json({
        error: 'Method Not Allowed',
        message: 'Please use the Firebase Client SDK to login and provide the ID token via Authorization header.'
    });
}));
router.post('/logout', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // Stateless auth with Firebase ID tokens, client just needs to discard the token.
    res.json({ message: 'Logged out successfully' });
}));
exports.default = router;
