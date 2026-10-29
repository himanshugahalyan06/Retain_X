import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, Lock, Mail, Building2, User, ArrowRight, Sparkles, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const { login, signup, loading, authError, setAuthError } = useAuth();
  const [tab, setTab] = useState('login'); // 'login' or 'signup'

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (tab === 'login') {
      await login(email, password);
    } else {
      if (!companyName.trim()) {
        setAuthError('Company name is required for new workspace signup');
        return;
      }
      await signup({
        email,
        password,
        full_name: fullName,
        company_name: companyName,
      });
    }
  };

  const handleDemoLogin = async () => {
    setEmail('admin@churnguard.ai');
    setPassword('password123');
    await login('admin@churnguard.ai', 'password123');
  };

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 64px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
        background: 'linear-gradient(180deg, #F7F4EF 0%, #EAE4D9 100%)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          background: '#FFFFFF',
          borderRadius: 20,
          boxShadow: '0 20px 45px rgba(27, 67, 50, 0.08), 0 4px 12px rgba(15, 23, 42, 0.04)',
          border: '1px solid rgba(45, 106, 79, 0.15)',
          overflow: 'hidden',
        }}
      >
        {/* Header Banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)',
            padding: '32px 28px 24px',
            color: 'white',
            textAlign: 'center',
            position: 'relative',
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: 'rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 14px',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              boxShadow: '0 6px 16px rgba(0, 0, 0, 0.15)',
            }}
          >
            <ShieldAlert style={{ width: 28, height: 28, color: '#D8F3DC' }} />
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.02em', margin: 0 }}>
            RetainX <span style={{ color: '#52B788' }}>AI Platform</span>
          </h2>
          <p style={{ fontSize: 13, color: 'rgba(216, 243, 220, 0.85)', marginTop: 6, marginBottom: 0 }}>
            Multi-Tenant Enterprise Customer Retention Engine
          </p>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              marginTop: 14,
              background: 'rgba(0, 0, 0, 0.2)',
              padding: '4px 12px',
              borderRadius: 9999,
              fontSize: 11,
              fontWeight: 700,
              color: '#D8F3DC',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <Sparkles style={{ width: 12, height: 12, color: '#52B788' }} />
            Tenant-Isolated Data & In-Memory JWT Sessions
          </div>
        </div>

        {/* Tab Toggle */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid rgba(45, 106, 79, 0.12)',
            background: '#FAF8F5',
          }}
        >
          <button
            type="button"
            onClick={() => { setTab('login'); setAuthError(null); }}
            style={{
              flex: 1,
              padding: '14px 16px',
              fontSize: 14,
              fontWeight: 800,
              cursor: 'pointer',
              border: 'none',
              background: tab === 'login' ? '#FFFFFF' : 'transparent',
              color: tab === 'login' ? '#1B4332' : '#64748B',
              borderBottom: tab === 'login' ? '3px solid #2D6A4F' : '3px solid transparent',
              transition: 'all 0.2s',
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setTab('signup'); setAuthError(null); }}
            style={{
              flex: 1,
              padding: '14px 16px',
              fontSize: 14,
              fontWeight: 800,
              cursor: 'pointer',
              border: 'none',
              background: tab === 'signup' ? '#FFFFFF' : 'transparent',
              color: tab === 'signup' ? '#1B4332' : '#64748B',
              borderBottom: tab === 'signup' ? '3px solid #2D6A4F' : '3px solid transparent',
              transition: 'all 0.2s',
            }}
          >
            Create SaaS Workspace
          </button>
        </div>

        {/* Form Body */}
        <div style={{ padding: '28px 28px 32px' }}>
          {authError && (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                background: '#FEF2F2',
                border: '1px solid #FCA5A5',
                color: '#991B1B',
                padding: '12px 14px',
                borderRadius: 10,
                fontSize: 13,
                marginBottom: 20,
              }}
            >
              <AlertCircle style={{ width: 18, height: 18, flexShrink: 0, marginTop: 1 }} />
              <div>{authError}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {tab === 'signup' && (
              <>
                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    Company / Organization Name
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Building2 style={{ position: 'absolute', left: 12, top: 11, width: 16, height: 16, color: '#64748B' }} />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Acme SaaS Inc"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px 10px 38px',
                        borderRadius: 10,
                        border: '1px solid #CBD5E1',
                        fontSize: 14,
                        color: '#0F172A',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    Full Name
                  </label>
                  <div style={{ position: 'relative' }}>
                    <User style={{ position: 'absolute', left: 12, top: 11, width: 16, height: 16, color: '#64748B' }} />
                    <input
                      type="text"
                      placeholder="e.g. Alex Morgan"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px 10px 38px',
                        borderRadius: 10,
                        border: '1px solid #CBD5E1',
                        fontSize: 14,
                        color: '#0F172A',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                Work Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail style={{ position: 'absolute', left: 12, top: 11, width: 16, height: 16, color: '#64748B' }} />
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 38px',
                    borderRadius: 10,
                    border: '1px solid #CBD5E1',
                    fontSize: 14,
                    color: '#0F172A',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock style={{ position: 'absolute', left: 12, top: 11, width: 16, height: 16, color: '#64748B' }} />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 38px',
                    borderRadius: 10,
                    border: '1px solid #CBD5E1',
                    fontSize: 14,
                    color: '#0F172A',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 8,
                padding: '12px 20px',
                borderRadius: 10,
                background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)',
                color: 'white',
                border: 'none',
                fontWeight: 800,
                fontSize: 14,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: '0 4px 14px rgba(27, 67, 50, 0.3)',
                transition: 'transform 0.15s ease',
              }}
            >
              {loading ? (
                <>
                  <Loader2 style={{ width: 18, height: 18, animation: 'spin 1s linear infinite' }} />
                  {tab === 'login' ? 'Authenticating...' : 'Creating Workspace...'}
                </>
              ) : (
                <>
                  {tab === 'login' ? 'Sign In to Workspace' : 'Launch Workspace'}
                  <ArrowRight style={{ width: 16, height: 16 }} />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Login Option */}
          {tab === 'login' && (
            <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px dashed #CBD5E1', textAlign: 'center' }}>
              <p style={{ fontSize: 12, color: '#64748B', marginBottom: 10 }}>
                Testing or evaluating the multi-tenant system?
              </p>
              <button
                type="button"
                onClick={handleDemoLogin}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  borderRadius: 10,
                  background: '#D8F3DC',
                  border: '1px solid rgba(45, 106, 79, 0.3)',
                  color: '#1B4332',
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  transition: 'background 0.2s',
                }}
              >
                <Sparkles style={{ width: 15, height: 15, color: '#2D6A4F' }} />
                ⚡ One-Click Demo: Acme Corp Admin
              </button>
            </div>
          )}

          {/* Security details footer */}
          <div
            style={{
              marginTop: 20,
              padding: '10px 12px',
              borderRadius: 8,
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              fontSize: 11.5,
              color: '#64748B',
              lineHeight: 1.4,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <CheckCircle2 style={{ width: 16, height: 16, color: '#2D6A4F', flexShrink: 0 }} />
            <span>
              <strong>Security Protocol:</strong> JWT credentials are kept strictly in-memory (XSS immune) and tenant data queries enforce <code style={{ color: '#1B4332' }}>company_id</code> scope.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
