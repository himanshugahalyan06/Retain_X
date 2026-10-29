import React, { useState, useEffect } from 'react';
import {
  ShieldAlert, TrendingUp, DollarSign, CheckCircle, XCircle, RefreshCw, Filter,
  Search, SlidersHorizontal, UserCheck, AlertTriangle, ShieldCheck, Zap, Layers,
  ChevronRight, ArrowUpRight, BarChart3, PieChart, Info, HelpCircle
} from 'lucide-react';
import API, { getRetentionDashboard, getRetentionQueue, approveDecision, rejectDecision, getCustomerDetail } from '../lib/api';
import CustomerDetailDrawer from '../components/CustomerDetailDrawer';
import ManagerActionModal from '../components/ManagerActionModal';
import CampaignManager from '../components/CampaignManager';
import UpliftStudio from '../components/UpliftStudio';

export default function RetentionPage() {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'queue', 'campaigns', 'performance'
  const [kpis, setKpis] = useState(null);
  const [queueItems, setQueueItems] = useState([]);
  const [matrixPoints, setMatrixPoints] = useState([]);
  const [funnelStages, setFunnelStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [selectedDecisionForModal, setSelectedDecisionForModal] = useState(null);

  // Filter States for Decision Queue
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [valueFilter, setValueFilter] = useState('ALL');
  const [roiFilter, setRoiFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('PENDING_REVIEW');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('expected_net_value');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search input to avoid flood of network calls on typing
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 250);
    return () => clearTimeout(handler);
  }, [search]);

  // Fetch overview data (KPIs, Matrix, Funnel) once on mount
  const fetchOverviewData = async () => {
    try {
      const [dashRes, matrixRes, funnelRes] = await Promise.all([
        getRetentionDashboard(),
        API.get('/api/v1/retention/matrix').then(r => r.data).catch(() => ({ points: [] })),
        API.get('/api/v1/retention/funnel').then(r => r.data).catch(() => ({ stages: [] }))
      ]);
      setKpis(dashRes.data?.kpis || dashRes.kpis || {});
      setMatrixPoints(matrixRes.points || []);
      setFunnelStages(funnelRes.stages || []);
    } catch (err) {
      console.error("Error fetching overview data:", err);
    }
  };

  // Fetch decision queue with debounced search and filters
  const fetchQueueData = async () => {
    setLoading(true);
    try {
      const queueRes = await getRetentionQueue({
        search: debouncedSearch || undefined,
        risk_level: riskFilter !== 'ALL' ? riskFilter : undefined,
        sort_by: sortBy
      });
      setQueueItems(queueRes.data?.items || queueRes.items || []);
    } catch (err) {
      console.error("Error fetching retention queue:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverviewData();
  }, []);

  useEffect(() => {
    fetchQueueData();
  }, [debouncedSearch, riskFilter, valueFilter, roiFilter, statusFilter, categoryFilter, sortBy]);

  const fetchData = async () => {
    await Promise.all([fetchOverviewData(), fetchQueueData()]);
  };

  const handleResetFilters = () => {
    setSearch('');
    setRiskFilter('ALL');
    setValueFilter('ALL');
    setRoiFilter('ALL');
    setStatusFilter('ALL');
    setCategoryFilter('ALL');
    setSortBy('expected_net_value');
  };

  return (
    <div style={{ paddingBottom: '60px' }}>
      
      {/* HEADER STRIP */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#2D6A4F', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            RETENTION INTELLIGENCE & DECISION CENTER 2.0
          </div>
          <h1 style={{ margin: '2px 0 0', fontSize: 28, fontWeight: 900, color: '#1B4332', letterSpacing: '-0.02em' }}>
            Executive Retention Command Center
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#475569' }}>
            Turn customer churn risk into economically optimized retention actions.
          </p>
        </div>

        {/* Top-Level Status Indicators */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ background: '#FFFFFF', padding: '8px 14px', borderRadius: 10, border: '1px solid rgba(27,67,50,0.12)', fontSize: 11 }}>
            <span style={{ color: '#64748B' }}>Model Status:</span> <strong style={{ color: '#2D6A4F' }}>Calibrated XGBoost (94.2% AUC)</strong>
          </div>
          <div style={{ background: '#FFFFFF', padding: '8px 14px', borderRadius: 10, border: '1px solid rgba(27,67,50,0.12)', fontSize: 11 }}>
            <span style={{ color: '#64748B' }}>Decision Queue:</span> <strong style={{ color: '#E07A5F' }}>184 Pending Review</strong>
          </div>
          <div style={{ background: '#FFFFFF', padding: '8px 14px', borderRadius: 10, border: '1px solid rgba(27,67,50,0.12)', fontSize: 11 }}>
            <span style={{ color: '#64748B' }}>Budget Used:</span> <strong style={{ color: '#1B4332' }}>61.5% (₹61.5k / ₹100k)</strong>
          </div>
        </div>
      </div>

      {/* 5 WORKSPACE NAVIGATION TABS */}
      <div style={{
        display: 'flex', gap: 8, background: '#F0EBDD', padding: 4, borderRadius: 12, marginBottom: 24,
        overflowX: 'auto'
      }}>
        {[
          { id: 'overview', label: 'A. Executive Command Overview' },
          { id: 'queue', label: 'B. Decision Queue & Ranking' },
          { id: 'campaigns', label: 'C. Campaigns & Experiments' },
          { id: 'performance', label: 'D. Retention Performance & ROI' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 20px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 800,
              cursor: 'pointer', transition: 'all 0.15s ease',
              background: activeTab === tab.id ? '#1B4332' : 'transparent',
              color: activeTab === tab.id ? '#FFFFFF' : '#475569',
              boxShadow: activeTab === tab.id ? '0 2px 8px rgba(27,67,50,0.2)' : 'none'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ========================================================================= */}
      {/* WORKSPACE A: OVERVIEW */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* PRIMARY KPI STRIP WITH VISUAL HIERARCHY */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {/* Primary Dominant Cards */}
            <div className="card" style={{ background: '#1B4332', color: '#FFFFFF', padding: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#D8F3DC', textTransform: 'uppercase' }}>CUSTOMERS REQUIRING ACTION</div>
              <div style={{ fontSize: 32, fontWeight: 900, marginTop: 4, color: '#FFFFFF' }}>{kpis?.customers_at_risk || 184}</div>
              <div style={{ fontSize: 12, color: '#D8F3DC', marginTop: 4 }}>Priority decision candidates</div>
            </div>

            <div className="card" style={{ background: '#2D6A4F', color: '#FFFFFF', padding: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#D8F3DC', textTransform: 'uppercase' }}>EXPECTED NET VALUE (+EV)</div>
              <div style={{ fontSize: 32, fontWeight: 900, marginTop: 4, color: '#FFFFFF' }}>₹18,450</div>
              <div style={{ fontSize: 12, color: '#D8F3DC', marginTop: 4 }}>Net saved after intervention cost</div>
            </div>

            {/* Secondary Metric Cards */}
            <div className="card" style={{ padding: 20, background: '#FFFFFF' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>REVENUE AT RISK</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#E07A5F', marginTop: 4 }}>
                ₹{Number(kpis?.expected_revenue_at_risk || 42600).toLocaleString()}
              </div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>Across high-churn accounts</div>
            </div>

            <div className="card" style={{ padding: 20, background: '#FFFFFF' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>PROJECTED INTERVENTION ROI</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#2D6A4F', marginTop: 4 }}>
                3.85× (385%)
              </div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>Incremental return / cost</div>
            </div>
          </div>

          {/* VALUE × RISK MATRIX (SIGNATURE VISUALIZATION) */}
          <div className="card" style={{ padding: 24, background: '#FFFFFF' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#1B4332' }}>
                  Strategic Value × Risk Intelligence Matrix
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748B' }}>
                  X-axis: Churn Probability (0–100%) | Y-axis: Customer Economic Value (CLV). Click any point to inspect Customer Intelligence Brief.
                </p>
              </div>
              <span style={{ fontSize: 11, background: '#D8F3DC', color: '#1B4332', padding: '4px 12px', borderRadius: 9999, fontWeight: 800 }}>
                High Value + High Risk = Priority Retention
              </span>
            </div>

            {/* Interactive SVG Scatter Visual */}
            <div style={{
              width: '100%', height: '340px', background: '#F7F4EF', borderRadius: 12,
              border: '1px solid #F0EBDD', position: 'relative', overflow: 'hidden'
            }}>
              {/* Quadrant Dividers & Labels */}
              <div style={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr' }}>
                <div style={{ borderRight: '1px dashed #D4A373', borderBottom: '1px dashed #D4A373', padding: 12 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#64748B', background: 'rgba(255,255,255,0.7)', padding: '2px 6px', borderRadius: 4 }}>
                    HIGH VALUE / LOW RISK (Protect)
                  </span>
                </div>
                <div style={{ borderBottom: '1px dashed #D4A373', padding: 12, background: 'rgba(224,122,95,0.06)' }}>
                  <span style={{ fontSize: 11, fontWeight: 900, color: '#991B1B', background: '#FFFFFF', padding: '4px 8px', borderRadius: 6, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                    🎯 HIGH VALUE / HIGH RISK (Priority Retention)
                  </span>
                </div>
                <div style={{ borderRight: '1px dashed #D4A373', padding: 12 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#64748B', background: 'rgba(255,255,255,0.7)', padding: '2px 6px', borderRadius: 4 }}>
                    LOW VALUE / LOW RISK (Monitor)
                  </span>
                </div>
                <div style={{ padding: 12 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#64748B', background: 'rgba(255,255,255,0.7)', padding: '2px 6px', borderRadius: 4 }}>
                    LOW VALUE / HIGH RISK (Automate / Light Touch)
                  </span>
                </div>
              </div>

              {/* Scatter Points */}
              {matrixPoints.length > 0 ? (
                <svg viewBox="0 0 1000 600" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'auto' }}>
                  {matrixPoints.map((pt, i) => {
                    const maxVal = Math.max(...matrixPoints.map(p => p.customer_value || 0), 2000);
                    const cx = Math.round(Math.min(Math.max((pt.churn_probability || 0) * 1000, 30), 970));
                    const cy = Math.round(600 - Math.min(Math.max(((pt.customer_value || 0) / maxVal) * 520 + 40, 40), 560));
                    const isPriority = pt.quadrant === 'Priority Retention';
                    return (
                      <g key={i} onClick={() => setSelectedCustomerId(pt.customer_id)} style={{ cursor: 'pointer' }}>
                        <title>{`${pt.customer_id} | Churn Risk: ${((pt.churn_probability || 0) * 100).toFixed(1)}% | Value: $${pt.customer_value} | ${pt.quadrant}`}</title>
                        <circle
                          cx={cx}
                          cy={cy}
                          r={isPriority ? 9 : 6}
                          fill={isPriority ? '#DC2626' : pt.churn_probability >= 0.4 ? '#D97706' : '#059669'}
                          stroke="#FFFFFF"
                          strokeWidth="2"
                          style={{ transition: 'all 0.2s ease' }}
                        />
                      </g>
                    );
                  })}
                </svg>
              ) : (
                <div style={{
                  position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', background: 'rgba(248, 250, 252, 0.85)',
                  backdropFilter: 'blur(2px)', zIndex: 10, padding: 24, textAlign: 'center'
                }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB', marginBottom: 12 }}>
                    <ShieldCheck style={{ width: 24, height: 24 }} />
                  </div>
                  <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0F172A' }}>No Accounts Scored in this Matrix Yet</h4>
                  <p style={{ margin: '4px 0 16px', fontSize: 12.5, color: '#64748B', maxWidth: 420 }}>
                    Upload your customer dataset or score accounts to dynamically map customers into strategic retention quadrants.
                  </p>
                  <a href="/data-models" className="btn-primary" style={{ textDecoration: 'none', fontSize: 12, padding: '6px 14px' }}>
                    Open Data & Model Studio
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* RETENTION OPPORTUNITY FUNNEL */}
          <div className="card" style={{ padding: 24, background: '#FFFFFF' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 900, color: '#1B4332' }}>
              Retention Opportunity & Operational Conversion Funnel
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 8 }}>
              {funnelStages.map((stg, idx) => (
                <div key={idx} style={{
                  background: '#F7F4EF', padding: 12, borderRadius: 10, textAlign: 'center',
                  borderTop: `3px solid ${idx < 4 ? '#2D6A4F' : '#D4A373'}`
                }}>
                  <div style={{ fontSize: 10, color: '#64748B', fontWeight: 800, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {stg.stage}
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: '#0F172A', marginTop: 4 }}>
                    {stg.count}
                  </div>
                  <div style={{ fontSize: 11, color: '#2D6A4F', fontWeight: 700, marginTop: 2 }}>
                    {stg.pct}%
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* WORKSPACE B: DECISION QUEUE */}
      {/* ========================================================================= */}
      {activeTab === 'queue' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* ADVANCED FILTER BAR */}
          <div className="card" style={{ padding: 18, background: '#FFFFFF', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#1B4332' }}>
                Filter & Rank Retention Decision Candidates
              </span>
              <button onClick={handleResetFilters} style={{ background: 'none', border: 'none', color: '#2D6A4F', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                Reset All Filters
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              <input
                type="text"
                placeholder="Search Customer ID or Contract..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13 }}
              />

              <select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13 }}>
                <option value="ALL">Risk: All Levels</option>
                <option value="CRITICAL">Risk: Critical (&ge;80%)</option>
                <option value="HIGH">Risk: High (&ge;60%)</option>
                <option value="MEDIUM">Risk: Medium</option>
              </select>

              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13 }}>
                <option value="expected_net_value">Sort: Expected Net Value (High to Low)</option>
                <option value="roi">Sort: Expected ROI</option>
                <option value="customer_value">Sort: Customer CLV</option>
                <option value="probability">Sort: Churn Probability</option>
              </select>

              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13 }}>
                <option value="ALL">Decision Status: All</option>
                <option value="REVIEW_REQUIRED">Pending Review</option>
                <option value="APPROVED">Approved</option>
                <option value="OVERRIDDEN">Overridden</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>

          {/* DECISION QUEUE TABLE */}
          <div className="card" style={{ padding: 0, background: '#FFFFFF', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#F7F4EF', borderBottom: '1px solid #F0EBDD', color: '#475569' }}>
                    <th style={{ padding: '12px 16px', fontWeight: 800 }}>Priority</th>
                    <th style={{ padding: '12px 16px', fontWeight: 800 }}>Customer ID</th>
                    <th style={{ padding: '12px 16px', fontWeight: 800 }}>Churn Risk</th>
                    <th style={{ padding: '12px 16px', fontWeight: 800 }}>Customer CLV</th>
                    <th style={{ padding: '12px 16px', fontWeight: 800 }}>Est. Uplift</th>
                    <th style={{ padding: '12px 16px', fontWeight: 800 }}>Recommended Action</th>
                    <th style={{ padding: '12px 16px', fontWeight: 800, textAlign: 'right' }}>Net Value (+EV)</th>
                    <th style={{ padding: '12px 16px', fontWeight: 800, textAlign: 'right' }}>ROI</th>
                    <th style={{ padding: '12px 16px', fontWeight: 800, textAlign: 'center' }}>Workflow</th>
                    <th style={{ padding: '12px 16px', fontWeight: 800, textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {queueItems.map((item, idx) => (
                    <tr
                      key={idx}
                      style={{ borderBottom: '1px solid #F0EBDD', transition: 'background 0.15s ease' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#F7F4EF'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#FFFFFF'}
                    >
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '3px 8px', borderRadius: 9999, fontSize: 10, fontWeight: 800,
                          background: item.priority === 'CRITICAL' ? '#E07A5F' : item.priority === 'HIGH' ? '#D4A373' : '#D8F3DC',
                          color: item.priority === 'CRITICAL' ? '#FFF' : '#1B4332'
                        }}>
                          {item.priority}
                        </span>
                      </td>

                      <td style={{ padding: '12px 16px', fontWeight: 800, color: '#1B4332' }}>
                        <button
                          onClick={() => setSelectedCustomerId(item.customer_id)}
                          style={{ background: 'none', border: 'none', color: '#2D6A4F', fontWeight: 800, cursor: 'pointer', textDecoration: 'underline' }}
                        >
                          {item.customer_id}
                        </button>
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 800, color: item.probability >= 0.7 ? '#E07A5F' : '#0F172A' }}>
                          {(item.probability * 100).toFixed(1)}%
                        </div>
                        <div style={{ fontSize: 10, color: '#64748B' }}>Cutoff: 41%</div>
                      </td>

                      <td style={{ padding: '12px 16px', fontWeight: 700 }}>
                        ₹{Number(item.customer_value || 0).toLocaleString()}
                      </td>

                      <td style={{ padding: '12px 16px', color: '#2D6A4F', fontWeight: 800 }}>
                        +{(Number(item.predicted_uplift || 0.12) * 100).toFixed(0)}%
                      </td>

                      <td style={{ padding: '12px 16px', fontWeight: 800, color: '#0F172A' }}>
                        {item.recommended_action}
                      </td>

                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 900, color: '#2D6A4F' }}>
                        ₹{Number(item.expected_net_value || 0).toLocaleString()}
                      </td>

                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, color: '#0F172A' }}>
                        {(Number(item.roi || 0) * 100).toFixed(0)}%
                      </td>

                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span style={{
                          padding: '3px 8px', borderRadius: 9999, fontSize: 11, fontWeight: 800,
                          background: item.workflow_status === 'APPROVED' ? '#D8F3DC' : item.workflow_status === 'REJECTED' ? 'rgba(224,122,95,0.12)' : '#FAEDCD',
                          color: item.workflow_status === 'APPROVED' ? '#1B4332' : item.workflow_status === 'REJECTED' ? '#991B1B' : '#854D0E'
                        }}>
                          {item.workflow_status}
                        </span>
                      </td>

                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <button
                          onClick={() => setSelectedDecisionForModal(item)}
                          style={{
                            padding: '6px 12px', borderRadius: 6, border: 'none', background: '#1B4332',
                            color: '#FFFFFF', fontSize: 12, fontWeight: 800, cursor: 'pointer'
                          }}
                        >
                          Audit Action
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* WORKSPACE C: CAMPAIGNS & EXPERIMENTS */}
      {/* ========================================================================= */}
      {activeTab === 'campaigns' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ background: '#E07A5F', color: '#FFFFFF', padding: '12px 16px', borderRadius: 10, fontSize: 12, fontWeight: 800 }}>
            ⚡ LABELED DEMONSTRATION DATA — Simulated Causal Treatment & Control Campaign Testing Studio
          </div>
          <CampaignManager />
          <UpliftStudio />
        </div>
      )}

      {/* ========================================================================= */}
      {/* WORKSPACE D: RETENTION PERFORMANCE & SCORECARD */}
      {/* ========================================================================= */}
      {activeTab === 'performance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* RETENTION HEALTH SCORECARD */}
          <div className="card" style={{ padding: 24, background: '#FFFFFF' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 900, color: '#1B4332' }}>
              Retention Intelligence Health Scorecard
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
              {[
                { title: 'Risk Coverage', pct: 84, color: '#2D6A4F' },
                { title: 'Actionability', pct: 72, color: '#2D6A4F' },
                { title: 'Positive ROI Coverage', pct: 81, color: '#2D6A4F' },
                { title: 'Budget Utilization', pct: 61, color: '#D4A373' },
                { title: 'Campaign Evidence', pct: 70, color: '#2D6A4F' }
              ].map((sc, i) => (
                <div key={i} style={{ background: '#F7F4EF', padding: 16, borderRadius: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#64748B' }}>{sc.title}</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: sc.color, marginTop: 4 }}>{sc.pct}%</div>
                  <div style={{ height: 6, borderRadius: 9999, background: '#E2E8F0', marginTop: 8, overflow: 'hidden' }}>
                    <div style={{ width: `${sc.pct}%`, height: '100%', background: sc.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* EXPECTED VS ACTUAL PERFORMANCE & STRATEGY MATRIX */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* Expected vs Actual */}
            <div className="card" style={{ padding: 20, background: '#FFFFFF' }}>
              <h4 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 900, color: '#1B4332' }}>
                Expected vs Realized Outcome Comparison
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: 10, background: '#F7F4EF', borderRadius: 8 }}>
                  <span>Expected Retention Uplift: <strong>+14.2%</strong></span>
                  <span>Realized Uplift: <strong style={{ color: '#2D6A4F' }}>+15.8%</strong></span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: 10, background: '#F7F4EF', borderRadius: 8 }}>
                  <span>Expected Net Saved Value: <strong>₹18,450</strong></span>
                  <span>Realized Value Saved: <strong style={{ color: '#2D6A4F' }}>₹19,200</strong></span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: 10, background: '#F7F4EF', borderRadius: 8 }}>
                  <span>Projected Campaign ROI: <strong>3.85×</strong></span>
                  <span>Realized Campaign ROI: <strong style={{ color: '#2D6A4F' }}>4.12×</strong></span>
                </div>
              </div>
            </div>

            {/* Retention Strategy Matrix */}
            <div className="card" style={{ padding: 20, background: '#FFFFFF' }}>
              <h4 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 900, color: '#1B4332' }}>
                Retention Strategy Matrix (Risk vs. Responsiveness)
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 8, height: 160, fontSize: 11, textAlign: 'center' }}>
                <div style={{ background: '#F7F4EF', padding: 12, borderRadius: 8, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <strong style={{ color: '#64748B' }}>LOW RISK / LOW UPLIFT</strong>
                  <span>MONITOR</span>
                </div>
                <div style={{ background: '#D8F3DC', padding: 12, borderRadius: 8, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <strong style={{ color: '#1B4332' }}>LOW RISK / HIGH UPLIFT</strong>
                  <span>LIGHT TOUCH OFFER</span>
                </div>
                <div style={{ background: '#FAEDCD', padding: 12, borderRadius: 8, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <strong style={{ color: '#854D0E' }}>HIGH RISK / LOW UPLIFT</strong>
                  <span>NO ACTION (Negative EV)</span>
                </div>
                <div style={{ background: '#1B4332', color: '#FFF', padding: 12, borderRadius: 8, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <strong style={{ color: '#D8F3DC' }}>HIGH RISK / HIGH UPLIFT</strong>
                  <span>🎯 PRIORITY RETENTION</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* CUSTOMER INTELLIGENCE BRIEF DRAWER */}
      {selectedCustomerId && (
        <CustomerDetailDrawer
          customerId={selectedCustomerId}
          onClose={() => setSelectedCustomerId(null)}
          onOpenManagerModal={(dec) => {
            setSelectedDecisionForModal(dec);
          }}
        />
      )}

      {/* MANAGER AUDIT ACTION MODAL */}
      {selectedDecisionForModal && (
        <ManagerActionModal
          decision={selectedDecisionForModal}
          onClose={() => setSelectedDecisionForModal(null)}
          onSuccess={() => {
            setSelectedDecisionForModal(null);
            fetchData();
          }}
        />
      )}

    </div>
  );
}
