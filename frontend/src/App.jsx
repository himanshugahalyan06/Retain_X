import React, { useState, Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import { HistoryProvider } from './context/HistoryContext';
import { AuthProvider, useAuth } from './context/AuthContext';

// Lazy-loaded route chunks
const HomePage = lazy(() => import('./pages/HomePage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const RetentionPage = lazy(() => import('./pages/RetentionPage'));
const PredictPage = lazy(() => import('./pages/PredictPage'));
const CustomersPage = lazy(() => import('./pages/CustomersPage'));
const InterventionsPage = lazy(() => import('./pages/InterventionsPage'));
const HistoryPage = lazy(() => import('./pages/HistoryPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const DataModelStudioPage = lazy(() => import('./pages/DataModelStudioPage'));

function PageLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 32, height: 32, border: '3px solid #2563EB', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        <p style={{ color: '#64748B', fontSize: 12.5, fontWeight: 600 }}>Loading view...</p>
      </div>
    </div>
  );
}

function NotFoundPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center', padding: '0 16px' }}>
      <div style={{ fontSize: 64, fontWeight: 900, color: '#CBD5E1', marginBottom: 8 }}>404</div>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>Page not found</h1>
      <p style={{ fontSize: 13, color: '#64748B', marginBottom: 20 }}>The page you are looking for does not exist in this workspace.</p>
      <a href="/dashboard" className="btn-primary">Return to Dashboard</a>
    </div>
  );
}

function ProtectedLayout() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p style={{ color: '#64748B', fontSize: 13, fontWeight: 600 }}>Loading workspace session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC' }}>
      {/* Fixed Left Sidebar */}
      <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />

      {/* Main Workspace Layout (Offset by 250px on desktop) */}
      <div className="lg:pl-[250px]" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Top Header */}
        <Header onOpenMobile={() => setMobileOpen(true)} />

        {/* Dynamic Route Content */}
        <main style={{ flex: 1, paddingBottom: 40 }}>
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
        </main>
      </div>
    </div>
  );
}

function LoginRoute() {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC' }}>
      <LoginPage />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <HistoryProvider>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public Landing Page */}
            <Route path="/" element={<HomePage />} />
            
            {/* Authentication Route */}
            <Route path="/login" element={<LoginRoute />} />

            {/* Protected Workspace Routes */}
            <Route path="/*" element={<ProtectedLayout />} />
          </Routes>
        </Suspense>
      </HistoryProvider>
    </AuthProvider>
  );
}

