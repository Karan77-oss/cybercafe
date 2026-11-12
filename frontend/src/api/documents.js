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
  getVaultDocuments: () => apiClient('/customer/vault/documents', { method: 'GET' }),
  uploadVault: (file, docType = '') => {
    const formData = new FormData();
    formData.append('file', file);
    if (docType) formData.append('docType', docType);
    return apiClient('/customer/vault/upload', {
      method: 'POST',
      body: formData,
    });
  },
  presignUpload: (data) => apiClient('/documents/presign-upload', {
    method: 'POST',
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' }
  }),
  confirmUpload: (data) => apiClient('/documents/confirm-upload', {
    method: 'POST',
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' }
  }),
};
