import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, Mail, ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { forgotPasswordApi } from '../lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [debugToken, setDebugToken] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await forgotPasswordApi({ email });
      setSubmitted(true);
      // For development/demo environment if returned
      if (res.data?.reset_token) {
        setDebugToken(res.data.reset_token);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'An unexpected error occurred. Please try again.');
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
          Reset your password
        </h2>
        <p className="mt-1.5 text-sm text-[#656565]">
          Enter your verified work email address to receive password recovery instructions.
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

        {submitted ? (
          <div className="text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6 text-[#5FB57A]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#111111]">Check your inbox</h3>
              <p className="mt-1.5 text-xs text-[#656565] leading-relaxed">
                If an account exists with <strong className="text-[#111111]">{email}</strong>, a single-use secure reset link has been dispatched. For security reasons, tokens expire in 60 minutes.
              </p>
            </div>

            {debugToken && (
              <div className="mt-4 p-3 bg-[#F3F3F1] border border-[#D8D8D5] rounded-lg text-left">
                <span className="text-[11px] font-bold text-[#111111] uppercase tracking-wider block mb-1">
                  Development Mode Reset Token:
                </span>
                <Link
                  to={`/reset-password?token=${debugToken}`}
                  className="text-xs font-semibold text-[#5FB57A] hover:underline break-all"
                >
                  Click to proceed with token: {debugToken.slice(0, 16)}...
                </Link>
              </div>
            )}

            <div className="pt-4 border-t border-[#D8D8D5]">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#111111] hover:text-[#5FB57A] transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Return to sign in
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
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

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-ink py-3 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#5FB57A]" />
                  <span>Sending reset token...</span>
                </>
              ) : (
                <>
                  <span>Send Recovery Instructions</span>
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
                Remembered password? Sign in
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
