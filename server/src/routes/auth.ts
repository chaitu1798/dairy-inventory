import { Router } from 'express';
import { auth } from '../firebase';

const router = Router();

// Firebase Auth mostly happens on the client, so these routes are for backend operations if needed.

router.post('/signup', async (req, res) => {
    try {
        const { email, password } = req.body;
        const userRecord = await auth.createUser({
            email,
            password,
        });
        res.json({ uid: userRecord.uid, email: userRecord.email });
    } catch (error: any) {
        console.error('Signup error:', error);
        return res.status(400).json({ error: error.message });
    }
});

// Firebase Admin SDK does not support direct login with password (it's for user management).
// The client should use the Firebase Client SDK to login and send the ID token.
router.post('/login', async (req, res) => {
    res.status(405).json({
        error: 'Method Not Allowed',
        message: 'Please use the Firebase Client SDK to login and provide the ID token via Authorization header.'
    });
});

router.post('/logout', async (req, res) => {
    // Stateless auth with Firebase ID tokens, client just needs to discard the token.
    res.json({ message: 'Logged out successfully' });
});

export default router;
