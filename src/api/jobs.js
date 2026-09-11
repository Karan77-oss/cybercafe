import { apiClient } from './client';

export const jobsApi = {
  getAvailable: () => apiClient('/jobs/available'),
  
  acceptJob: (orderId) => 
    apiClient(`/jobs/${orderId}/accept`, { method: 'POST' }),

  startJob: (jobId) => 
    apiClient(`/jobs/${jobId}/start`, { method: 'POST' }),

  submitJob: (jobId) => 
    apiClient(`/jobs/${jobId}/submit`, { method: 'POST' })
};
