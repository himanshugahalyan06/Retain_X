import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { ShieldAlert, Building2, Lock, User, ArrowRight, CheckCircle2, AlertCircle, Loader2, Eye, EyeOff, Check, X } from 'lucide-react';
import { verifyInvitationApi, acceptInvitationApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function AcceptInvitePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';
  const { saveTokens, refreshUser } = useAuth();

  const [invitation, setInvitation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Password strength validation criteria
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumberOrSymbol = /[\d\W]/.test(password);
  const strengthScore = [hasMinLength, hasUppercase, hasLowercase, hasNumberOrSymbol].filter(Boolean).length;

  useEffect(() => {
    if (!token) {
      setError('No invitation token was provided in the URL.');
      setLoading(false);
      return;
    }

    const verify = async () => {
      try {
        const res = await verifyInvitationApi(token);
        setInvitation(res.data);
      } catch (err) {
        setError(err.response?.data?.detail || 'This invitation link is invalid or has expired.');
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (strengthScore < 4) {
      setError('Password must satisfy all 4 criteria: 8+ chars, uppercase, lowercase, and number/symbol.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await acceptInvitationApi({
        token,
        full_name: fullName,
        password,
      });

      const { access_token, refresh_token } = res.data;
      saveTokens(access_token, refresh_token);
      await refreshUser();
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to accept invitation. Please try again.');
    } finally {
      setSubmitting(false);
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
          Join Your Organization
        </h2>
        <p className="mt-1.5 text-sm text-[#656565]">
          Secure onboarding invitation to collaborate on customer retention.
        </p>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md bg-white border border-[#D8D8D5] rounded-2xl shadow-xl overflow-hidden p-7 sm:p-8">
        {loading && (
          <div className="py-8 space-y-3 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#5FB57A] mx-auto" />
            <p className="text-sm font-semibold text-[#111111]">Verifying invitation authorization...</p>
          </div>
        )}

        {!loading && error && (
          <div className="space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#111111]">Invitation Error</h3>
              <p className="mt-1.5 text-xs text-red-600">{error}</p>
            </div>
            <div className="pt-2">
              <Link to="/login" className="btn-secondary py-2 px-4 text-xs">
                Go to Sign In
              </Link>
            </div>
          </div>
        )}

        {!loading && invitation && !error && (
          <div>
            {/* Invitation Details Banner */}
            <div className="mb-5 p-3.5 rounded-xl bg-[#F3F3F1] border border-[#D8D8D5]">
              <div className="flex items-center gap-2.5 text-xs text-[#111111] font-semibold">
                <Building2 className="w-4 h-4 text-[#5FB57A]" />
                <span>
                  Organization: <strong>{invitation.company_name}</strong>
                </span>
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[11.5px] text-[#656565]">
                <span>Email: {invitation.email}</span>
                <span className="font-bold text-[#111111] bg-white px-2 py-0.5 rounded border border-[#D8D8D5]">
                  Role: {invitation.role}
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="form-label">Your Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-[#8E8E8A]" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Robin Banks"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="form-input pl-9"
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Set Your Password</label>
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

              <button
                type="submit"
                disabled={submitting}
                className="w-full btn-ink py-3 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#5FB57A]" />
                    <span>Joining Workspace...</span>
                  </>
                ) : (
                  <>
                    <span>Accept Invitation & Join</span>
                    <ArrowRight className="w-4 h-4 text-[#5FB57A]" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
