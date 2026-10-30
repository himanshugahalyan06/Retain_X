import React, { useState, useEffect } from 'react';
import {
  Zap,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpRight,
  Filter,
  Search,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  RefreshCw,
  SlidersHorizontal
} from 'lucide-react';
import { getRetentionQueue, approveDecision, rejectDecision, getRetentionDashboard } from '../lib/api';
import ManagerActionModal from '../components/ManagerActionModal';

export default function InterventionsPage() {
  const [decisions, setDecisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedDecision, setSelectedDecision] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchDecisions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getRetentionQueue({ limit: 50 });
      const items = res.data?.items || res.items || [];
      setDecisions(items);
    } catch (err) {
      console.error('Failed to load retention decisions:', err);
      setError('Could not load decisions from server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDecisions();
  }, []);

  const handleApprove = async (id) => {
    try {
      await approveDecision(id);
      showToast(`Decision #${id} successfully approved and logged.`, 'success');
      fetchDecisions();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Approval failed. Access denied or decision not found.', 'error');
    }
  };

  const handleReject = async (id) => {
    try {
      await rejectDecision(id);
      showToast(`Decision #${id} rejected and archived.`, 'info');
      fetchDecisions();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Rejection failed. Access denied or decision not found.', 'error');
    }
  };

  const filteredDecisions = decisions.filter((d) => {
    if (statusFilter === 'ALL') return true;
    return (d.status || d.workflow_status || 'PENDING_REVIEW') === statusFilter;
  });

  return (
    <div style={{ padding: '24px', maxWidth: 1440, margin: '0 auto' }}>
      {/* Toast Notification Banner */}
      {toast && (
        <div style={{
          padding: '12px 16px',
          marginBottom: 16,
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: toast.type === 'error' ? '#FEF2F2' : toast.type === 'info' ? '#F0F9FF' : '#F0FDF4',
          color: toast.type === 'error' ? '#991B1B' : toast.type === 'info' ? '#0369A1' : '#166534',
          border: `1px solid ${toast.type === 'error' ? '#FECACA' : toast.type === 'info' ? '#BAE6FD' : '#BBF7D0'}`,
        }}>
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 800, marginLeft: 12 }}>✕</button>
        </div>
      )}      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 9999, background: 'rgba(95, 181, 122, 0.15)', color: '#111111', fontSize: 11, fontWeight: 800, border: '1px solid rgba(95, 181, 122, 0.3)', marginBottom: 6, letterSpacing: '0.06em' }}>
            <Zap style={{ width: 13, height: 13, color: '#5FB57A' }} />
            DECISION AUDIT LOG
          </div>
          <h1 className="font-display" style={{ fontSize: 28, fontWeight: 900, color: '#111111', margin: 0, letterSpacing: '-0.02em' }}>
            Intervention Recommendation Log & Decisions
          </h1>
          <p style={{ fontSize: 13, color: '#656565', marginTop: 3, marginBottom: 0 }}>
            Manage Next-Best-Action retention workflows, review ROI savings, and audit manager decisions.
          </p>
        </div>

        <button onClick={fetchDecisions} disabled={loading} className="btn-secondary" style={{ fontSize: 12.5 }}>
          <RefreshCw style={{ width: 14, height: 14, animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Refresh Log
        </button>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['ALL', 'PENDING_REVIEW', 'APPROVED', 'REJECTED'].map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setStatusFilter(status)}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              fontSize: 12.5,
              fontWeight: 700,
              cursor: 'pointer',
              border: statusFilter === status ? '1px solid #111111' : '1px solid #D8D8D5',
              background: statusFilter === status ? '#111111' : '#F3F3F1',
              color: statusFilter === status ? '#FFFFFF' : '#656565',
              transition: 'all 0.15s',
            }}
          >
            {status === 'ALL' ? 'All Interventions' : status.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Decision Table */}
      <div className="saas-card" style={{ overflow: 'hidden', padding: 0 }}>
        <table className="saas-table">
          <thead>
            <tr>
              <th>Account</th>
              <th>Recommended Intervention</th>
              <th>Incentive Cost</th>
              <th>Predicted Uplift</th>
              <th>Expected Net Savings</th>
              <th>ROI</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Workflow Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#656565' }}>
                  Loading intervention records...
                </td>
              </tr>
            ) : filteredDecisions.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#656565' }}>
                  No interventions found in this status category.
                </td>
              </tr>
            ) : (
              filteredDecisions.map((item) => {
                const status = item.status || item.workflow_status || 'PENDING_REVIEW';
                const cost = item.intervention_cost ?? item.cost ?? 15.0;
                const uplift = (item.expected_effectiveness ?? item.predicted_uplift ?? 0.25) * 100;
                const netSavings = item.expected_net_value ?? 420.0;
                const roi = item.roi ?? 2.8;

                return (
                  <tr key={item.id || item.customer_id}>
                    <td style={{ fontWeight: 700, color: '#111111' }}>
                      {item.customer_id || `CG-${item.id}`}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: '#111111' }}>
                        <Zap style={{ width: 14, height: 14, color: '#5FB57A' }} />
                        {item.recommended_action || 'Offer Loyalty Discount'}
                      </div>
                    </td>
                    <td>${Number(cost).toFixed(2)}</td>
                    <td style={{ color: '#5FB57A', fontWeight: 700 }}>+{uplift.toFixed(1)}%</td>
                    <td style={{ fontWeight: 700, color: '#111111' }}>${Number(netSavings).toFixed(2)}</td>
                    <td>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: 9999,
                          fontSize: 11,
                          fontWeight: 800,
                          background: 'rgba(95,181,122,0.15)',
                          color: '#111111',
                          border: '1px solid rgba(95,181,122,0.3)',
                        }}
                      >
                        {Number(roi).toFixed(1)}x ROI
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: 9999,
                          fontSize: 11,
                          fontWeight: 700,
                          background:
                            status === 'APPROVED' ? 'rgba(95,181,122,0.15)' : status === 'REJECTED' ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)',
                          color:
                            status === 'APPROVED' ? '#111111' : status === 'REJECTED' ? '#EF4444' : '#D97706',
                          border: `1px solid ${
                            status === 'APPROVED' ? 'rgba(95,181,122,0.3)' : status === 'REJECTED' ? '#FECACA' : '#FDE68A'
                          }`,
                        }}
                      >
                        {status.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {status === 'PENDING_REVIEW' ? (
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          <button
                            onClick={() => handleApprove(item.id)}
                            className="btn-primary"
                            style={{ padding: '4px 10px', fontSize: 12 }}
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(item.id)}
                            className="btn-secondary"
                            style={{ padding: '4px 10px', fontSize: 12, color: '#EF4444', borderColor: '#FECACA' }}
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: 12, color: '#656565' }}>Logged</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
