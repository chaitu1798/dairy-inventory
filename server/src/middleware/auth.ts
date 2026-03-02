import { Request, Response, NextFunction } from 'express';
import { auth } from '../firebase';

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

        try {
            const decodedToken = await auth.verifyIdToken(token);

            // Attach user to request for downstream use if needed
            (req as any).user = {
                id: decodedToken.uid,
                email: decodedToken.email,
                ...decodedToken
            };
            next();
        } catch (error: any) {
            console.error('Auth check failed:', error?.message);
            return res.status(401).json({ error: 'Invalid or expired token' });
        }
    } catch (err) {
        console.error('Auth middleware error:', err);
        res.status(500).json({ error: 'Internal auth error' });
    }
};
