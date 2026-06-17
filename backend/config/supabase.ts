import { createClient } from '@supabase/supabase-js';
import { config } from './main';

// Trusted server-side client using the secret key (service_role / BYPASSRLS) so the
// Dashboard backend is unaffected by Row Level Security. Never expose this to the browser.
export const supabase = createClient(
    config.supabaseUrl,
    config.supabaseSecretKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
);