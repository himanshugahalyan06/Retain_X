import React, { useState, useEffect } from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
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
  Menu,
  ChevronLeft,
  ChevronRight,
  Target,
  History,
  Database,
  PieChart,
  Layers,
  Bell,
  Search,
  CheckCircle2,
  FileText,
  User,
  ShieldCheck,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getHealth } from '../../lib/api';

const NAV_GROUPS = [
  {
    title: 'Core Analytics',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/predict', label: 'Predict & What-If', icon: BrainCircuit },
      { to: '/customers', label: 'Customer Directory', icon: Users },
    ],
  },
  {
    title: 'Retention & Actions',
    items: [
      { to: '/retention', label: 'Retention Hub', icon: Target },
      { to: '/interventions', label: 'Interventions Engine', icon: Zap },
    ],
  },
  {
    title: 'Data & Machine Learning',
    items: [
      { to: '/data-models', label: 'Data & Model Studio', icon: Database },
      { to: '/history', label: 'Prediction History', icon: History },
    ],
  },
  {
    title: 'Governance & Settings',
    items: [
      { to: '/settings', label: 'Settings & Team', icon: Settings },
    ],
  },
];

export default function AppLayout({ children }) {
  const { user, role, companyName, logout, isAdmin, isManager } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [apiStatus, setApiStatus] = useState('online');

  // Close mobile drawer on route transition
  useEffect(() => {
    setMobileOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname]);

  // Periodic health check
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

  const getPageInfo = () => {
    const p = location.pathname;
    if (p.includes('/dashboard')) return { title: 'Executive Overview', section: 'Analytics' };
    if (p.includes('/retention')) return { title: 'Retention Decision Hub', section: 'Operations' };
    if (p.includes('/data-models')) return { title: 'Data & Model Studio', section: 'Machine Learning' };
    if (p.includes('/predict')) return { title: 'Risk Scoring & What-If', section: 'Intelligence' };
    if (p.includes('/customers')) return { title: 'Customer Directory', section: 'Intelligence' };
    if (p.includes('/interventions')) return { title: 'Intervention Engine', section: 'Operations' };
    if (p.includes('/history')) return { title: 'Prediction History', section: 'Audit' };
    if (p.includes('/settings')) return { title: 'Workspace Settings', section: 'Administration' };
    return { title: 'Workspace', section: 'Retain X' };
  };

  const pageInfo = getPageInfo();

  return (
    <div className="min-h-screen bg-[#EBEBEA] flex">
      {/* ─── MOBILE BACKDROP ───────────────────────────────────────── */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-[#111111]/60 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      {/* ─── SIDEBAR CONTAINER ─────────────────────────────────────── */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 bg-[#111111] text-[#FFFFFF] border-r border-[#262626] transition-all duration-300 flex flex-col justify-between ${
          collapsed ? 'w-18' : 'w-64'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div>
          {/* Brand Header */}
          <div className="h-16 px-4 border-b border-[#262626] flex items-center justify-between">
            <Link to="/dashboard" className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-[#202020] border border-[#333333] flex items-center justify-center text-[#5FB57A] shrink-0">
                <ShieldAlert className="w-4 h-4" />
              </div>
              {!collapsed && (
                <div className="truncate">
                  <div className="font-display text-sm tracking-tight text-white leading-none">
                    RETAIN<span className="text-[#5FB57A]">X</span>
                  </div>
                  <div className="text-[10px] font-bold text-[#8E8E8A] uppercase tracking-wider mt-0.5">
                    Enterprise SaaS
                  </div>
                </div>
              )}
            </Link>

            {/* Mobile Close Button */}
            <button
              onClick={() => setMobileOpen(false)}
              className="lg:hidden text-[#8E8E8A] hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tenant Pill */}
          <div className="p-3">
            <div className={`p-2.5 rounded-xl bg-[#1A1A1A] border border-[#2A2A2A] flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
              <div className="flex items-center gap-2 truncate">
                <Building2 className="w-4 h-4 text-[#5FB57A] shrink-0" />
                {!collapsed && (
                  <span className="text-xs font-bold text-white truncate">
                    {companyName}
                  </span>
                )}
              </div>
              {!collapsed && (
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-[#5FB57A] text-[#111111] uppercase font-mono">
                  {role}
                </span>
              )}
            </div>
          </div>

          {/* Nav Groups */}
          <nav className="p-2 space-y-4 overflow-y-auto max-h-[calc(100vh-210px)]">
            {NAV_GROUPS.map((group) => (
              <div key={group.title} className="space-y-1">
                {!collapsed && (
                  <div className="px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#8E8E8A]">
                    {group.title}
                  </div>
                )}
                {group.items.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-[#202020] text-white border-l-2 border-[#5FB57A] shadow-sm'
                          : 'text-[#8E8E8A] hover:text-white hover:bg-[#1A1A1A]'
                      } ${collapsed ? 'justify-center px-0' : ''}`
                    }
                    title={collapsed ? label : undefined}
                  >
                    <Icon className="w-4 h-4 shrink-0 text-[#5FB57A]" />
                    {!collapsed && <span>{label}</span>}
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>
        </div>

        {/* Bottom Sidebar Footer */}
        <div className="p-3 border-t border-[#262626] bg-[#0E0E0E]">
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
            {!collapsed && (
              <div className="truncate mr-2">
                <div className="text-xs font-bold text-white truncate">
                  {user?.full_name || user?.email?.split('@')[0] || 'User'}
                </div>
                <div className="text-[10.5px] text-[#8E8E8A] truncate">
                  {user?.email}
                </div>
              </div>
            )}

            <button
              onClick={logout}
              title="Sign Out"
              className="p-2 rounded-lg bg-[#1A1A1A] hover:bg-red-950/40 text-[#8E8E8A] hover:text-red-400 border border-[#2A2A2A] hover:border-red-800/50 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* ─── MAIN WORKSPACE CONTENT ────────────────────────────────── */}
      <div
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${
          collapsed ? 'lg:pl-18' : 'lg:pl-64'
        }`}
      >
        {/* Top Header Navbar */}
        <header className="h-16 bg-white border-b border-[#D8D8D5] sticky top-0 z-30 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Left: Mobile Toggle, Desktop Collapse & Breadcrumbs */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-lg border border-[#D8D8D5] text-[#111111]"
              aria-label="Open navigation"
            >
              <Menu className="w-4 h-4" />
            </button>

            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden lg:flex p-1.5 rounded-lg border border-[#D8D8D5] text-[#656565] hover:text-[#111111] hover:bg-[#F3F3F1] transition-colors"
              title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>

            {/* Breadcrumb Trail */}
            <div className="flex items-center gap-2 text-xs font-semibold">
              <span className="text-[#656565] hidden sm:inline">{companyName}</span>
              <span className="text-[#D8D8D5] hidden sm:inline">/</span>
              <span className="text-[#656565] hidden md:inline">{pageInfo.section}</span>
              <span className="text-[#D8D8D5] hidden md:inline">/</span>
              <span className="text-[#111111] font-bold">{pageInfo.title}</span>
            </div>
          </div>

          {/* Right: Engine Status, Actions & User Dropdown */}
          <div className="flex items-center gap-3">
            {/* Engine Status Pill */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border border-[#D8D8D5] bg-[#F3F3F1] text-[#111111]">
              <span
                className={`w-2 h-2 rounded-full ${
                  apiStatus === 'online' ? 'bg-[#5FB57A] animate-pulse' : 'bg-red-500'
                }`}
              />
              <span className="text-[11px] font-mono">
                {apiStatus === 'online' ? 'MODEL ONLINE' : 'OFFLINE'}
              </span>
            </div>

            {/* User Dropdown Menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 p-1.5 rounded-xl border border-[#D8D8D5] hover:bg-[#F3F3F1] transition-colors"
              >
                <div className="w-7 h-7 rounded-lg bg-[#111111] text-[#5FB57A] font-bold text-xs flex items-center justify-center font-display">
                  {user?.full_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <span className="text-xs font-bold text-[#111111] hidden md:inline max-w-[120px] truncate">
                  {user?.full_name || user?.email}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-[#656565]" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-[#D8D8D5] rounded-2xl shadow-xl p-2 z-50">
                  <div className="p-3 border-b border-[#D8D8D5] mb-1">
                    <div className="text-xs font-bold text-[#111111] truncate">{user?.full_name || 'User'}</div>
                    <div className="text-[11px] text-[#656565] truncate">{user?.email}</div>
                    <span className="mt-1.5 inline-block text-[10px] font-extrabold px-2 py-0.5 rounded bg-[#EBF7EF] text-[#1B5E34] border border-[#A6DCB8]">
                      Role: {role}
                    </span>
                  </div>

                  <Link
                    to="/settings"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-[#111111] hover:bg-[#F3F3F1] rounded-lg transition-colors"
                  >
                    <Settings className="w-3.5 h-3.5 text-[#656565]" />
                    <span>Workspace Settings</span>
                  </Link>

                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors text-left"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dynamic Workspace Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
