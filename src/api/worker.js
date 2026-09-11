import { apiClient } from './client';

export const workerApi = {
  // Requests & Available Orders
  getAvailableRequests: () => apiClient('/worker/requests'),
  acceptJob: (orderId) => apiClient(`/worker/jobs/${orderId}/accept`, { method: 'POST' }),
  rejectJob: (orderId, reason, note) => apiClient(`/worker/requests/${orderId}/reject`, { method: 'POST', body: { reason, note } }),

  // Active / Completed Jobs
  getMyJobs: (status) => apiClient(`/worker/jobs${status ? `?status=${status}` : ''}`),
  getJobDetails: (id) => apiClient(`/worker/jobs/${id}`),
  startWork: (id) => apiClient(`/worker/jobs/${id}/start`, { method: 'POST' }),
  setTimeSlot: (id, timeSlot) => apiClient(`/worker/jobs/${id}/timeslot`, { method: 'POST', body: timeSlot }),
  uploadDeliverables: (id, deliverables) => apiClient(`/worker/jobs/${id}/deliverables`, { method: 'POST', body: { deliverables } }),
  submitJob: (id, note) => apiClient(`/worker/jobs/${id}/submit`, { method: 'POST', body: { note } }),

  // Availability & Inactivity
  toggleAvailability: (isOnline) => apiClient('/worker/availability/toggle', { method: 'POST', body: { isOnline } }),
  recordActivity: () => apiClient('/worker/activity', { method: 'POST' }),

  // Stats, Earnings, & Withdrawals
  getStats: () => apiClient('/worker/stats'),
  getEarnings: () => apiClient('/worker/earnings'),
  getWithdrawals: () => apiClient('/worker/withdrawals'),
  requestWithdrawal: (amountPaise, method, payoutDetails) => apiClient('/worker/withdrawals', { method: 'POST', body: { amountPaise, method, payoutDetails } }),

  // Notifications
  getNotifications: () => apiClient('/worker/notifications'),
  markNotificationRead: (id) => apiClient(`/worker/notifications/${id}/read`, { method: 'PUT' }),

  // Chat
  getOrderChat: (orderId) => apiClient(`/worker/chat/${orderId}`),
  sendChatMessage: (orderId, message) => apiClient(`/worker/chat/${orderId}`, { method: 'POST', body: { message } }),

  // Support Desk
  getSupportTickets: () => apiClient('/worker/support/tickets'),
  createSupportTicket: (data) => apiClient('/worker/support/tickets', { method: 'POST', body: data }),

  // Profile & Services
  getProfile: () => apiClient('/worker/profile'),
  updateProfile: (data) => apiClient('/worker/profile', { method: 'PUT', body: data }),
  proposeService: (data) => apiClient('/worker/services/propose', { method: 'POST', body: data }),
  getProposals: () => apiClient('/worker/services/proposals')
};
