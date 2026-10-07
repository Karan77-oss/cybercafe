import { apiClient } from './client';

const cleanParams = (params = {}) => {
  const filtered = Object.entries(params).filter(([_, v]) => 
    v !== undefined && v !== null && v !== '' && v !== 'ALL' && v !== 'All Status' && v !== 'All Roles' && v !== 'All Categories'
  );
  return new URLSearchParams(Object.fromEntries(filtered)).toString();
};

export const adminApi = {
  // 1. Dashboard
  getDashboardStats: () => apiClient('/admin/dashboard'),

  // 2. Workers
  getWorkers: (params = {}) => {
    const query = cleanParams(params);
    return apiClient(`/admin/workers${query ? `?${query}` : ''}`);
  },
  getWorkerDetails: (id) => apiClient(`/admin/workers/${id}`),
  createWorker: (data) => apiClient('/admin/workers', { method: 'POST', body: data }),
  resetWorkerPassword: (id, newPassword) => apiClient(`/admin/workers/${id}/reset-password`, { method: 'POST', body: { newPassword } }),
  verifyWorker: (id, approved, note) => apiClient(`/admin/workers/${id}/verify`, { method: 'POST', body: { approved, note } }),
  setWorkerStatus: (id, status, reason) => apiClient(`/admin/workers/${id}/status`, { method: 'PUT', body: { status, reason } }),
  deleteWorker: (id, reason) => apiClient(`/admin/workers/${id}`, { method: 'DELETE', body: { reason } }),

  // 3. Customers
  getCustomers: (params = {}) => {
    const query = cleanParams(params);
    return apiClient(`/admin/customers${query ? `?${query}` : ''}`);
  },
  getCustomerDetails: (id) => apiClient(`/admin/customers/${id}`),
  setCustomerStatus: (id, status, reason) => apiClient(`/admin/customers/${id}/status`, { method: 'PUT', body: { status, reason } }),

  // 4. Orders
  getOrders: (params = {}) => {
    const query = cleanParams(params);
    return apiClient(`/admin/orders${query ? `?${query}` : ''}`);
  },
  getOrderDetails: (id) => apiClient(`/admin/orders/${id}`),
  assignWorker: (orderId, workerId, note) => apiClient(`/admin/orders/${orderId}/assign`, { method: 'POST', body: { workerId, note } }),
  updateOrderStatus: (orderId, status, note) => apiClient(`/admin/orders/${orderId}/status`, { method: 'PUT', body: { status, note } }),
  requestCorrection: (orderId, reason, instruction) => apiClient(`/admin/orders/${orderId}/correction`, { method: 'POST', body: { reason, instruction } }),
  holdWorkerEarnings: (orderId, reason) => apiClient(`/admin/orders/${orderId}/hold-earnings`, { method: 'POST', body: { reason } }),
  releaseWorkerEarnings: (orderId) => apiClient(`/admin/orders/${orderId}/release-earnings`, { method: 'POST' }),
  refundOrder: (orderId, reason) => apiClient(`/admin/orders/${orderId}/refund`, { method: 'POST', body: { reason } }),

  // 5. Services
  getServices: () => apiClient('/admin/services'),
  createService: (data) => apiClient('/admin/services', { method: 'POST', body: data }),
  updateService: (id, data) => apiClient(`/admin/services/${id}`, { method: 'PUT', body: data }),
  deleteService: (id) => apiClient(`/admin/services/${id}`, { method: 'DELETE' }),
  toggleServiceStatus: (id) => apiClient(`/admin/services/${id}/toggle`, { method: 'POST' }),
  getProposals: () => apiClient('/admin/proposals'),
  approveProposal: (id, data = {}) => apiClient(`/admin/proposals/${id}/approve`, { method: 'POST', body: data }),
  rejectProposal: (id, reason) => apiClient(`/admin/proposals/${id}/reject`, { method: 'POST', body: { reason } }),

  // 6. Payments & Financials
  getFinancialSummary: () => apiClient('/admin/financials/summary'),
  getPayments: () => apiClient('/admin/payments'),
  getWithdrawals: () => apiClient('/admin/withdrawals'),
  getPayouts: () => apiClient('/admin/payouts'),
  approveWithdrawal: (id) => apiClient(`/admin/withdrawals/${id}/approve`, { method: 'POST' }),
  rejectWithdrawal: (id, reason) => apiClient(`/admin/withdrawals/${id}/reject`, { method: 'POST', body: { reason } }),
  getTopEarningWorkers: (period = 'daily') => apiClient(`/admin/workers/top-earning?period=${period}`),

  // 7. Complaints & Disputes
  getComplaints: (params = {}) => {
    const query = cleanParams(params);
    return apiClient(`/admin/complaints${query ? `?${query}` : ''}`);
  },
  getComplaintDetails: (id) => apiClient(`/admin/complaints/${id}`),
  replyComplaint: (id, message) => apiClient(`/admin/complaints/${id}/reply`, { method: 'POST', body: { message } }),
  addComplaintNote: (id, note) => apiClient(`/admin/complaints/${id}/note`, { method: 'POST', body: { note } }),
  resolveComplaint: (id, decision, resolutionNote) => apiClient(`/admin/complaints/${id}/resolve`, { method: 'POST', body: { decision, resolutionNote } }),
  getWelfareTickets: (params = {}) => {
    const query = cleanParams(params);
    return apiClient(`/admin/welfare/tickets${query ? `?${query}` : ''}`);
  },
  reviewWelfareTicket: (id, data) => apiClient(`/admin/welfare/tickets/${id}/review`, { method: 'POST', body: data }),
  processRefund: (id, data) => apiClient(`/admin/welfare/tickets/${id}/refund`, { method: 'POST', body: data }),

  // 8. Help & Support
  getSupportTickets: (params = {}) => {
    const query = cleanParams(params);
    return apiClient(`/admin/support/tickets${query ? `?${query}` : ''}`);
  },
  replySupportTicket: (id, message) => apiClient(`/admin/support/tickets/${id}/reply`, { method: 'POST', body: { message } }),
  addSupportTicketNote: (id, note) => apiClient(`/admin/support/tickets/${id}/note`, { method: 'POST', body: { note } }),
  updateSupportTicketStatus: (id, status) => apiClient(`/admin/support/tickets/${id}/status`, { method: 'PUT', body: { status } }),

  // 9. Notifications
  getNotifications: () => apiClient('/admin/notifications'),
  markNotificationRead: (id) => apiClient(`/admin/notifications/${id}/read`, { method: 'PUT' }),
  markAllNotificationsRead: () => apiClient('/admin/notifications/read-all', { method: 'PUT' }),

  // 10. Reports & Analytics
  getReports: (params = {}) => {
    const query = cleanParams(params);
    return apiClient(`/admin/reports${query ? `?${query}` : ''}`);
  },

  // 11. Settings & Audit
  getSettings: () => apiClient('/admin/settings'),
  updateSettings: (data) => apiClient('/admin/settings', { method: 'PUT', body: data }),
  updateProfile: (data) => apiClient('/admin/profile', { method: 'PUT', body: data }),
  changePassword: (oldPassword, newPassword) => apiClient('/auth/change-password', { method: 'POST', body: { oldPassword, newPassword } }),
  getAuditLogs: (params = {}) => {
    const query = cleanParams(params);
    return apiClient(`/admin/audit-logs${query ? `?${query}` : ''}`);
  }
};
