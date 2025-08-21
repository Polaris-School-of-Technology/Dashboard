import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { config } from '../config/main'

interface AuthenticatedRequest extends Request {
    user?: any;
}

const requireAuth = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: No token provided.' });
    }

    const token = authHeader.split(' ')[1];

    const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
        global: {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        },
    });

    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
        return res.status(401).json({ error: 'Unauthorized: Invalid token.' });
    }

    req.user = data.user;
    next();
};

export default requireAuth;