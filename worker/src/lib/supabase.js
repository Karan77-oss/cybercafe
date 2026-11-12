import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env';

const url = env.SUPABASE_URL;
const anonKey = env.SUPABASE_ANON_KEY;

export const supabase =
  url.startsWith('http') && anonKey && !anonKey.includes('your-')
    ? createClient(url, anonKey)
    : null;

export const hasSupabase = () => supabase !== null;

export default supabase;
