import axios from 'axios';
import { env } from '../config/env';
import { swrCache } from '../utils/swrCache';

const getBaseUrl = () => {
  return env.getApiBaseUrl();
};

// Generous 45-second timeout for mobile networks & large document uploads
const api = axios.create({
  baseURL: getBaseUrl(),
  timeout: 45000,
});

// Resolves the backend host root (base URL with the trailing /api stripped) so
// relative asset/document URLs (e.g. /api/uploads/... or /uploads/...) can be
// turned into absolute URLs without hardcoding a localhost origin.
export const getApiHostRoot = () => {
  const base = getBaseUrl().replace(/\/+$/, '');
  return base.replace(/\/api$/i, '');
};

// Build an absolute URL for a backend-relative path, falling back to same-origin
// when the value is already absolute.
export const resolveBackendUrl = (url) => {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  const root = getApiHostRoot();
  return `${root}${url.startsWith('/') ? url : `/${url}`}`;
};

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const apiClient = api;
export { api };

// Smart retry with exponential backoff for transient network issues (500ms, 1000ms, 2000ms)
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    if (config) {
      config.retry = config.retry ?? 3;
      config.retryCount = config.retryCount || 0;

      const isNetworkOrTimeout =
        !error.response ||
        error.code === 'ECONNABORTED' ||
        (error.response?.status >= 502 && error.response?.status <= 504);

      if (isNetworkOrTimeout && config.retryCount < config.retry) {
        config.retryCount += 1;
        const backoffMs = Math.min(500 * Math.pow(2, config.retryCount - 1), 3000);
        console.warn(`[Network Retry] Attempt ${config.retryCount}/${config.retry} for ${config.url} after ${backoffMs}ms`);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        return apiClient(config);
      }
    }

    if (error.response?.status === 401) {
      // Token expiration / invalid credentials
      swrCache.clear();
    }

    // Detailed error message parsing
    let friendly = 'An unexpected error occurred. Please try again.';
    if (!error.response) {
      friendly = error.code === 'ECONNABORTED'
        ? 'Connection timed out. Please check your network connection.'
        : 'Network connection error. Server is unreachable.';
    } else if (error.response.data?.error?.message) {
      friendly = error.response.data.error.message;
    } else if (typeof error.response.data?.error === 'string') {
      friendly = error.response.data.error;
    } else if (error.response.data?.message) {
      friendly = error.response.data.message;
    } else if (error.message) {
      friendly = error.message;
    }
    error.friendlyMessage = friendly;

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
    if (res.data?.user) {
      localStorage.setItem('user', JSON.stringify(res.data.user));
    }
    return res.data;
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    swrCache.clear();
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
    const res = await apiClient.post('/orders', orderData);
    const createdOrder = res.data?.order || res.data?.data?.order || res.data;

    // Optimistically update cached orders list immediately
    if (createdOrder && (createdOrder.id || createdOrder.orderId)) {
      const currentOrders = swrCache.get('my_orders') || [];
      const updated = [createdOrder, ...currentOrders.filter((o) => (o.id || o.orderId) !== (createdOrder.id || createdOrder.orderId))];
      swrCache.set('my_orders', updated);
    }

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
  submitFeedback: async (id, { rating, feedback_comment, comment }) => {
    const res = await apiClient.post(`/orders/${id}/feedback`, {
      rating,
      comment: feedback_comment || comment,
      feedback_comment: feedback_comment || comment
    });
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
  },
  requestReschedule: async (id, data) => {
    const res = await apiClient.post(`/orders/${id}/request-reschedule`, data);
    return res.data;
  },
  respondReschedule: async (id, data) => {
    const res = await apiClient.post(`/orders/${id}/respond-reschedule`, data);
    return res.data;
  },
  getOrderChat: async (id) => {
    const res = await apiClient.get(`/orders/${id}/chat`);
    return res.data;
  },
  sendChatMessage: async (id, formDataOrMessage) => {
    if (formDataOrMessage instanceof FormData) {
      const res = await apiClient.post(`/orders/${id}/chat`, formDataOrMessage, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return res.data;
    }
    const res = await apiClient.post(`/orders/${id}/chat`, { message: formDataOrMessage });
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

// 4.1 Documents Direct & Presigned Upload
export const documentsApi = {
  presignUpload: async (data) => {
    const res = await apiClient.post('/documents/presign-upload', data);
    return res.data;
  },
  confirmUpload: async (data) => {
    const res = await apiClient.post('/documents/confirm-upload', data);
    return res.data;
  },
  upload: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  }
};

// 5. Customer Welfare & Support
export const welfareApi = {
  createTicket: async (data) => {
    const res = await apiClient.post('/welfare/tickets', data);
    return res.data;
  },
  getMyTickets: async () => {
    const res = await apiClient.get('/welfare/my-tickets');
    return res.data;
  },
  getTicketDetails: async (id) => {
    const res = await apiClient.get(`/welfare/tickets/${id}`);
    return res.data;
  }
};

// 6. System & App Version
export const systemApi = {
  getAppVersion: async () => {
    const res = await apiClient.get('/system/app-version');
    return res.data;
  }
};

export default api;
