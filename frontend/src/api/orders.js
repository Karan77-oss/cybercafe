import { apiClient } from './client';

export const ordersApi = {
  createOrder: async (orderData) => {
    return await apiClient('/orders', {
      method: 'POST',
      body: orderData
    });
  },
  
  getOrders: async () => {
    return await apiClient('/orders');
  },
  
  getOrder: async (id) => {
    return await apiClient(`/orders/${id}`);
  },

  acceptTimeSlot: async (id) => {
    return await apiClient(`/orders/${id}/timeslot/accept`, { method: 'POST' });
  },

  rescheduleTimeSlot: async (id, data) => {
    return await apiClient(`/orders/${id}/timeslot/reschedule`, { method: 'POST', body: data });
  },

  submitReview: async (id, data) => {
    return await apiClient(`/orders/${id}/review`, { method: 'POST', body: data });
  },

  getAvailableWorkers: async () => {
    return await apiClient('/workers/available');
  },

  getWallet: async () => {
    return await apiClient('/customer/wallet');
  },

  getNotifications: async () => {
    return await apiClient('/customer/notifications');
  },

  // Welfare & Complaints
  createWelfareTicket: async (data) => {
    return await apiClient('/welfare/tickets', { method: 'POST', body: data });
  },

  getMyWelfareTickets: async () => {
    return await apiClient('/welfare/my-tickets');
  },

  getWelfareTicketDetails: async (id) => {
    return await apiClient(`/welfare/tickets/${id}`);
  },

  getAppVersion: async () => {
    return await apiClient('/system/app-version');
  }
};
