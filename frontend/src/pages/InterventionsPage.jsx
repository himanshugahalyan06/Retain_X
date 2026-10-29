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
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>
            Intervention Recommendation Log & Decisions
          </h1>
          <p style={{ fontSize: 13, color: '#64748B', marginTop: 3, marginBottom: 0 }}>
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
              padding: '6px 14px',
              borderRadius: 6,
              fontSize: 12.5,
              fontWeight: 700,
              cursor: 'pointer',
              border: statusFilter === status ? '1px solid #2563EB' : '1px solid #E2E8F0',
              background: statusFilter === status ? '#EFF6FF' : '#FFFFFF',
              color: statusFilter === status ? '#1D4ED8' : '#64748B',
              transition: 'all 0.15s',
            }}
          >
            {status === 'ALL' ? 'All Interventions' : status.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Decision Table */}
      <div className="saas-card" style={{ overflow: 'hidden' }}>
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
                <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>
                  Loading intervention records...
                </td>
              </tr>
            ) : filteredDecisions.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>
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
                    <td style={{ fontWeight: 700, color: '#0F172A' }}>
                      {item.customer_id || `CG-${item.id}`}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: '#2563EB' }}>
                        <Zap style={{ width: 14, height: 14, color: '#2563EB' }} />
                        {item.recommended_action || 'Offer Loyalty Discount'}
                      </div>
                    </td>
                    <td>${Number(cost).toFixed(2)}</td>
                    <td style={{ color: '#059669', fontWeight: 700 }}>+{uplift.toFixed(1)}%</td>
                    <td style={{ fontWeight: 700, color: '#0F172A' }}>${Number(netSavings).toFixed(2)}</td>
                    <td>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontSize: 11.5,
                          fontWeight: 800,
                          background: '#ECFDF5',
                          color: '#065F46',
                          border: '1px solid #A7F3D0',
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
                            status === 'APPROVED' ? '#ECFDF5' : status === 'REJECTED' ? '#FEF2F2' : '#FFFBEB',
                          color:
                            status === 'APPROVED' ? '#065F46' : status === 'REJECTED' ? '#991B1B' : '#92400E',
                          border: `1px solid ${
                            status === 'APPROVED' ? '#A7F3D0' : status === 'REJECTED' ? '#FECACA' : '#FDE68A'
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
                            style={{
                              background: '#ECFDF5',
                              border: '1px solid #A7F3D0',
                              color: '#065F46',
                              padding: '4px 8px',
                              borderRadius: 4,
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(item.id)}
                            style={{
                              background: '#FEF2F2',
                              border: '1px solid #FECACA',
                              color: '#991B1B',
                              padding: '4px 8px',
                              borderRadius: 4,
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: 12, color: '#94A3B8' }}>Logged</span>
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
