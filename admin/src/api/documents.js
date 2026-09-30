import { apiClient } from './client';

export const documentsApi = {
  upload: (file, orderId = '') => {
    const formData = new FormData();
    formData.append('file', file);
    if (orderId) formData.append('orderId', orderId);
    
    return apiClient('/documents/upload', {
      method: 'POST',
      body: formData,
    });
  },
  getSignedUrl: (id) => apiClient(`/documents/${id}`, { method: 'GET' }),
};
