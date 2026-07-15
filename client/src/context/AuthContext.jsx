import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { authAPI } from '../services/api';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';

const AuthContext = createContext(null);

// Helper: apply laundry language to i18n and document direction
function applyLaundryLanguage(user) {
  if (!user || user.role === 'super_owner') return; // super owner controls their own language
  const lang = user.laundry_language || 'ar';
  if (i18n.language !== lang) {
    i18n.changeLanguage(lang);
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      setLoading(false);
      return;
    }

    try {
      const response = await authAPI.getMe();
      const userData = response.data;
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      setToken(storedToken);
      applyLaundryLanguage(userData);
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (credentials) => {
    try {
      const response = await authAPI.login(credentials);
      const tkn = response.data?.token;
      const usr = response.data?.user;

      if (!tkn || !usr) {
        throw new Error('استجابة غير صحيحة من الخادم');
      }

      localStorage.setItem('token', tkn);
      localStorage.setItem('user', JSON.stringify(usr));
      setToken(tkn);
      setUser(usr);

      // Apply laundry language immediately on login
      applyLaundryLanguage(usr);

      return usr;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('laundry_settings');
    localStorage.removeItem('order_draft');
    setToken(null);
    setUser(null);
  }, []);

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    isAuthenticated: !!token && !!user,
    isAdmin: user?.role === 'admin' || user?.role === 'super_owner',
    isSuperOwner: user?.role === 'super_owner',
    isWorker: user?.role === 'worker',
    laundryId: user?.laundry_id,
    laundryName: user?.laundry_name,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function ProtectedRoute({ children, adminOnly = false, superOwnerOnly = false, noWorker = false }) {
  const { isAuthenticated, isAdmin, isSuperOwner, isWorker, loading } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>{t('common.loading') || 'جاري التحميل...'}</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (superOwnerOnly && !isSuperOwner) {
    return <Navigate to="/" replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  if (noWorker && isWorker) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default AuthContext;
