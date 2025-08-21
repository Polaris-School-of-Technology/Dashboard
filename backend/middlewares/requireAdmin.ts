import { Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { config } from '../config/main'

const supabaseAdmin = createClient(
    config.supabaseUrl,
    config.supabaseServiceRoleKey,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    }
);


const requireAdmin = async (req: any, res: Response, next: NextFunction) => {
    const userId = req.user.id;

    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data, error } = await supabaseAdmin
        .from('user_roles')
        .select('roles(role_name)')
        .eq('user_id', userId);

    if (error) {
        return res.status(500).json({ error: 'Error checking user permissions.' });
    }
    if (!data || data.length === 0) {
        return res.status(403).json({ error: 'Forbidden: No roles found.' });
    }

    const isAdmin = data.some(
        (roleEntry: any) => roleEntry.roles?.role_name === 'admin'
    );

    if (!isAdmin) {
        return res.status(403).json({ error: 'Forbidden: Admin access required.' });
    }

    next();
};

export default requireAdmin;