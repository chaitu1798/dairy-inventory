import { Request, Response, NextFunction } from 'express';
import { auth, db } from '../firebase';

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

export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // First check if authenticated
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: 'Missing Authorization header' });
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Invalid token format' });
        }

        const decodedToken = await auth.verifyIdToken(token);
        (req as any).user = {
            id: decodedToken.uid,
            email: decodedToken.email,
            ...decodedToken
        };

        // Check if user is admin
        // Option 1: Check custom claims (recommended)
        if (decodedToken.admin === true) {
            return next();
        }

        // Option 2: Check Firestore document for admin flag
        const userDoc = await db.collection('users').doc(decodedToken.uid).get();
        if (userDoc.exists && userDoc.data()?.isAdmin === true) {
            return next();
        }

        // Option 3: Fallback - check if email is in ADMIN_EMAILS env var
        const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(email => email.trim().toLowerCase()) || [];
        if (decodedToken.email && adminEmails.includes(decodedToken.email.toLowerCase())) {
            return next();
        }

        return res.status(403).json({ error: 'Admin access required' });
    } catch (err) {
        console.error('Admin check failed:', err);
        res.status(401).json({ error: 'Invalid or expired token' });
    }
};
