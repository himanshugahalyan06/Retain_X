import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { ShieldAlert, Lock, ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, Loader2, Eye, EyeOff, Check, X } from 'lucide-react';
import { resetPasswordApi } from '../lib/api';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tokenFromUrl = searchParams.get('token') || '';

  const [token, setToken] = useState(tokenFromUrl);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
    }
  }, [tokenFromUrl]);

  // Password strength validation criteria
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumberOrSymbol = /[\d\W]/.test(password);
  const strengthScore = [hasMinLength, hasUppercase, hasLowercase, hasNumberOrSymbol].filter(Boolean).length;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!token.trim()) {
      setError('A valid password reset token is required.');
      return;
    }
    if (strengthScore < 4) {
      setError('Password must satisfy all 4 criteria: 8+ chars, uppercase, lowercase, and number/symbol.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await resetPasswordApi({ token, new_password: password });
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 2500);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to reset password. The token may be expired or already used.');
    } finally {
      setLoading(false);
    }
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
            CHURN<span className="text-[#5FB57A]">GUARD</span>
          </span>
        </Link>
        <h2 className="mt-4 text-2xl font-black tracking-tight text-[#111111]">
          Set a new password
        </h2>
        <p className="mt-1.5 text-sm text-[#656565]">
          Your new password must meet enterprise security complexity requirements.
        </p>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md bg-white border border-[#D8D8D5] rounded-2xl shadow-xl overflow-hidden p-7 sm:p-8">
        {error && (
          <div className="mb-5 flex items-start gap-3 p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs font-medium">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>{error}</div>
          </div>
        )}

        {success ? (
          <div className="text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-[#5FB57A] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#111111]">Password updated!</h3>
              <p className="mt-1.5 text-xs text-[#656565]">
                Your password has been successfully reset and previous sessions invalidated. Redirecting you to sign in...
              </p>
            </div>
            <div className="pt-2">
              <Link to="/login" className="btn-ink py-2.5 px-6 inline-flex items-center gap-2 text-xs">
                <span>Sign In Now</span>
                <ArrowRight className="w-4 h-4 text-[#5FB57A]" />
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {!tokenFromUrl && (
              <div>
                <label className="form-label">Reset Token</label>
                <input
                  type="text"
                  required
                  placeholder="Paste token from recovery email"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="form-input font-mono text-xs"
                />
              </div>
            )}

            <div>
              <label className="form-label">New Password</label>
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

              {password.length > 0 && (
                <div className="mt-2.5 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className={`h-1.5 flex-1 rounded-full transition-all ${strengthScore >= 1 ? 'bg-red-500' : 'bg-gray-200'}`} />
                    <div className={`h-1.5 flex-1 rounded-full transition-all ${strengthScore >= 2 ? 'bg-amber-500' : 'bg-gray-200'}`} />
                    <div className={`h-1.5 flex-1 rounded-full transition-all ${strengthScore >= 3 ? 'bg-emerald-500' : 'bg-gray-200'}`} />
                    <div className={`h-1.5 flex-1 rounded-full transition-all ${strengthScore >= 4 ? 'bg-[#5FB57A]' : 'bg-gray-200'}`} />
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

            <div>
              <label className="form-label">Confirm New Password</label>
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

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-ink py-3 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#5FB57A]" />
                  <span>Updating Password...</span>
                </>
              ) : (
                <>
                  <span>Save New Password</span>
                  <ArrowRight className="w-4 h-4 text-[#5FB57A]" />
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#656565] hover:text-[#111111] transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to sign in
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
