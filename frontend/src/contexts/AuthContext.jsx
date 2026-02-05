import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import { ssoAPI, isSsoEnabled } from '../services/sso';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is logged in on mount
  useEffect(() => {
    const initAuth = async () => {
      // Si SSO activé, vérifier session SSO
      if (isSsoEnabled()) {
        try {
          const session = await ssoAPI.getSession();
          if (session) {
            setUser({
              id: session.userId,
              email: session.email,
              name: session.name,
              role: session.currentRole,
              availableRoles: session.availableRoles,
              roleSelected: session.roleSelected,
              groups: session.groups,
            });
          }
        } catch (err) {
          console.error('Failed to fetch SSO session:', err);
        }
      } else {
        // Fallback: authentification JWT locale
        const token = localStorage.getItem('accessToken');
        if (token) {
          try {
            const { data } = await authAPI.me();
            setUser(data);
          } catch (err) {
            console.error('Failed to fetch user:', err);
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
          }
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    try {
      setError(null);
      const { data } = await authAPI.login(email, password);

      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      setUser(data.user);

      return data;
    } catch (err) {
      const message = err.response?.data?.message || 'Login failed';
      setError(message);
      throw new Error(message);
    }
  };

  const register = async (email, password, name) => {
    try {
      setError(null);
      const { data } = await authAPI.register(email, password, name);

      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      setUser(data.user);

      return data;
    } catch (err) {
      const message = err.response?.data?.message || 'Registration failed';
      setError(message);
      throw new Error(message);
    }
  };

  const logout = async () => {
    // Si SSO activé, utiliser logout SSO
    if (isSsoEnabled()) {
      ssoAPI.logout();
      return;
    }

    // Sinon logout JWT local
    try {
      await authAPI.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
    }
  };

  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN',
    isSsoEnabled: isSsoEnabled(),
    ssoLogin: ssoAPI.login,
    selectRole: async (role) => {
      const result = await ssoAPI.selectRole(role);
      // Recharge la session après sélection
      const session = await ssoAPI.getSession();
      if (session) {
        setUser({
          id: session.userId,
          email: session.email,
          name: session.name,
          role: session.currentRole,
          availableRoles: session.availableRoles,
          roleSelected: session.roleSelected,
          groups: session.groups,
        });
      }
      return result;
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
