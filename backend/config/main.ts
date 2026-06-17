import dotenv from 'dotenv';
dotenv.config();

export const config = {
    port: process.env.PORT || 8080,
    supabaseUrl: process.env.SUPABASE_URL || '',
    // New Supabase API keys. This backend is a trusted server-side admin dashboard, so
    // all DB access uses the SECRET key (service_role / BYPASSRLS) and is unaffected by RLS.
    // Each falls back to the legacy key so nothing breaks during the rollout.
    supabasePublishableKey: process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || '',
    supabaseSecretKey: process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
};