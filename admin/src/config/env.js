/**
 * Centralized Environment Configuration for Admin Portal
 * Connects directly to the live Railway backend and live Supabase database
 * while running locally on localhost.
 */

const getEnvVar = (key, fallback = '') => {
  const value = import.meta.env[key];
  if (value !== undefined && value !== null && String(value).trim() !== '') {
    return String(value).trim();
  }
  return fallback;
};

export const env = {
  // Live Backend URL (e.g., https://your-backend.up.railway.app or /api via Vite proxy)
  API_URL: getEnvVar('VITE_API_URL', 'http://localhost:4000'),

  // Live Supabase Production Configuration
  SUPABASE_URL: getEnvVar('VITE_SUPABASE_URL', ''),
  SUPABASE_ANON_KEY: getEnvVar('VITE_SUPABASE_ANON_KEY', ''),

  // App Execution Mode
  APP_MODE: getEnvVar('VITE_APP_MODE', 'admin'),

  // Runtime environment flags
  IS_PRODUCTION: import.meta.env.PROD,
  IS_DEV: import.meta.env.DEV,
  IS_LOCAL: typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === '0.0.0.0'
  ),

  // Resolved API base URL for HTTP requests
  getApiBaseUrl() {
    if (this.API_URL && this.API_URL !== '') {
      return this.API_URL.replace(/\/+$/, '');
    }
    return '/api';
  }
};

export default env;
