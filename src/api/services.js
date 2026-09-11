import { apiClient } from './client';

export const servicesApi = {
  getServices: () => apiClient('/services', { method: 'GET' }),
  getService: (id) => apiClient(`/services/${id}`, { method: 'GET' }),
};
