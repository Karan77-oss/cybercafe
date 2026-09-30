export const BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const apiClient = async (endpoint, { method = 'GET', body, ...customConfig } = {}) => {
  const token = localStorage.getItem('cybercafe:token');
  
  const headers = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    method,
    headers: { ...headers, ...customConfig.headers },
    ...customConfig,
  };

  if (body) {
    if (body instanceof FormData) {
      delete config.headers['Content-Type']; // Let browser set boundary
      config.body = body;
    } else {
      config.body = JSON.stringify(body);
    }
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, config);

    // Safely parse JSON — server may return HTML or empty body on errors
    let data = null;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      // Attempt to parse as JSON anyway (some servers omit the content-type)
      try {
        data = JSON.parse(text);
      } catch {
        // Non-JSON body — treat as a generic error
        if (!response.ok) {
          throw new Error(`Server error (${response.status}): ${text.slice(0, 200) || 'No response body'}`);
        }
        data = { success: true };
      }
    }

    if (!response.ok) {
      if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/register')) {
        localStorage.removeItem('cybercafe:token');
        localStorage.removeItem('cybercafe:auth_role');
        window.location.href = '/login';
      }
      throw new Error(data?.error?.message || data?.error || data?.message || 'API Error');
    }

    return data;
  } catch (error) {
    console.error(`[API Error] ${method} ${endpoint}:`, error);
    throw error;
  }
};
