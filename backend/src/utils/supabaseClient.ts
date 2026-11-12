import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = (process.env.SUPABASE_URL || '').replace(/['"]/g, '').trim();
const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').replace(/['"]/g, '').trim();

export const supabaseAdmin: SupabaseClient | null =
  supabaseUrl &&
  supabaseUrl.startsWith('http') &&
  supabaseServiceKey &&
  supabaseServiceKey !== 'dummy-service-key' &&
  supabaseServiceKey !== 'your-supabase-service-role-key'
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      })
    : null;
