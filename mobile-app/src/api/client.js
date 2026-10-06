import axios from 'axios';
import { Capacitor } from '@capacitor/core';

const getBaseUrl = () => {
  // If explicitly provided via .env, respect it
  if (import.meta.env.VITE_API_URL) {
    // If running in native shell and env has localhost, map to 10.0.2.2 for Android emulator
    if (Capacitor.isNativePlatform() && (import.meta.env.VITE_API_URL.includes('localhost') || import.meta.env.VITE_API_URL.includes('127.0.0.1'))) {
      return import.meta.env.VITE_API_URL.replace(/localhost|127\.0\.0\.1/, '10.0.2.2');
    }
    return import.meta.env.VITE_API_URL;
  }
  // If running inside native Android/iOS shell
  if (Capacitor.isNativePlatform()) {
    // For standard Android Emulator: 10.0.2.2 maps to the host PC's localhost
    // For real devices connected via Wi-Fi, replace with machine's LAN IP e.g. 'http://192.168.1.X:4000/api'
    return 'http://10.0.2.2:4000/api';
  }
  // Browser development
  return 'http://localhost:4000/api';
};

const api = axios.create({
  baseURL: getBaseUrl(),
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const apiClient = api;
export { api };

// Response interceptor to handle common errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Optional: Handle token expiration
      // localStorage.removeItem('token');
    }
    return Promise.reject(error);
  }
);

// 1. Auth Services
export const authApi = {
  login: async (credentials) => {
    const res = await apiClient.post('/auth/login', credentials);
    if (res.data?.token) {
      localStorage.setItem('token', res.data.token);
      if (res.data.user) {
        localStorage.setItem('user', JSON.stringify(res.data.user));
      }
    }
    return res.data;
  },
  register: async (userData) => {
    const res = await apiClient.post('/auth/register', userData);
    if (res.data?.token) {
      localStorage.setItem('token', res.data.token);
      if (res.data.user) {
        localStorage.setItem('user', JSON.stringify(res.data.user));
      }
    }
    return res.data;
  },
  me: async () => {
    const res = await apiClient.get('/auth/me');
    return res.data;
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
  getCurrentUser: () => {
    try {
      const u = localStorage.getItem('user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  },
  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  }
};

// 2. Services Catalog
export const servicesApi = {
  getServices: async (params = {}) => {
    const res = await apiClient.get('/services', { params });
    return res.data;
  },
  getService: async (id) => {
    const res = await apiClient.get(`/services/${id}`);
    return res.data;
  }
};

// 3. Order Lifecycle
export const ordersApi = {
  createOrder: async (orderData) => {
    // Check if orderData is FormData or regular object
    const isFormData = orderData instanceof FormData;
    const config = isFormData
      ? { headers: { 'Content-Type': 'multipart/form-data' } }
      : {};
    const res = await apiClient.post('/orders', orderData, config);
    return res.data;
  },
  getMyOrders: async () => {
    const res = await apiClient.get('/orders/my-orders');
    return res.data;
  },
  getOrder: async (id) => {
    const res = await apiClient.get(`/orders/${id}`);
    return res.data;
  },
  payOrder: async (id, paymentData = {}) => {
    const res = await apiClient.post(`/orders/${id}/pay`, paymentData);
    return res.data;
  },
  createPayment: async (paymentData = {}) => {
    const res = await apiClient.post('/orders/create-payment', paymentData);
    return res.data;
  },
  verifyPayment: async (verificationData = {}) => {
    const res = await apiClient.post('/orders/verify-payment', verificationData);
    return res.data;
  }
};

// 4. Customer Vault
export const vaultApi = {
  getDocuments: async () => {
    const res = await apiClient.get('/customer/vault/documents');
    return res.data;
  },
  uploadDocument: async (formData) => {
    const res = await apiClient.post('/customer/vault/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },
  uploadGeneralDoc: async (formData) => {
    const res = await apiClient.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  }
};

export default api;
