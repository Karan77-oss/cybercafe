const resolveBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
    return envUrl.trim().replace(/\/+$/, '');
  }
  // Graceful fallback to /api (handled by Vite dev proxy in development or same-origin)
  return '/api';
};

export const BASE_URL = resolveBaseUrl();

export const buildUrl = (endpoint = '') => {
  if (!endpoint) return resolveBaseUrl();
  // Return absolute URLs as-is
  if (/^https?:\/\//i.test(endpoint)) {
    return endpoint;
  }

  const base = resolveBaseUrl();
  let cleanEndpoint = endpoint.trim();
  if (!cleanEndpoint.startsWith('/')) {
    cleanEndpoint = `/${cleanEndpoint}`;
  }

  // Prevent duplicate /api/api or missing /api
  if (base.endsWith('/api') && cleanEndpoint.startsWith('/api/')) {
    cleanEndpoint = cleanEndpoint.slice(4); // Remove leading /api
  } else if (!base.endsWith('/api') && !cleanEndpoint.startsWith('/api/')) {
    cleanEndpoint = `/api${cleanEndpoint}`;
  }

  return `${base}${cleanEndpoint}`;
};

export const apiClient = async (endpoint, { method = 'GET', body, ...customConfig } = {}) => {
  const token = localStorage.getItem('cybercafe:token') || localStorage.getItem('token');
  
  const headers = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  const mergedHeaders = { ...headers, ...customConfig.headers };
  if (isFormData) {
    delete mergedHeaders['Content-Type'];
    delete mergedHeaders['content-type'];
  }

  const config = {
    method,
    headers: mergedHeaders,
    ...customConfig,
  };

  if (body !== undefined && body !== null) {
    if (isFormData) {
      config.body = body;
    } else if (typeof body === 'string') {
      config.body = body;
    } else {
      config.body = JSON.stringify(body);
    }
  }

  const targetUrl = buildUrl(endpoint);

  try {
    const response = await fetch(targetUrl, config);

    // Safely parse JSON — server may return HTML or empty body on errors
    let data = null;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      try {
        data = JSON.parse(text);
      } catch {
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
        localStorage.removeItem('token');
      }
      throw new Error(data?.error?.message || data?.error || data?.message || 'API Error');
    }

    return data;
  } catch (error) {
    console.error(`[API Error] ${method} ${targetUrl}:`, error);
    throw error;
  }
};

