import React, { useState, useEffect } from 'react';
import { Menu, Search, ShieldCheck, Activity, Plus, Bell } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { getHealth } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function Header({ onOpenMobile }) {
  const [apiStatus, setApiStatus] = useState('online');
  const { user } = useAuth();
  const location = useLocation();

  useEffect(() => {
    const check = async () => {
      try {
        await getHealth();
        setApiStatus('online');
      } catch {
        setApiStatus('offline');
      }
    };
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, []);

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/':
      case '/dashboard':
        return 'Executive Dashboard';
      case '/predict':
        return 'Risk Scoring & What-If Studio';
      case '/customers':
        return 'Customer Intelligence Directory';
      case '/interventions':
        return 'Intervention & Retention Decisions';
      case '/settings':
        return 'Workspace Settings';
      default:
        return 'ChurnGuard Workstation';
    }
  };

  return (
    <header
      style={{
        height: 56,
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E2E8F0',
        position: 'sticky',
        top: 0,
        zIndex: 30,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
      }}
    >
      {/* Left: Mobile Toggle & Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button
          onClick={onOpenMobile}
          className="lg:hidden"
          style={{
            background: 'transparent',
            border: '1px solid #E2E8F0',
            borderRadius: 6,
            padding: '5px 7px',
            color: '#334155',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
          }}
          aria-label="Toggle Sidebar"
        >
          <Menu style={{ width: 18, height: 18 }} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5 }}>
          <span style={{ color: '#64748B', fontWeight: 500 }}>{user?.company?.name || 'Acme Corp'}</span>
          <span style={{ color: '#CBD5E1' }}>/</span>
          <span style={{ color: '#0F172A', fontWeight: 700 }}>{getPageTitle()}</span>
        </div>
      </div>

      {/* Right: Health Status & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* API Status Pill */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
            borderRadius: 9999,
            fontSize: 11.5,
            fontWeight: 700,
            background: apiStatus === 'online' ? '#ECFDF5' : '#FEF2F2',
            border: `1px solid ${apiStatus === 'online' ? '#A7F3D0' : '#FECACA'}`,
            color: apiStatus === 'online' ? '#065F46' : '#991B1B',
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: apiStatus === 'online' ? '#059669' : '#DC2626',
            }}
          />
          <span className="hidden sm:inline">Model Engine</span> {apiStatus === 'online' ? 'Active' : 'Offline'}
        </div>

        {/* Quick New Prediction Button */}
        <Link
          to="/predict"
          className="btn-primary"
          style={{ fontSize: 12.5, padding: '6px 12px', textDecoration: 'none' }}
        >
          <Plus style={{ width: 14, height: 14 }} />
          <span className="hidden sm:inline">Score Customer</span>
        </Link>
      </div>
    </header>
  );
}
