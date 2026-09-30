/**
 * Shared API contracts and endpoints
 */

export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  ME: '/auth/me',

  // Customer Orders
  CUSTOMER_ORDERS: '/orders',
  CUSTOMER_ORDER_BY_ID: (id) => `/orders/${id}`,
  CUSTOMER_ORDER_DOCUMENTS: (id) => `/orders/${id}/documents`,
  
  // Services
  SERVICES: '/services',
  SERVICE_BY_ID: (id) => `/services/${id}`,

  // Payments

  // Worker Portal
  WORKER_PROFILE: '/worker/profile',
  WORKER_STATUS: '/worker/status',
  WORKER_REQUESTS: '/worker/requests',
  WORKER_ACCEPT_ORDER: (id) => `/worker/requests/${id}/accept`,
  WORKER_JOBS: '/worker/jobs',
  WORKER_JOB_STATUS: (id) => `/worker/jobs/${id}/status`,
  WORKER_JOB_RECEIPT: (id) => `/worker/jobs/${id}/receipt`,
  WORKER_EARNINGS: '/worker/earnings',
  WORKER_WITHDRAWALS: '/worker/withdrawals',

  // Admin Portal
  ADMIN_SUMMARY: '/admin/finance/summary',
  ADMIN_ORDERS: '/admin/orders',
  ADMIN_WORKERS: '/admin/workers',
  ADMIN_CUSTOMERS: '/admin/customers',
  ADMIN_COMPLAINTS: '/admin/complaints',
  ADMIN_REFUNDS: '/admin/refunds'
};
