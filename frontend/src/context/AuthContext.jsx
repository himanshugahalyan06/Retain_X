import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import API, { loginApi, signupApi, refreshTokenApi, logoutApi, getMe, setAuthToken, clearApiCache } from '../lib/api';

const AuthContext = createContext(null);
const ACCESS_TOKEN_KEY = 'retainx_access_token';
const REFRESH_TOKEN_KEY = 'retainx_refresh_token';

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [accessToken, setAccessToken] = useState(() => {
    try {
      return localStorage.getItem(ACCESS_TOKEN_KEY) || localStorage.getItem('churnguard_access_token');
    } catch {
      return null;
    }
  });

  const [refreshToken, setRefreshToken] = useState(() => {
    try {
      return localStorage.getItem(REFRESH_TOKEN_KEY) || localStorage.getItem('churnguard_refresh_token');
    } catch {
      return null;
    }
  });

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Store tokens safely in memory and localStorage for resilience
  const saveTokens = useCallback((access, refresh) => {
    if (access) {
      setAccessToken(access);
      setAuthToken(access);
      try {
        localStorage.setItem(ACCESS_TOKEN_KEY, access);
      } catch (e) {}
    }
    if (refresh) {
      setRefreshToken(refresh);
      try {
        localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
      } catch (e) {}
    }
  }, []);

  const clearTokens = useCallback(() => {
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
    setAuthToken(null);
    clearApiCache();
    try {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    } catch (e) {}
  }, []);

  // Hydrate user profile on mount
  useEffect(() => {
    let isMounted = true;

    const hydrateAuth = async () => {
      const storedAccess = localStorage.getItem(ACCESS_TOKEN_KEY);
      const storedRefresh = localStorage.getItem(REFRESH_TOKEN_KEY);

      if (storedAccess) {
        setAuthToken(storedAccess);
        try {
          const userRes = await getMe();
          if (isMounted) {
            setUser(userRes.data);
          }
        } catch (err) {
          // Access token might be expired, try refreshing if refresh token exists
          if (storedRefresh) {
            try {
              const refreshRes = await refreshTokenApi({ refresh_token: storedRefresh });
              const { access_token, refresh_token: newRefresh } = refreshRes.data;
              saveTokens(access_token, newRefresh || storedRefresh);
              const userRes = await getMe();
              if (isMounted) {
                setUser(userRes.data);
              }
            } catch (refreshErr) {
              console.warn('Session refresh failed, clearing session.');
              clearTokens();
            }
          } else {
            clearTokens();
          }
        }
      } else if (storedRefresh) {
        // Attempt hydration via refresh token alone
        try {
          const refreshRes = await refreshTokenApi({ refresh_token: storedRefresh });
          const { access_token, refresh_token: newRefresh } = refreshRes.data;
          saveTokens(access_token, newRefresh || storedRefresh);
          const userRes = await getMe();
          if (isMounted) {
            setUser(userRes.data);
          }
        } catch {
          clearTokens();
        }
      }

      if (isMounted) {
        setLoading(false);
      }
    };

    hydrateAuth();

    return () => {
      isMounted = false;
    };
  }, [clearTokens, saveTokens]);

  // Global Axios response interceptor for automatic 401 refresh token rotation
  useEffect(() => {
    const interceptor = API.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        if (
          error.response?.status === 401 &&
          !originalRequest._retry &&
          !originalRequest.url?.includes('/api/auth/login') &&
          !originalRequest.url?.includes('/api/auth/refresh')
        ) {
          originalRequest._retry = true;
          const currentRefresh = localStorage.getItem(REFRESH_TOKEN_KEY);
          if (currentRefresh) {
            try {
              const res = await refreshTokenApi({ refresh_token: currentRefresh });
              const { access_token, refresh_token: newRefresh } = res.data;
              saveTokens(access_token, newRefresh || currentRefresh);
              originalRequest.headers['Authorization'] = `Bearer ${access_token}`;
              return API(originalRequest);
            } catch (refreshErr) {
              clearTokens();
              return Promise.reject(refreshErr);
            }
          } else {
            clearTokens();
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      API.interceptors.response.eject(interceptor);
    };
  }, [clearTokens, saveTokens]);

  const login = async (email, password) => {
    setLoading(true);
    setAuthError(null);
    try {
      const res = await loginApi({ email, password });
      const { access_token, refresh_token } = res.data;

      saveTokens(access_token, refresh_token);

      // Fetch user profile and organization context
      const userRes = await getMe();
      setUser(userRes.data);
      setLoading(false);
      return { success: true, user: userRes.data };
    } catch (err) {
      const message = err.response?.data?.detail || 'Invalid email or password. Please try again.';
      setAuthError(message);
      setLoading(false);
      return { success: false, error: message };
    }
  };

  const signup = async ({ email, password, full_name, company_name }) => {
    setLoading(true);
    setAuthError(null);
    try {
      const res = await signupApi({ email, password, full_name, company_name });
      const { access_token, refresh_token } = res.data;

      saveTokens(access_token, refresh_token);

      const userRes = await getMe();
      setUser(userRes.data);
      setLoading(false);
      return { success: true, user: userRes.data };
    } catch (err) {
      const message = err.response?.data?.detail || 'Failed to create organization account. Please check your inputs.';
      setAuthError(message);
      setLoading(false);
      return { success: false, error: message };
    }
  };

  const logout = async () => {
    try {
      await logoutApi();
    } catch (e) {
      // Ignore network errors on logout
    } finally {
      try {
        sessionStorage.setItem('just_logged_out', '1');
      } catch (e) {}
      clearTokens();
      setAuthError(null);
      navigate('/', { replace: true });
    }
  };

  const refreshUser = async () => {
    try {
      clearApiCache('/api/auth/me');
      const res = await getMe();
      setUser(res.data);
      return res.data;
    } catch (e) {
      return null;
    }
  };

  // RBAC and Organization helpers
  const role = user?.role || 'MEMBER';
  const isAdmin = role === 'ADMIN';
  const isManager = role === 'ADMIN' || role === 'MANAGER';
  const isAnalyst = role === 'ANALYST' || role === 'MEMBER';
  const hasRole = (requiredRole) => {
    if (!requiredRole) return true;
    if (role === 'ADMIN') return true;
    if (requiredRole === 'MANAGER') return role === 'MANAGER';
    if (requiredRole === 'MEMBER' || requiredRole === 'ANALYST') return true;
    return false;
  };

  return (
    <AuthContext.Provider
      value={{
        token: accessToken,
        accessToken,
        refreshToken,
        user,
        role,
        isAdmin,
        isManager,
        isAnalyst,
        hasRole,
        companyName: user?.company_name || 'Organization',
        companySlug: user?.company_slug || '',
        isVerified: !!user?.is_verified,
        isAuthenticated: !!accessToken && !!user,
        loading,
        authError,
        setAuthError,
        login,
        signup,
        logout,
        refreshUser,
        saveTokens,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
