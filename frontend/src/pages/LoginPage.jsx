import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  ShieldAlert,
  Lock,
  Mail,
  Building2,
  User,
  ArrowRight,
  Eye,
  EyeOff,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Check,
  X
} from 'lucide-react';

export default function LoginPage() {
  const { login, signup, loading, authError, setAuthError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [tab, setTab] = useState(location.pathname === '/signup' ? 'signup' : 'login');

  useEffect(() => {
    if (location.pathname === '/signup') {
      setTab('signup');
    } else if (location.pathname === '/login') {
      setTab('login');
    }
  }, [location.pathname]);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');

  // Password strength validation criteria
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumberOrSymbol = /[\d\W]/.test(password);
  const strengthScore = [hasMinLength, hasUppercase, hasLowercase, hasNumberOrSymbol].filter(Boolean).length;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMessage('');

    if (tab === 'login') {
      const res = await login(email, password);
      if (res.success) {
        navigate('/dashboard');
      }
    } else {
      if (!companyName.trim()) {
        setAuthError('Organization name is required to establish a secure tenant workspace.');
        return;
      }
      if (strengthScore < 4) {
        setAuthError('Password must meet all 4 security criteria: 8+ chars, uppercase, lowercase, and number/symbol.');
        return;
      }
      if (password !== confirmPassword) {
        setAuthError('Passwords do not match. Please re-enter.');
        return;
      }
      if (!acceptTerms) {
        setAuthError('You must accept the terms of service and privacy policy to register.');
        return;
      }

      const res = await signup({
        email,
        password,
        full_name: fullName,
        company_name: companyName,
      });

      if (res.success) {
        navigate('/dashboard');
      }
    }
  };

  const handleQuickRole = (roleEmail, rolePass) => {
    setEmail(roleEmail);
    setPassword(rolePass);
    setAuthError(null);
  };

  return (
    <div className="min-h-screen bg-[#EBEBEA] flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <Link to="/" className="inline-flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-[#111111] flex items-center justify-center text-[#5FB57A] shadow-md group-hover:scale-105 transition-transform">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <span className="font-display text-2xl tracking-tight text-[#111111]">
            RETAIN<span className="text-[#5FB57A]">X</span>
          </span>
        </Link>
        <p className="mt-2 text-sm text-[#656565] font-medium">
          Enterprise AI Customer Retention & Risk Intelligence Platform
        </p>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md bg-white border border-[#D8D8D5] rounded-2xl shadow-xl overflow-hidden">
        {/* Tab Header */}
        <div className="grid grid-cols-2 border-b border-[#D8D8D5] bg-[#F3F3F1]">
          <button
            type="button"
            onClick={() => {
              setTab('login');
              setAuthError(null);
            }}
            className={`py-3.5 text-sm font-bold transition-all ${
              tab === 'login'
                ? 'bg-white text-[#111111] border-b-2 border-[#111111]'
                : 'text-[#656565] hover:text-[#111111]'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('signup');
              setAuthError(null);
            }}
            className={`py-3.5 text-sm font-bold transition-all ${
              tab === 'signup'
                ? 'bg-white text-[#111111] border-b-2 border-[#111111]'
                : 'text-[#656565] hover:text-[#111111]'
            }`}
          >
            Create Organization
          </button>
        </div>

        <div className="p-7 sm:p-8">
          {authError && (
            <div className="mb-5 flex items-start gap-3 p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs font-medium">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>{authError}</div>
            </div>
          )}

          {successMessage && (
            <div className="mb-5 flex items-start gap-3 p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>{successMessage}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === 'signup' && (
              <>
                <div>
                  <label className="form-label">Organization Name</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-2.5 w-4 h-4 text-[#8E8E8A]" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Acme Corporation"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="form-input pl-9"
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-[#8E8E8A]">
                    Creates a dedicated, tenant-isolated workspace. First user is granted Admin role.
                  </p>
                </div>

                <div>
                  <label className="form-label">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 w-4 h-4 text-[#8E8E8A]" />
                    <input
                      type="text"
                      placeholder="e.g. Jordan Lee"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="form-input pl-9"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="form-label">Work Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-[#8E8E8A]" />
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input pl-9"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="form-label mb-0">Password</label>
                {tab === 'login' && (
                  <Link
                    to="/forgot-password"
                    className="text-xs font-semibold text-[#5FB57A] hover:underline"
                  >
                    Forgot password?
                  </Link>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 w-4 h-4 text-[#8E8E8A]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input pl-9 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-[#8E8E8A] hover:text-[#111111]"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password strength meter for signup */}
              {tab === 'signup' && password.length > 0 && (
                <div className="mt-2.5 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <div
                      className={`h-1.5 flex-1 rounded-full transition-all ${
                        strengthScore >= 1 ? 'bg-red-500' : 'bg-gray-200'
                      }`}
                    />
                    <div
                      className={`h-1.5 flex-1 rounded-full transition-all ${
                        strengthScore >= 2 ? 'bg-amber-500' : 'bg-gray-200'
                      }`}
                    />
                    <div
                      className={`h-1.5 flex-1 rounded-full transition-all ${
                        strengthScore >= 3 ? 'bg-emerald-500' : 'bg-gray-200'
                      }`}
                    />
                    <div
                      className={`h-1.5 flex-1 rounded-full transition-all ${
                        strengthScore >= 4 ? 'bg-[#5FB57A]' : 'bg-gray-200'
                      }`}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[11px] text-[#656565]">
                    <div className="flex items-center gap-1">
                      {hasMinLength ? <Check className="w-3 h-3 text-emerald-600" /> : <X className="w-3 h-3 text-gray-400" />}
                      <span>8+ characters</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {hasUppercase ? <Check className="w-3 h-3 text-emerald-600" /> : <X className="w-3 h-3 text-gray-400" />}
                      <span>Uppercase letter</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {hasLowercase ? <Check className="w-3 h-3 text-emerald-600" /> : <X className="w-3 h-3 text-gray-400" />}
                      <span>Lowercase letter</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {hasNumberOrSymbol ? <Check className="w-3 h-3 text-emerald-600" /> : <X className="w-3 h-3 text-gray-400" />}
                      <span>Number or symbol</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {tab === 'signup' && (
              <div>
                <label className="form-label">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-4 h-4 text-[#8E8E8A]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="form-input pl-9"
                  />
                </div>
              </div>
            )}

            {tab === 'signup' && (
              <div className="flex items-start gap-2 pt-1">
                <input
                  type="checkbox"
                  id="acceptTerms"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="mt-0.5 rounded border-[#D8D8D5] text-[#5FB57A] focus:ring-[#5FB57A]"
                />
                <label htmlFor="acceptTerms" className="text-xs text-[#656565] leading-snug">
                  I agree to the Enterprise Service Agreement, Data Privacy Policy, and Tenant Isolation protocols.
                </label>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-ink mt-2 py-3 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#5FB57A]" />
                  <span>{tab === 'login' ? 'Authenticating...' : 'Initializing Workspace...'}</span>
                </>
              ) : (
                <>
                  <span>{tab === 'login' ? 'Sign In to Workspace' : 'Create Organization Workspace'}</span>
                  <ArrowRight className="w-4 h-4 text-[#5FB57A]" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials Switcher */}
          {tab === 'login' && (
            <div className="mt-6 pt-5 border-t border-[#D8D8D5]">
              <div className="flex items-center gap-1.5 mb-2.5 text-xs font-bold text-[#111111] uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-[#5FB57A]" />
                <span>Instant Demo Accounts (RBAC)</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickRole('admin@retainx.ai', 'password123')}
                  className="px-2 py-1.5 bg-[#F3F3F1] hover:bg-[#EBEBEA] border border-[#D8D8D5] rounded-lg text-xs font-semibold text-[#111111] transition-colors text-center"
                >
                  👑 Admin
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickRole('manager@retainx.ai', 'password123')}
                  className="px-2 py-1.5 bg-[#F3F3F1] hover:bg-[#EBEBEA] border border-[#D8D8D5] rounded-lg text-xs font-semibold text-[#111111] transition-colors text-center"
                >
                  ⚡ Manager
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickRole('analyst@retainx.ai', 'password123')}
                  className="px-2 py-1.5 bg-[#F3F3F1] hover:bg-[#EBEBEA] border border-[#D8D8D5] rounded-lg text-xs font-semibold text-[#111111] transition-colors text-center"
                >
                  📊 Analyst
                </button>
              </div>
              <p className="mt-2 text-[11px] text-[#8E8E8A] text-center">
                Click any role above to pre-fill verified demo credentials.
              </p>
            </div>
          )}

          {/* Security & Isolation Footnote */}
          <div className="mt-5 p-3 rounded-xl bg-[#F3F3F1] border border-[#D8D8D5] text-[11.5px] text-[#656565] flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-[#5FB57A] shrink-0" />
            <span>
              Tenant queries strictly isolated by verified organization identity. Refresh tokens cryptographically rotated.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
