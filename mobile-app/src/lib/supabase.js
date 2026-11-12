import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env';

/**
 * Browser-side Supabase client for the mobile app.
 *
 * Reads VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY from centralized env config.
 * When either is missing (or not configured for the current build) the
 * client is null and callers must fall back to the REST API client in
 * ../api/client.js, which is always available.
 *
 * NOTE: only the anon key may ever ship in a browser bundle.
 * The service-role key (backend/.env) is server-side only and must
 * never be exposed here — it grants full database access.
 */
const url = env.SUPABASE_URL;
const anonKey = env.SUPABASE_ANON_KEY;

export const supabase =
  url.startsWith('http') && anonKey && !anonKey.includes('your-')
    ? createClient(url, anonKey)
    : null;

/** True when a Supabase instance is actually configured for this build. */
export const hasSupabase = () => supabase !== null;

/** The exact PostgreSQL table name used by the service catalog. */
export const SERVICES_TABLE = 'Service';
