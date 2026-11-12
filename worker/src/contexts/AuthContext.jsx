import { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/auth';
import { swrCache } from '../utils/swrCache';

const AuthContext = createContext({
  loading: true,
  authenticated: false,
  user: null,
  role: 'GUEST',
  login: async () => {},
  register: async () => {},
  logout: () => {}
});

const getInitialUser = () => {
  try {
    const raw = localStorage.getItem('cybercafe:user') || localStorage.getItem('user');
    const token = localStorage.getItem('cybercafe:token') || localStorage.getItem('token');
    if (raw && token) {
      return JSON.parse(raw);
    }
  } catch { }
  return null;
};

export const AuthProvider = ({ children }) => {
  const cachedUser = getInitialUser();
  // Instant Session Restore: 0ms boot if token & profile exist in local storage
  const [user, setUser] = useState(cachedUser);
  const [loading, setLoading] = useState(() => !cachedUser && !!localStorage.getItem('cybercafe:token'));

  const fetchUser = async () => {
    const token = localStorage.getItem('cybercafe:token') || localStorage.getItem('token');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    
    try {
      const res = await authApi.me();
      if (res && res.user) {
        setUser(res.user);
        localStorage.setItem('cybercafe:user', JSON.stringify(res.user));
        localStorage.setItem('cybercafe:auth_role', res.user.role || 'WORKER');
      }
    } catch (err) {
      // If token is invalid or expired, clear it
      localStorage.removeItem('cybercafe:token');
      localStorage.removeItem('cybercafe:auth_role');
      localStorage.removeItem('cybercafe:user');
      swrCache.clear();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
    
    // Listen for cross-tab or explicit auth events
    const handleAuthChange = () => fetchUser();
    window.addEventListener('auth_change', handleAuthChange);
    return () => window.removeEventListener('auth_change', handleAuthChange);
  }, []);

  const login = async (email, password) => {
    const data = await authApi.login(email, password);
    const loggedUser = data.user || data;
    setUser(loggedUser);
    localStorage.setItem('cybercafe:user', JSON.stringify(loggedUser));
    localStorage.setItem('cybercafe:auth_role', loggedUser.role || 'WORKER');
    window.dispatchEvent(new Event('auth_change'));
    return data;
  };

  const register = async (email, password, name, phone, address) => {
    const data = await authApi.register(email, password, name, phone, address);
    if (data.user) {
      setUser(data.user);
      localStorage.setItem('cybercafe:user', JSON.stringify(data.user));
      localStorage.setItem('cybercafe:auth_role', data.user.role || 'WORKER');
      window.dispatchEvent(new Event('auth_change'));
    }
    return data;
  };

  const logout = () => {
    authApi.logout();
    localStorage.removeItem('cybercafe:user');
    localStorage.removeItem('user');
    swrCache.clear();
    setUser(null);
    window.dispatchEvent(new Event('auth_change'));
  };

  const value = {
    loading,
    authenticated: !!user,
    user,
    role: user ? user.role : 'GUEST',
    login,
    register,
    logout,
    refresh: fetchUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
