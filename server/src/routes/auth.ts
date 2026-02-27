import { Router } from 'express';
import { supabase } from '../supabase';

const router = Router();

const isUpstreamNetworkError = (error: unknown): boolean => {
    if (!error || typeof error !== 'object') return false;

    const maybeError = error as {
        message?: string;
        code?: string;
        cause?: { code?: string; message?: string };
    };

    const message = maybeError.message || '';
    const causeMessage = maybeError.cause?.message || '';
    const code = maybeError.code || maybeError.cause?.code || '';

    return (
        message.includes('fetch failed') ||
        causeMessage.includes('fetch failed') ||
        code === 'UND_ERR_CONNECT_TIMEOUT' ||
        code === 'ENOTFOUND' ||
        code === 'ETIMEDOUT'
    );
};

router.post('/signup', async (req, res) => {
    try {
        const { email, password } = req.body;
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        });

        if (error) return res.status(400).json({ error: error.message });
        res.json(data);
    } catch (error) {
        if (isUpstreamNetworkError(error)) {
            return res.status(503).json({ error: 'Authentication service is unreachable. Please try again shortly.' });
        }
        console.error('Signup error:', error);
        return res.status(500).json({ error: 'Unexpected signup error' });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) return res.status(400).json({ error: error.message });
        res.json(data);
    } catch (error) {
        if (isUpstreamNetworkError(error)) {
            return res.status(503).json({ error: 'Authentication service is unreachable. Please check internet/Supabase connectivity.' });
        }
        console.error('Login error:', error);
        return res.status(500).json({ error: 'Unexpected login error' });
    }
});

router.post('/logout', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (token) {
            // Invalidate the session on Supabase side using admin API
            const { error } = await supabase.auth.admin.signOut(token);
            if (error) {
                console.error('Supabase logout error:', error);
            }
        }
    } catch (err) {
        // Ignore errors during logout, we want to clear client state anyway
        console.error('Logout error:', err);
    }

    res.json({ message: 'Logged out successfully' });
});

export default router;
