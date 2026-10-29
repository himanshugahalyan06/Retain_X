import React, { createContext, useContext, useState, useEffect } from 'react';
import API, { loginApi, signupApi, getMe, setAuthToken } from '../lib/api';

const AuthContext = createContext(null);
const TOKEN_KEY = 'churnguard_token';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  });
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Initialize and validate stored token on mount
  useEffect(() => {
    let mounted = true;

    const hydrateAuth = async () => {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      if (storedToken) {
        setAuthToken(storedToken);
        setToken(storedToken);
        try {
          const userRes = await getMe();
          if (mounted) {
            setUser(userRes.data);
          }
        } catch (err) {
          console.warn('Session expired or invalid, logging out.');
          localStorage.removeItem(TOKEN_KEY);
          setAuthToken(null);
          if (mounted) {
            setToken(null);
            setUser(null);
          }
        }
      }
      if (mounted) {
        setLoading(false);
      }
    };

    hydrateAuth();

    return () => {
      mounted = false;
    };
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    setAuthError(null);
    try {
      const res = await loginApi({ email, password });
      const accessToken = res.data.access_token;
      
      try {
        localStorage.setItem(TOKEN_KEY, accessToken);
      } catch (e) {
        console.warn('LocalStorage unavailable:', e);
      }
      
      setToken(accessToken);
      setAuthToken(accessToken);

      // Fetch user & company details
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
      const accessToken = res.data.access_token;
      
      try {
        localStorage.setItem(TOKEN_KEY, accessToken);
      } catch (e) {
        console.warn('LocalStorage unavailable:', e);
      }
      
      setToken(accessToken);
      setAuthToken(accessToken);

      // Fetch user & company details
      const userRes = await getMe();
      setUser(userRes.data);
      setLoading(false);
      return { success: true, user: userRes.data };
    } catch (err) {
      const message = err.response?.data?.detail || 'Failed to create account. Please check your details.';
      setAuthError(message);
      setLoading(false);
      return { success: false, error: message };
    }
  };

  const logout = () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch (e) {}
    setToken(null);
    setUser(null);
    setAuthToken(null);
    setAuthError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isAuthenticated: !!token,
        loading,
        authError,
        setAuthError,
        login,
        signup,
        logout,
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

