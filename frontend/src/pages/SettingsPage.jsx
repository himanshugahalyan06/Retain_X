import React, { useState, useEffect } from 'react';
import { Settings, Save, RefreshCw, Scale, ShieldCheck, Bell, Building2, User, Key, CheckCircle2, AlertCircle } from 'lucide-react';
import { getSettings, saveSettings, recalculateThreshold } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function SettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState({
    false_positive_cost: 500.0,
    false_negative_cost: 5000.0,
    default_gross_margin: 0.65,
    expected_lifetime_m2m: 12,
    expected_lifetime_one_year: 24,
    expected_lifetime_two_year: 36,
    min_roi_threshold: 0.2,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [recalibrating, setRecalibrating] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const res = await getSettings();
        if (res.data) setSettings(res.data);
      } catch (err) {
        console.error('Settings load error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleChange = (field, value) => {
    setSettings((prev) => ({
      ...prev,
      [field]: parseFloat(value) || value,
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await saveSettings(settings);
      setMessage({ type: 'success', text: 'Settings successfully updated.' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to update settings.' });
    } finally {
      setSaving(false);
    }
  };

  const handleRecalibrate = async () => {
    setRecalibrating(true);
    setMessage(null);
    try {
      const res = await recalculateThreshold();
      setMessage({
        type: 'success',
        text: `Threshold recalibrated successfully: ${res.data?.optimal_threshold || 0.42}`,
      });
    } catch (err) {
      setMessage({ type: 'error', text: 'Threshold recalibration failed.' });
    } finally {
      setRecalibrating(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>
          Workspace & Economic Settings
        </h1>
        <p style={{ fontSize: 13, color: '#64748B', marginTop: 3, marginBottom: 0 }}>
          Configure business economics, loss-matrix penalty ratios, and automated alert policies.
        </p>
      </div>

      {message && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 8,
            marginBottom: 20,
            fontSize: 13,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: message.type === 'success' ? '#ECFDF5' : '#FEF2F2',
            border: `1px solid ${message.type === 'success' ? '#A7F3D0' : '#FECACA'}`,
            color: message.type === 'success' ? '#065F46' : '#991B1B',
          }}
        >
          {message.type === 'success' ? <CheckCircle2 style={{ width: 16, height: 16 }} /> : <AlertCircle style={{ width: 16, height: 16 }} />}
          {message.text}
        </div>
      )}

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Economic Loss Matrix Card */}
        <div className="saas-card">
          <div className="saas-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Scale style={{ width: 18, height: 18, color: '#2563EB' }} />
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>
                Cost-Sensitive Loss Matrix
              </h3>
            </div>
            <button
              type="button"
              onClick={handleRecalibrate}
              disabled={recalibrating}
              style={{
                background: '#EFF6FF',
                border: '1px solid #BFDBFE',
                color: '#1D4ED8',
                padding: '6px 12px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <RefreshCw style={{ width: 13, height: 13, animation: recalibrating ? 'spin 1s linear infinite' : 'none' }} />
              Recalibrate Optimal Cutoff
            </button>
          </div>

          <div className="saas-card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            <div>
              <label className="form-label">False Positive Cost ($)</label>
              <input
                type="number"
                value={settings.false_positive_cost}
                onChange={(e) => handleChange('false_positive_cost', e.target.value)}
                className="form-input"
              />
              <span style={{ fontSize: 11, color: '#94A3B8' }}>Cost of wasted retention incentive on loyal customer</span>
            </div>

            <div>
              <label className="form-label">False Negative Cost ($)</label>
              <input
                type="number"
                value={settings.false_negative_cost}
                onChange={(e) => handleChange('false_negative_cost', e.target.value)}
                className="form-input"
              />
              <span style={{ fontSize: 11, color: '#94A3B8' }}>Financial penalty of lost customer lifetime value (CLV)</span>
            </div>

            <div>
              <label className="form-label">Default Gross Margin (0.0 - 1.0)</label>
              <input
                type="number"
                step="0.05"
                min="0"
                max="1"
                value={settings.default_gross_margin}
                onChange={(e) => handleChange('default_gross_margin', e.target.value)}
                className="form-input"
              />
              <span style={{ fontSize: 11, color: '#94A3B8' }}>Margin multiplier applied to CLV calculations</span>
            </div>

            <div>
              <label className="form-label">Minimum Intervention ROI</label>
              <input
                type="number"
                step="0.05"
                value={settings.min_roi_threshold}
                onChange={(e) => handleChange('min_roi_threshold', e.target.value)}
                className="form-input"
              />
              <span style={{ fontSize: 11, color: '#94A3B8' }}>Minimum expected return to trigger automated offer</span>
            </div>
          </div>
        </div>

        {/* Tenant Information Card */}
        <div className="saas-card">
          <div className="saas-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Building2 style={{ width: 18, height: 18, color: '#64748B' }} />
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>
                Tenant Organization & Authentication
              </h3>
            </div>
          </div>

          <div className="saas-card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            <div>
              <label className="form-label">Organization Name</label>
              <input type="text" readOnly value={user?.company?.name || 'Acme Corp'} className="form-input" style={{ background: '#F8FAFC' }} />
            </div>

            <div>
              <label className="form-label">Active User Account</label>
              <input type="text" readOnly value={user?.email || 'admin@churnguard.ai'} className="form-input" style={{ background: '#F8FAFC' }} />
            </div>

            <div>
              <label className="form-label">Security Protocol</label>
              <input type="text" readOnly value="JWT In-Memory State (Tenant Scoped)" className="form-input" style={{ background: '#F8FAFC' }} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" disabled={saving} className="btn-primary" style={{ padding: '10px 24px' }}>
            <Save style={{ width: 15, height: 15 }} />
            {saving ? 'Saving...' : 'Save Workspace Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
