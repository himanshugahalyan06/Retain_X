import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Loader2 } from 'lucide-react';

export default function ProtectedRoute({ children, requiredRole = null }) {
  const { isAuthenticated, loading, hasRole } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#EBEBEA] flex flex-col items-center justify-center">
        <div className="p-8 bg-white border border-[#D8D8D5] rounded-2xl shadow-sm text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#5FB57A] mx-auto" />
          <p className="text-xs font-bold text-[#111111] uppercase tracking-wider">
            Verifying Session & Tenant Isolation...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (typeof window !== 'undefined' && sessionStorage.getItem('just_logged_out')) {
      try {
        sessionStorage.removeItem('just_logged_out');
      } catch (e) {}
      return <Navigate to="/" replace />;
    }
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && !hasRole(requiredRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}
