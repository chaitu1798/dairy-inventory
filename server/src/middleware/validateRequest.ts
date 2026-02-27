import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export const validateRequest = (schema: ZodSchema) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            await schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params,
            });
            next();
        } catch (error: unknown) {
            if (error instanceof ZodError) {
                res.status(400).json({
                    error: 'Validation failed',
                    details: error.issues.map((err) => ({
                        path: err.path.join('.'),
                        message: err.message
                    }))
                });
            } else {
                next(error);
            }
        }
    };
};
