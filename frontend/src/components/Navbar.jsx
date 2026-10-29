import React, { useState, useEffect } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { ShieldAlert, LayoutDashboard, BrainCircuit, History, Menu, X, Building2, User, LogOut, Sparkles } from 'lucide-react';
import { getHealth } from '../lib/api';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/', label: 'Home', icon: ShieldAlert, exact: true },
  { to: '/predict', label: 'Predict', icon: BrainCircuit },
  { to: '/dashboard', label: 'Analytics', icon: LayoutDashboard },
  { to: '/history', label: 'History', icon: History },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [apiStatus, setApiStatus] = useState('checking');
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();

  useEffect(() => { setOpen(false); }, [location.pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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

  const statusConfig = {
    online:   { dot: '#2D6A4F', text: 'Live',     bg: '#D8F3DC', border: 'rgba(45,106,79,0.3)', color: '#1B4332' },
    offline:  { dot: '#E07A5F', text: 'Offline',  bg: 'rgba(224,122,95,0.12)', border: 'rgba(224,122,95,0.3)', color: '#991B1B' },
    checking: { dot: '#D4A373', text: 'Checking', bg: 'rgba(212,163,115,0.15)', border: 'rgba(212,163,115,0.3)', color: '#78350F' },
  };
  const status = statusConfig[apiStatus];

  return (
    <>
      <nav
        style={{
          position: 'fixed',
          top: 0, left: 0, right: 0,
          zIndex: 50,
          transition: 'all 0.25s ease',
          background: scrolled ? 'rgba(247, 244, 239, 0.95)' : 'rgba(247, 244, 239, 0.88)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(27, 67, 50, 0.10)',
          boxShadow: scrolled ? '0 4px 20px rgba(15, 23, 42, 0.04)' : 'none',
        }}
      >
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>

            {/* Logo */}
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
              <div
                style={{
                  width: 36, height: 36,
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #1B4332, #2D6A4F)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(27,67,50,0.25)',
                }}
              >
                <ShieldAlert style={{ width: 18, height: 18, color: 'white' }} />
              </div>
              <span style={{ fontSize: 18, fontWeight: 900, color: '#0F172A', letterSpacing: '-0.02em' }}>
                RetainX
                <span style={{ color: '#2D6A4F', marginLeft: 4, fontWeight: 900 }}>AI</span>
              </span>
            </Link>

            {/* Desktop Navigation */}
            {isAuthenticated && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} className="hidden md:flex">
                {navItems.map(({ to, label, icon: Icon, exact }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={exact}
                    style={({ isActive }) => ({
                      display: 'flex',
                      alignItems: 'center',
                      gap: 7,
                      padding: '8px 16px',
                      borderRadius: 10,
                      fontSize: 13.5,
                      fontWeight: 700,
                      textDecoration: 'none',
                      transition: 'all 0.2s ease',
                      background: isActive ? '#D8F3DC' : 'transparent',
                      color: isActive ? '#1B4332' : '#334155',
                      border: isActive ? '1px solid rgba(45,106,79,0.3)' : '1px solid transparent',
                    })}
                  >
                    <Icon style={{ width: 15, height: 15, color: '#2D6A4F' }} />
                    {label}
                  </NavLink>
                ))}
              </div>
            )}

            {/* Right Side Tenant & User Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* API Status Badge */}
              <div
                className="hidden lg:flex"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 11.5,
                  fontWeight: 800,
                  padding: '4px 10px',
                  borderRadius: 9999,
                  background: status.bg,
                  border: `1px solid ${status.border}`,
                  color: status.color,
                }}
              >
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: status.dot,
                  boxShadow: apiStatus === 'online' ? `0 0 6px ${status.dot}` : 'none',
                }} />
                ● API {status.text}
              </div>

              {isAuthenticated && user && (
                <>
                  {/* Company Badge */}
                  <div
                    className="hidden sm:flex"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 12,
                      fontWeight: 800,
                      padding: '5px 12px',
                      borderRadius: 10,
                      background: '#FFFFFF',
                      border: '1px solid rgba(45, 106, 79, 0.2)',
                      color: '#1B4332',
                    }}
                  >
                    <Building2 style={{ width: 14, height: 14, color: '#2D6A4F' }} />
                    {user.company?.name || 'Workspace'}
                  </div>

                  {/* User Profile */}
                  <div
                    className="hidden sm:flex"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 12,
                      fontWeight: 700,
                      padding: '5px 10px',
                      borderRadius: 10,
                      background: '#FFFFFF',
                      border: '1px solid rgba(0,0,0,0.08)',
                      color: '#334155',
                    }}
                  >
                    <User style={{ width: 14, height: 14, color: '#64748B' }} />
                    <span style={{ maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {user.full_name || user.email.split('@')[0]}
                    </span>
                  </div>

                  {/* Logout Button */}
                  <button
                    type="button"
                    onClick={logout}
                    title="Sign Out"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '6px 12px',
                      borderRadius: 10,
                      background: 'rgba(224,122,95,0.1)',
                      border: '1px solid rgba(224,122,95,0.25)',
                      color: '#991B1B',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                    }}
                  >
                    <LogOut style={{ width: 14, height: 14 }} />
                    <span className="hidden sm:inline">Sign Out</span>
                  </button>
                </>
              )}

              {/* Mobile Menu Toggle */}
              {isAuthenticated && (
                <button
                  onClick={() => setOpen(!open)}
                  style={{
                    padding: 8,
                    borderRadius: 10,
                    background: '#FFFFFF',
                    border: '1px solid rgba(27,67,50,0.15)',
                    color: '#334155',
                    cursor: 'pointer',
                    alignItems: 'center',
                  }}
                  className="flex md:hidden"
                  aria-label="Toggle menu"
                >
                  {open ? <X style={{ width: 18, height: 18 }} /> : <Menu style={{ width: 18, height: 18 }} />}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Menu Drawer */}
        {open && isAuthenticated && (
          <div style={{
            background: '#F7F4EF',
            borderTop: '1px solid rgba(27,67,50,0.10)',
            padding: '12px 16px 16px',
            boxShadow: '0 8px 24px rgba(15,23,42,0.06)'
          }}
          className="md:hidden animate-fade-in"
          >
            {user && (
              <div style={{ padding: '8px 12px', marginBottom: 8, background: '#FFFFFF', borderRadius: 8, border: '1px solid rgba(45,106,79,0.15)' }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#1B4332' }}>🏢 {user.company?.name}</div>
                <div style={{ fontSize: 12, color: '#64748B' }}>👤 {user.full_name || user.email}</div>
              </div>
            )}
            {navItems.map(({ to, label, icon: Icon, exact }) => (
              <NavLink
                key={to}
                to={to}
                end={exact}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 16px',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 700,
                  textDecoration: 'none',
                  marginBottom: 6,
                  background: isActive ? '#D8F3DC' : '#FFFFFF',
                  color: isActive ? '#1B4332' : '#334155',
                  border: isActive ? '1px solid rgba(45,106,79,0.3)' : '1px solid rgba(27,67,50,0.08)',
                })}
              >
                <Icon style={{ width: 16, height: 16, color: '#2D6A4F' }} />
                {label}
              </NavLink>
            ))}
          </div>
        )}
      </nav>
      {/* Spacer */}
      <div style={{ height: 64 }} />
    </>
  );
}
