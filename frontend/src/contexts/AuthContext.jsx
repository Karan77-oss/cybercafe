import { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/auth';

const AuthContext = createContext({
  loading: true,
  authenticated: false,
  user: null,
  role: 'GUEST',
  login: async () => {},
  register: async () => {},
  logout: () => {}
});

export const AuthProvider = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  const fetchUser = async () => {
    const token = localStorage.getItem('cybercafe:token');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    
    try {
      const res = await authApi.me();
      setUser(res.user);
    } catch (err) {
      // If token is invalid or expired, clear it
      localStorage.removeItem('cybercafe:token');
      localStorage.removeItem('cybercafe:auth_role');
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
    setUser(data);
    window.dispatchEvent(new Event('auth_change'));
    return data;
  };

  const register = async (email, password, name, phone, address) => {
    const data = await authApi.register(email, password, name, phone, address);
    if (data.user) {
      setUser(data.user);
      window.dispatchEvent(new Event('auth_change'));
    }
    return data;
  };

  const logout = () => {
    authApi.logout();
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
    refresh: fetchUser // useful if we want to force re-fetch
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
