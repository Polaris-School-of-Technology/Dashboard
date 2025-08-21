import { createClient } from '@supabase/supabase-js';
import { config } from './main';

export const supabase = createClient(
    config.supabaseUrl,
    config.supabaseAnonKey
);