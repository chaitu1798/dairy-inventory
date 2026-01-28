import { Request, Response, NextFunction } from 'express';
import { supabase } from '../supabase';

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: 'Missing Authorization header' });
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Invalid token format' });
        }

        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            console.error('Auth check failed:', error?.message);
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        // Attach user to request for downstream use if needed
        (req as any).user = user;
        next();
    } catch (err) {
        console.error('Auth middleware error:', err);
        res.status(500).json({ error: 'Internal auth error' });
    }
};
