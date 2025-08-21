import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { config } from '../config/main';

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

export const getAllFaculty = async (_: Request, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('user_roles')
      .select(`
        user_id,
        profiles (*)
      `)
      .eq('role_id', 3);
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json(data);
  } catch (err: any) {
    console.error('Error fetching faculty:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
