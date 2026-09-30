import { apiClient } from './client';

export const authApi = {
  login: async (email, password) => {
    const data = await apiClient('/auth/login', {
      method: 'POST',
      body: { email, emailOrId: email, password },
    });
    // Secure token hand-off
    if (data.token) {
      localStorage.setItem('cybercafe:token', data.token);
      localStorage.setItem('cybercafe:auth_role', data.user.role);
    }
    return data.user;
  },
  
  register: async (email, password, name, phone, address) => {
    const data = await apiClient('/auth/register', {
      method: 'POST',
      body: { email, password, name, phone, address },
    });
    if (data.token) {
      localStorage.setItem('cybercafe:token', data.token);
      if (data.user?.role) {
        localStorage.setItem('cybercafe:auth_role', data.user.role);
      }
    }
    return data;
  },

  me: () => apiClient('/auth/me', { method: 'GET' }),
  
  logout: () => {
    localStorage.removeItem('cybercafe:token');
    localStorage.removeItem('cybercafe:auth_role');
  }
};
