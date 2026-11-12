/**
 * Centralized Environment Configuration for Customer App (Web, PWA & Capacitor Native)
 * Deployed to Vercel and connects directly to the live Railway backend & Supabase
 */
import { Capacitor } from '@capacitor/core';

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

  // Razorpay Gateway
  RAZORPAY_KEY_ID: getEnvVar('VITE_RAZORPAY_KEY_ID', 'rzp_test_TjrbhiZugaY7hK'),

  // App Mode (locked to customer)
  APP_MODE: getEnvVar('VITE_APP_MODE', 'customer'),

  // Platform and environment flags
  IS_NATIVE: Capacitor.isNativePlatform(),
  IS_PRODUCTION: import.meta.env.PROD,
  IS_DEV: import.meta.env.DEV,

  // Resolved API base URL for Axios HTTP client
  getApiBaseUrl() {
    const isWeb = !this.IS_NATIVE;

    if (this.API_URL) {
      if (isWeb && /(^|\/\/)(localhost|127\.0\.0\.1)([:/]|$)/.test(this.API_URL)) {
        return '/api';
      }
      return this.API_URL.replace(/\/+$/, '');
    }

    if (isWeb) {
      return '/api';
    }

    // Last resort for mobile native emulator/device without env var
    const hostname = (typeof window !== 'undefined' && window.location.hostname) || 'localhost';
    return `http://${hostname}:4000/api`;
  }
};

export default env;
