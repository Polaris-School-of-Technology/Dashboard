import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { config } from '../config/main'


interface AuthenticatedRequest extends Request {
    supabase?: any;
}

export const createSupabaseClient = (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next();
        }

        const token = authHeader.split(' ')[1];

    
        req.supabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
            global: {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        });

        next();
    } catch (error) {
        console.error("Error creating Supabase client:", error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};