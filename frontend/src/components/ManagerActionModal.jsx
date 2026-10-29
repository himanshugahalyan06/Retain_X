import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, RefreshCw, AlertCircle, UserCheck } from 'lucide-react';
import { approveDecision, rejectDecision, overrideDecision, getInterventions } from '../lib/api';

const DEFAULT_INTERVENTIONS = [
  { id: 1, name: '15% Retention Discount', cost: 2000 },
  { id: 2, name: 'Free Technical Support', cost: 500 },
  { id: 3, name: 'Premium Plan Upgrade', cost: 1000 },
  { id: 4, name: 'Loyalty VIP Reward', cost: 800 },
  { id: 5, name: 'Senior CS Agent Escalation', cost: 1200 },
  { id: 6, name: 'Annual Plan Migration Offer', cost: 1500 },
];

export default function ManagerActionModal({ decision, interventions = [], onClose, onSuccess }) {
  const [mode, setMode] = useState('APPROVE'); // APPROVE | REJECT | OVERRIDE
  const [userName, setUserName] = useState('Retention Manager');
  const [reason, setReason] = useState('');
  const [availableInterventions, setAvailableInterventions] = useState(interventions.length > 0 ? interventions : DEFAULT_INTERVENTIONS);
  const [selectedIntervention, setSelectedIntervention] = useState(availableInterventions[0]?.name || '15% Retention Discount');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (interventions && interventions.length > 0) {
      setAvailableInterventions(interventions);
      setSelectedIntervention(interventions[0]?.name || '');
    } else {
      getInterventions()
        .then((res) => {
          const list = res.data || res || [];
          if (Array.isArray(list) && list.length > 0) {
            setAvailableInterventions(list);
            setSelectedIntervention(list[0]?.name || '');
          }
        })
        .catch(() => {
          setAvailableInterventions(DEFAULT_INTERVENTIONS);
        });
    }
  }, [interventions]);

  if (!decision) return null;

  const decisionId = decision.id || decision.decision_id || 1;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (mode === 'OVERRIDE') {
      if (!reason || reason.trim().length < 5) {
        setError('A valid override reason (at least 5 characters) is required when overriding AI recommendations.');
        return;
      }
      if (!selectedIntervention) {
        setError('Please select an alternative intervention.');
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === 'APPROVE') {
        await approveDecision(decisionId, { user_name: userName });
      } else if (mode === 'REJECT') {
        await rejectDecision(decisionId, { user_name: userName, override_reason: reason });
      } else if (mode === 'OVERRIDE') {
        await overrideDecision(decisionId, {
          user_name: userName,
          new_intervention_name: selectedIntervention,
          override_reason: reason,
        });
      }
      if (onSuccess) onSuccess();
      if (onClose) onClose();
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Manager action failed. Check backend logs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          maxWidth: '540px',
          width: '100%',
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
          border: '1px solid #E2E8F0',
          overflow: 'hidden',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '20px 24px',
            background: 'linear-gradient(135deg, #0F172A, #1E293B)',
            color: '#FFFFFF',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                background: '#2563EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <UserCheck style={{ width: 18, height: 18, color: '#FFFFFF' }} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800 }}>Manager Decision Audit</h3>
              <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: '#94A3B8' }}>
                Account: <strong style={{ color: '#FFFFFF' }}>{decision.customer_id || `ID #${decisionId}`}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#FFF', fontSize: '22px', cursor: 'pointer' }}
          >
            ×
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {error && (
            <div
              style={{
                padding: '12px 14px',
                marginBottom: '16px',
                borderRadius: '8px',
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#991B1B',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertCircle style={{ width: 16, height: 16, flexShrink: 0 }} />
              {error}
            </div>
          )}

          {/* AI Recommendation Summary Box */}
          <div
            style={{
              padding: '14px 16px',
              borderRadius: '10px',
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              marginBottom: '20px',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Current AI Recommendation
            </div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>
              {decision.recommended_action || '15% Retention Discount'}
            </div>
            <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px' }}>
              Expected Net Value: <strong>${Number(decision.expected_net_value || 0).toLocaleString()}</strong> | ROI: <strong>{(Number(decision.roi || 0) * 100).toFixed(1)}%</strong>
            </div>
          </div>

          {/* Workflow Action Mode Selector */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '20px' }}>
            <button
              type="button"
              onClick={() => setMode('APPROVE')}
              style={{
                padding: '10px 8px',
                borderRadius: '8px',
                fontSize: '12.5px',
                fontWeight: 700,
                border: mode === 'APPROVE' ? '2px solid #059669' : '1px solid #E2E8F0',
                background: mode === 'APPROVE' ? '#ECFDF5' : '#FFF',
                color: mode === 'APPROVE' ? '#065F46' : '#64748B',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <CheckCircle2 style={{ width: 18, height: 18, color: mode === 'APPROVE' ? '#059669' : '#94A3B8' }} />
              Approve AI
            </button>

            <button
              type="button"
              onClick={() => setMode('OVERRIDE')}
              style={{
                padding: '10px 8px',
                borderRadius: '8px',
                fontSize: '12.5px',
                fontWeight: 700,
                border: mode === 'OVERRIDE' ? '2px solid #D97706' : '1px solid #E2E8F0',
                background: mode === 'OVERRIDE' ? '#FFFBEB' : '#FFF',
                color: mode === 'OVERRIDE' ? '#92400E' : '#64748B',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <RefreshCw style={{ width: 18, height: 18, color: mode === 'OVERRIDE' ? '#D97706' : '#94A3B8' }} />
              Override Action
            </button>

            <button
              type="button"
              onClick={() => setMode('REJECT')}
              style={{
                padding: '10px 8px',
                borderRadius: '8px',
                fontSize: '12.5px',
                fontWeight: 700,
                border: mode === 'REJECT' ? '2px solid #DC2626' : '1px solid #E2E8F0',
                background: mode === 'REJECT' ? '#FEF2F2' : '#FFF',
                color: mode === 'REJECT' ? '#991B1B' : '#64748B',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <XCircle style={{ width: 18, height: 18, color: mode === 'REJECT' ? '#DC2626' : '#94A3B8' }} />
              Reject Action
            </button>
          </div>

          {/* User Name Input */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              Manager Name / ID
            </label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="form-input"
              required
            />
          </div>

          {/* Override Select Box */}
          {mode === 'OVERRIDE' && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Select Alternative Intervention *
              </label>
              <select
                value={selectedIntervention}
                onChange={(e) => setSelectedIntervention(e.target.value)}
                className="form-input"
                required
              >
                {availableInterventions.map((inter) => (
                  <option key={inter.id || inter.name} value={inter.name}>
                    {inter.name} (Cost: ${Number(inter.cost || 0).toLocaleString()})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Override / Rejection Reason Textarea */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              {mode === 'OVERRIDE' ? 'Override Justification (Required) *' : 'Audit Notes / Reason (Optional)'}
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={mode === 'OVERRIDE' ? 'Enter detailed operational justification for overriding AI recommendation...' : 'Optional manager audit notes...'}
              className="form-input"
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{
                background: mode === 'APPROVE' ? '#059669' : mode === 'OVERRIDE' ? '#D97706' : '#DC2626',
                borderColor: mode === 'APPROVE' ? '#059669' : mode === 'OVERRIDE' ? '#D97706' : '#DC2626',
              }}
            >
              {loading ? 'Submitting...' : `Confirm ${mode === 'APPROVE' ? 'Approval' : mode === 'OVERRIDE' ? 'Override' : 'Rejection'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
