import React, { useState, useEffect } from 'react';
import {
  ShieldAlert, TrendingUp, DollarSign, CheckCircle, XCircle, RefreshCw, Info,
  FileText, UserCheck, AlertTriangle, ShieldCheck, Zap, ArrowRight, HelpCircle
} from 'lucide-react';
import { getCustomerDetail } from '../lib/api';
import ManagerActionModal from './ManagerActionModal';

export default function CustomerDetailDrawer({ customerId, onClose, onOpenManagerModal }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isManagerModalOpen, setIsManagerModalOpen] = useState(false);
  const [managerDecision, setManagerDecision] = useState(null);

  const fetchBrief = () => {
    if (!customerId) return;
    setLoading(true);
    getCustomerDetail(customerId)
      .then((res) => {
        setData(res.data || res);
        setError(null);
      })
      .catch((err) => {
        setError(err.message || 'Failed to fetch customer retention brief.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchBrief();
  }, [customerId]);

  if (!customerId) return null;

  const handleOpenManagerAudit = () => {
    const dec = {
      ...(data?.decision || {}),
      id: data?.decision?.id || 1,
      customer_id: customerId,
      recommended_action: data?.decision?.recommended_action || data?.next_best_action?.decision || '15% Retention Discount',
      expected_net_value: data?.decision?.expected_net_value || 0,
      roi: data?.decision?.roi || 0,
    };
    if (onOpenManagerModal) {
      onOpenManagerModal(dec);
    } else {
      setManagerDecision(dec);
      setIsManagerModalOpen(true);
    }
  };

  return (
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 90,
          background: 'rgba(15, 23, 42, 0.5)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'flex-end',
        }}
        className="animate-fade-in"
      >
        <div
          style={{
            width: '100%',
            maxWidth: '740px',
            height: '100%',
            background: '#FFFFFF',
            boxShadow: '-10px 0 35px rgba(0,0,0,0.15)',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
          }}
        >
          {/* Drawer Header */}
          <div
            style={{
              padding: '18px 24px',
              background: '#0F172A',
              color: '#FFFFFF',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid #334155',
            }}
          >
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                CUSTOMER RETENTION BRIEF & DECISION AUDIT
              </div>
              <h2 style={{ margin: '2px 0 0', fontSize: '20px', fontWeight: 800, color: '#FFFFFF' }}>
                Account #{customerId}
              </h2>
            </div>
            <button
              onClick={onClose}
              style={{ background: 'transparent', border: 'none', color: '#94A3B8', fontSize: '24px', cursor: 'pointer', lineHeight: 1 }}
            >
              ×
            </button>
          </div>

          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#64748B', fontSize: '13.5px', fontWeight: 600 }}>
              Loading retention intelligence brief...
            </div>
          ) : error ? (
            <div style={{ padding: '40px', color: '#991B1B', textAlign: 'center', fontWeight: 600 }}>{error}</div>
          ) : (
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* TOP SUMMARY BANNER */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
                  borderRadius: 12,
                  padding: '20px',
                  color: '#FFFFFF',
                  boxShadow: '0 4px 14px rgba(15, 23, 42, 0.1)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: 9999,
                          fontSize: 11,
                          fontWeight: 800,
                          background: data.risk.churn_probability >= 0.45 ? '#DC2626' : '#D97706',
                          color: '#FFFFFF',
                        }}
                      >
                        {data.risk.risk_level} RISK
                      </span>
                      <span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 600 }}>
                        Contract: {data.customer.Contract}
                      </span>
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 800, marginTop: 8, letterSpacing: '-0.02em' }}>
                      {(data.risk.churn_probability * 100).toFixed(1)}% Churn Probability
                    </div>
                    <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>
                      Optimal Threshold: <strong>{(data.risk.threshold * 100).toFixed(0)}%</strong> | Monthly: <strong>${data.customer.MonthlyCharges}</strong>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', background: 'rgba(255,255,255,0.06)', padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ fontSize: 10.5, textTransform: 'uppercase', color: '#94A3B8', fontWeight: 700 }}>Customer CLV</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#FFFFFF' }}>${Number(data.decision?.customer_value || 0).toLocaleString()}</div>
                    <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>Tenure: {data.customer.tenure} mos</div>
                  </div>
                </div>
              </div>

              {/* 1. KEY SHAP RISK DRIVERS */}
              <div className="saas-card" style={{ padding: 18 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', textTransform: 'uppercase', marginBottom: 12, letterSpacing: '0.04em' }}>
                  1. Local SHAP Attribution Drivers
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {data.risk.shap_drivers?.map((driver, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        background: '#F8FAFC',
                        borderRadius: 6,
                        border: '1px solid #E2E8F0',
                        fontSize: 12.5,
                      }}
                    >
                      <span style={{ fontWeight: 600, color: '#1E293B' }}>{driver.feature}</span>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: 11.5,
                          color: driver.direction === 'increases_risk' ? '#DC2626' : '#059669',
                          background: driver.direction === 'increases_risk' ? '#FEF2F2' : '#ECFDF5',
                          padding: '2px 8px',
                          borderRadius: 4,
                        }}
                      >
                        {driver.direction === 'increases_risk' ? '↑ Risk Factor' : '↓ Protective Factor'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. NEXT BEST ACTION COMPARISON MATRIX */}
              <div className="saas-card" style={{ padding: 18 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', textTransform: 'uppercase', marginBottom: 12, letterSpacing: '0.04em' }}>
                  2. Next Best Action Analysis & Candidate Comparison Matrix
                </div>

                <div style={{ overflowX: 'auto', marginBottom: 14 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                        <th style={{ padding: '8px 10px', textAlign: 'left', color: '#64748B', fontWeight: 700 }}>Candidate Action</th>
                        <th style={{ padding: '8px 10px', textAlign: 'right', color: '#64748B', fontWeight: 700 }}>Cost</th>
                        <th style={{ padding: '8px 10px', textAlign: 'right', color: '#64748B', fontWeight: 700 }}>Uplift</th>
                        <th style={{ padding: '8px 10px', textAlign: 'right', color: '#64748B', fontWeight: 700 }}>Incremental Val</th>
                        <th style={{ padding: '8px 10px', textAlign: 'right', color: '#64748B', fontWeight: 700 }}>Net Value</th>
                        <th style={{ padding: '8px 10px', textAlign: 'right', color: '#64748B', fontWeight: 700 }}>ROI</th>
                        <th style={{ padding: '8px 10px', textAlign: 'center', color: '#64748B', fontWeight: 700 }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.next_best_action?.candidate_matrix && data.next_best_action.candidate_matrix.map((c, idx) => {
                        const isRec = c.name === data.decision?.recommended_action;
                        return (
                          <tr
                            key={idx}
                            style={{
                              borderBottom: '1px solid #E2E8F0',
                              background: isRec ? '#EFF6FF' : 'transparent',
                              fontWeight: isRec ? 700 : 500,
                            }}
                          >
                            <td style={{ padding: '9px 10px', color: '#0F172A' }}>
                              {c.name} {isRec && <span style={{ fontSize: 9.5, background: '#2563EB', color: '#FFF', padding: '2px 5px', borderRadius: 4, marginLeft: 4 }}>RECOMMENDED</span>}
                            </td>
                            <td style={{ padding: '9px 10px', textAlign: 'right', color: '#64748B' }}>${c.cost.toLocaleString()}</td>
                            <td style={{ padding: '9px 10px', textAlign: 'right', color: '#059669', fontWeight: 700 }}>+{(c.predicted_uplift * 100).toFixed(0)}%</td>
                            <td style={{ padding: '9px 10px', textAlign: 'right', color: '#0F172A' }}>${Math.round(c.expected_incremental_value).toLocaleString()}</td>
                            <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 700, color: c.expected_net_value > 0 ? '#059669' : '#DC2626' }}>
                              ${Math.round(c.expected_net_value).toLocaleString()}
                            </td>
                            <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 700, color: '#0F172A' }}>
                              {(c.roi * 100).toFixed(0)}%
                            </td>
                            <td style={{ padding: '9px 10px', textAlign: 'center' }}>
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  padding: '2px 6px',
                                  borderRadius: 4,
                                  background: c.eligible ? '#ECFDF5' : '#FEF2F2',
                                  color: c.eligible ? '#065F46' : '#991B1B',
                                }}
                              >
                                {c.eligible ? 'Eligible' : 'Ineligible'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Narrative Explanation */}
                <div style={{ background: '#F8FAFC', padding: 12, borderRadius: 8, fontSize: 12, border: '1px solid #E2E8F0' }}>
                  <div style={{ fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>
                    WHY THIS ACTION ({data.decision?.recommended_action || 'NO_ACTION'})?
                  </div>
                  {data.next_best_action?.why_recommended?.map((w, idx) => (
                    <div key={idx} style={{ color: '#334155', marginBottom: 2 }}>• {w}</div>
                  ))}

                  {data.next_best_action?.why_not_others && data.next_best_action.why_not_others.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontWeight: 700, color: '#64748B', marginBottom: 3 }}>WHY NOT ALTERNATIVE ACTIONS?</div>
                      {data.next_best_action.why_not_others.map((w, idx) => (
                        <div key={idx} style={{ color: '#64748B' }}>• {w}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 3. MANAGER DECISION AUDIT TRIGGER */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={handleOpenManagerAudit}
                  className="btn-primary"
                  style={{ padding: '10px 20px', fontSize: 13.5 }}
                >
                  <UserCheck style={{ width: 16, height: 16 }} />
                  Execute Manager Decision Audit
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Embedded Manager Decision Modal */}
      {isManagerModalOpen && managerDecision && (
        <ManagerActionModal
          decision={managerDecision}
          onClose={() => setIsManagerModalOpen(false)}
          onSuccess={() => {
            setIsManagerModalOpen(false);
            fetchBrief();
          }}
        />
      )}
    </>
  );
}
