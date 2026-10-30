import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ShieldAlert, CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { verifyEmailConfirmApi, verifyEmailRequestApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { user, isVerified, refreshUser } = useAuth();

  const [loading, setLoading] = useState(!!token);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [resending, setResending] = useState(false);
  const [resendStatus, setResendStatus] = useState(null);

  useEffect(() => {
    if (!token) return;

    const verify = async () => {
      try {
        await verifyEmailConfirmApi({ token });
        setSuccess(true);
        if (refreshUser) refreshUser();
      } catch (err) {
        setError(err.response?.data?.detail || 'Email verification link is invalid or has expired.');
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, [token, refreshUser]);

  const handleResend = async () => {
    if (!user?.email) return;
    setResending(true);
    setResendStatus(null);
    try {
      await verifyEmailRequestApi({ email: user.email });
      setResendStatus('A new verification email has been sent to your address.');
    } catch (err) {
      setResendStatus(err.response?.data?.detail || 'Failed to send verification email. Please try again later.');
    } finally {
      setResending(false);
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
          Email Verification
        </h2>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md bg-white border border-[#D8D8D5] rounded-2xl shadow-xl overflow-hidden p-7 sm:p-8 text-center">
        {loading && (
          <div className="py-8 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#5FB57A] mx-auto" />
            <p className="text-sm font-semibold text-[#111111]">Verifying your email address...</p>
          </div>
        )}

        {!loading && success && (
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-[#5FB57A] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#111111]">Email Verified Successfully</h3>
              <p className="mt-1.5 text-xs text-[#656565]">
                Your email has been confirmed. Your account now has full verified access to organization features.
              </p>
            </div>
            <div className="pt-3">
              <Link to="/dashboard" className="w-full btn-ink py-2.5 flex items-center justify-center gap-2 text-xs">
                <span>Go to Workspace</span>
                <ArrowRight className="w-4 h-4 text-[#5FB57A]" />
              </Link>
            </div>
          </div>
        )}

        {!loading && error && (
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#111111]">Verification Failed</h3>
              <p className="mt-1.5 text-xs text-red-600">{error}</p>
            </div>
            <div className="pt-2">
              <Link to="/login" className="btn-secondary py-2 px-4 text-xs">
                Back to Sign In
              </Link>
            </div>
          </div>
        )}

        {!token && (
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#111111]">
                {isVerified ? 'Email Already Verified' : 'Email Verification Required'}
              </h3>
              <p className="mt-1.5 text-xs text-[#656565] leading-relaxed">
                {isVerified
                  ? 'Your account email address is already verified and in good standing.'
                  : 'Please click the link in the email sent to your address to activate full organization capabilities.'}
              </p>
            </div>

            {user?.email && !isVerified && (
              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending}
                  className="w-full btn-primary py-2.5 text-xs flex items-center justify-center gap-2"
                >
                  {resending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Resend Verification Link</span>
                </button>
                {resendStatus && (
                  <p className="text-[11px] text-[#656565]">{resendStatus}</p>
                )}
              </div>
            )}

            <div className="pt-2 border-t border-[#D8D8D5]">
              <Link to="/dashboard" className="text-xs font-semibold text-[#5FB57A] hover:underline">
                Return to Workspace
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
