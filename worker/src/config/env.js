/**
 * Centralized Environment Configuration for Worker Portal
 * Deployed to Vercel and connects directly to the live Railway backend & Supabase
 */

const getEnvVar = (key, fallback = '') => {
  const value = import.meta.env[key];
  if (value !== undefined && value !== null && String(value).trim() !== '') {
    return String(value).trim();
  }
  return fallback;
};

export const env = {
  // Live Backend URL on Railway (e.g., https://your-backend.up.railway.app)
  API_URL: getEnvVar('VITE_API_URL', ''),

  // Live Supabase Production Configuration
  SUPABASE_URL: getEnvVar('VITE_SUPABASE_URL', ''),
  SUPABASE_ANON_KEY: getEnvVar('VITE_SUPABASE_ANON_KEY', ''),

  // App Mode (locked to worker)
  APP_MODE: getEnvVar('VITE_APP_MODE', 'worker'),

  // Environment flags
  IS_PRODUCTION: import.meta.env.PROD,
  IS_DEV: import.meta.env.DEV,

  // Resolved API base URL for HTTP client
  getApiBaseUrl() {
    if (this.API_URL && this.API_URL !== '') {
      return this.API_URL.replace(/\/+$/, '');
    }
    // In local dev without explicit URL, use Vite proxy /api
    return '/api';
  }
};

export default env;
