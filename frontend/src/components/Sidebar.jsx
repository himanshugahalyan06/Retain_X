import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  BrainCircuit,
  Users,
  Zap,
  Settings,
  ShieldAlert,
  Building2,
  LogOut,
  X,
  Sparkles,
  ChevronRight,
  TrendingDown,
  Target,
  History,
  Database
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/retention', label: 'Retention Hub', icon: Target },
  { to: '/data-models', label: 'Data & Model Studio', icon: Database },
  { to: '/predict', label: 'Predictions & What-If', icon: BrainCircuit },
  { to: '/customers', label: 'Customer Directory', icon: Users },
  { to: '/interventions', label: 'Intervention Engine', icon: Zap },
  { to: '/history', label: 'Prediction History', icon: History },
  { to: '/settings', label: 'Workspace Settings', icon: Settings },
];


export default function Sidebar({ mobileOpen, onCloseMobile }) {
  const { user, logout } = useAuth();

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 40,
          }}
          className="lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        style={{
          width: 250,
          height: '100vh',
          backgroundColor: '#0B1F3A',
          color: '#F8FAFC',
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          borderRight: '1px solid #132F54',
          transition: 'transform 0.25s ease-in-out',
        }}
        className={`lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Top Header & Tenant Info */}
        <div>
          {/* App Brand Header: White wordmark on navy, clear space equal to shield width */}
          <div
            style={{
              padding: '18px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid #132F54',
            }}
          >
            <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 14, textDecoration: 'none' }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: 'rgba(20, 184, 166, 0.15)',
                  border: '1px solid rgba(20, 184, 166, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ShieldAlert style={{ width: 20, height: 20, color: '#14B8A6' }} />
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em', lineHeight: 1.2, fontFamily: "'Poppins', 'Inter', sans-serif" }}>
                  Retain <span style={{ color: '#14B8A6' }}>X</span>
                </div>
                <div style={{ fontSize: 9.5, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  Protect Revenue
                </div>
              </div>
            </Link>

            {/* Mobile Close Button */}
            <button
              onClick={onCloseMobile}
              className="lg:hidden"
              style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 4 }}
            >
              <X style={{ width: 20, height: 20 }} />
            </button>
          </div>

          {/* Tenant Organization Pill */}
          <div style={{ padding: '14px 16px 10px' }}>
            <div
              style={{
                background: '#132F54',
                border: '1px solid #1E3A5F',
                borderRadius: 8,
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <Building2 style={{ width: 15, height: 15, color: '#14B8A6', flexShrink: 0 }} />
                <span
                  style={{
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: '#F8FAFC',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {user?.company?.name || 'Workspace'}
                </span>
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  background: '#14B8A6',
                  color: '#0B1F3A',
                  padding: '2px 6px',
                  borderRadius: 4,
                  textTransform: 'uppercase',
                }}
              >
                SaaS
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ padding: '6px 8px 4px', fontSize: 10.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Main Navigation
            </div>
            {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={onCloseMobile}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 12px',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#FFFFFF' : '#94A3B8',
                  background: isActive ? '#132F54' : 'transparent',
                  borderLeft: isActive ? '3px solid #14B8A6' : '3px solid transparent',
                  textDecoration: 'none',
                  transition: 'all 0.15s ease',
                })}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Icon style={{ width: 16, height: 16, color: '#14B8A6' }} />
                  <span>{label}</span>
                </div>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Bottom User Profile Section */}
        <div style={{ padding: 14, borderTop: '1px solid #132F54', background: '#08172C' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: '#F8FAFC', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.full_name || 'Admin User'}
              </div>
              <div style={{ fontSize: 11, color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.email || 'admin@retainx.ai'}
              </div>
            </div>

            <button
              onClick={logout}
              title="Sign Out of Workspace"
              style={{
                background: 'rgba(220, 38, 38, 0.12)',
                border: '1px solid rgba(220, 38, 38, 0.3)',
                color: '#EF4444',
                padding: '6px 8px',
                borderRadius: 6,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.15s',
              }}
            >
              <LogOut style={{ width: 14, height: 14 }} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
