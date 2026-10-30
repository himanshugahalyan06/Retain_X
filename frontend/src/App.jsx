import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { HistoryProvider } from './context/HistoryContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Loader2 } from 'lucide-react';

// Main Landing Page (eager for instant first paint and instant return on signout)
import HomePage from './pages/HomePage';

// Lazy-loaded secondary route chunks
const LoginPage = lazy(() => import('./pages/LoginPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage'));
const AcceptInvitePage = lazy(() => import('./pages/AcceptInvitePage'));
const UnauthorizedPage = lazy(() => import('./pages/UnauthorizedPage'));

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const RetentionPage = lazy(() => import('./pages/RetentionPage'));
const PredictPage = lazy(() => import('./pages/PredictPage'));
const CustomersPage = lazy(() => import('./pages/CustomersPage'));
const InterventionsPage = lazy(() => import('./pages/InterventionsPage'));
const HistoryPage = lazy(() => import('./pages/HistoryPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const DataModelStudioPage = lazy(() => import('./pages/DataModelStudioPage'));

function PageLoader() {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center">
      <div className="p-6 bg-white border border-[#D8D8D5] rounded-2xl shadow-sm text-center space-y-2">
        <Loader2 className="w-7 h-7 animate-spin text-[#5FB57A] mx-auto" />
        <p className="text-xs font-bold text-[#111111] uppercase tracking-wider">
          Loading View...
        </p>
      </div>
    </div>
  );
}

function NotFoundPage() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <div className="font-display text-7xl text-[#D8D8D5] mb-2">404</div>
      <h1 className="text-xl font-black text-[#111111] mb-2 font-display">Page Not Found</h1>
      <p className="text-xs text-[#656565] mb-6 max-w-sm">
        The workspace path you requested does not exist or has been relocated.
      </p>
      <Link to="/dashboard" className="btn-ink text-xs py-2.5 px-5">
        Return to Dashboard
      </Link>
    </div>
  );
}

function AuthRouteWrapper({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <HistoryProvider>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* ─── PUBLIC LANDING & AUTHENTICATION ROUTES ──────────────── */}
            <Route path="/" element={<HomePage />} />
            
            <Route
              path="/login"
              element={
                <AuthRouteWrapper>
                  <LoginPage />
                </AuthRouteWrapper>
              }
            />
            <Route
              path="/signup"
              element={
                <AuthRouteWrapper>
                  <LoginPage />
                </AuthRouteWrapper>
              }
            />
            <Route
              path="/forgot-password"
              element={
                <AuthRouteWrapper>
                  <ForgotPasswordPage />
                </AuthRouteWrapper>
              }
            />
            <Route
              path="/reset-password"
              element={
                <AuthRouteWrapper>
                  <ResetPasswordPage />
                </AuthRouteWrapper>
              }
            />
            <Route
              path="/invite/accept"
              element={<AcceptInvitePage />}
            />
            <Route
              path="/verify-email"
              element={<VerifyEmailPage />}
            />
            <Route
              path="/unauthorized"
              element={<UnauthorizedPage />}
            />

            {/* ─── PROTECTED WORKSPACE ROUTES ─────────────────────────── */}
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Suspense fallback={<PageLoader />}>
                      <Routes>
                        <Route path="dashboard" element={<DashboardPage />} />
                        <Route path="retention" element={<RetentionPage />} />
                        <Route path="data-models" element={<DataModelStudioPage />} />
                        <Route path="app/data-models" element={<DataModelStudioPage />} />
                        <Route path="predict" element={<PredictPage />} />
                        <Route path="customers" element={<CustomersPage />} />
                        <Route path="interventions" element={<InterventionsPage />} />
                        <Route path="history" element={<HistoryPage />} />
                        <Route path="settings" element={<SettingsPage />} />
                        <Route path="*" element={<NotFoundPage />} />
                      </Routes>
                    </Suspense>
                  </AppLayout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </Suspense>
      </HistoryProvider>
    </AuthProvider>
  );
}
