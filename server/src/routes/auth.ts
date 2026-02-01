import { Router } from 'express';
import { supabase } from '../supabase';

const router = Router();

router.post('/signup', async (req, res) => {
    const { email, password } = req.body;
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
    });

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
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
