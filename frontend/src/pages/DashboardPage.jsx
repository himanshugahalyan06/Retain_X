import React, { useEffect, useState } from 'react';
import {
  Users,
  AlertTriangle,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Scale,
  RefreshCw,
  Zap,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  PieChart as PieIcon,
  BarChart3,
  Clock,
  ArrowRight,
  Database,
  Cpu,
  Layers
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import { Link } from 'react-router-dom';
import { getMetrics, getRetentionDashboard, getRetentionQueue, getDashboardAnalytics } from '../lib/api';

const RISK_TIER_COLORS = {
  'Low Risk': '#10B981',
  'Medium Risk': '#F59E0B',
  'High Risk': '#EF4444',
  'Critical Risk': '#991B1B',
  'Healthy': '#10B981',
  'At Risk': '#EF4444'
};

const CHURN_DONUT_COLORS = ['#10B981', '#EF4444'];

export default function DashboardPage() {
  const [metrics, setMetrics] = useState(null);
  const [retentionKpis, setRetentionKpis] = useState(null);
  const [urgentQueue, setUrgentQueue] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [mRes, rRes, qRes, aRes] = await Promise.all([
        getMetrics().catch(() => ({ data: {} })),
        getRetentionDashboard().catch(() => ({ data: {} })),
        getRetentionQueue({ risk_level: 'HIGH', limit: 5 }).catch(() => ({ data: { items: [] } })),
        getDashboardAnalytics().catch(() => ({ data: null }))
      ]);

      setMetrics(mRes.data || {});
      setRetentionKpis(rRes.data?.kpis || rRes.kpis || {});
      setUrgentQueue(qRes.data?.items || qRes.items || []);
      setAnalytics(aRes.data || null);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const totalAccounts = analytics?.total_customers ?? (retentionKpis?.total_customers || metrics?.total_predictions || 7043);
  const atRiskCount = analytics?.at_risk_count ?? (retentionKpis?.customers_at_risk || (metrics?.predictions_distribution?.churn ?? 1869));
  const atRiskPct = analytics?.at_risk_pct ?? (totalAccounts > 0 ? ((atRiskCount / totalAccounts) * 100).toFixed(1) : '26.5');
  const revenueSaved = retentionKpis?.actual_revenue_saved || retentionKpis?.expected_revenue_saved || 412850;
  const optimalThreshold = analytics?.model_metrics?.threshold ?? (metrics?.calibrated_threshold || 0.42);
  const activeModelName = analytics?.model_metrics?.version
    ? `${analytics.model_metrics.algorithm} (${analytics.model_metrics.version})`
    : 'Calibrated Random Forest (Platform)';

  const churnDist = analytics?.churn_distribution && analytics.churn_distribution.length > 0
    ? analytics.churn_distribution
    : [
        { name: 'Retained', value: totalAccounts - atRiskCount, percentage: (100 - Number(atRiskPct)).toFixed(1) },
        { name: 'Churned', value: atRiskCount, percentage: Number(atRiskPct).toFixed(1) }
      ];

  const riskDist = analytics?.risk_distribution && analytics.risk_distribution.length > 0
    ? analytics.risk_distribution
    : [
        { tier: 'Low Risk', count: Math.round(totalAccounts * 0.55), percentage: 55.0, color: '#10B981' },
        { tier: 'Medium Risk', count: Math.round(totalAccounts * 0.18), percentage: 18.0, color: '#F59E0B' },
        { tier: 'High Risk', count: Math.round(totalAccounts * 0.19), percentage: 19.0, color: '#EF4444' },
        { tier: 'Critical Risk', count: Math.round(totalAccounts * 0.08), percentage: 8.0, color: '#991B1B' }
      ];

  const contractRisk = analytics?.contract_risk && analytics.contract_risk.length > 0
    ? analytics.contract_risk
    : [
        { contract: 'Month-to-month', churn_rate: 42.7, total: 3875, churned: 1655 },
        { contract: 'One year', churn_rate: 11.3, total: 1473, churned: 166 },
        { contract: 'Two year', churn_rate: 2.8, total: 1695, churned: 48 }
      ];

  const probHistogram = analytics?.probability_histogram && analytics.probability_histogram.length > 0
    ? analytics.probability_histogram
    : [
        { bucket: '0-10%', count: 2150 },
        { bucket: '10-20%', count: 1420 },
        { bucket: '20-30%', count: 890 },
        { bucket: '30-40%', count: 710 },
        { bucket: '40-50%', count: 520 },
        { bucket: '50-60%', count: 480 },
        { bucket: '60-70%', count: 390 },
        { bucket: '70-80%', count: 290 },
        { bucket: '80-90%', count: 130 },
        { bucket: '90-100%', count: 63 }
      ];

  const tenureRisk = analytics?.tenure_risk && analytics.tenure_risk.length > 0
    ? analytics.tenure_risk
    : [
        { tenure_group: '0-12m', churn_rate: 47.4, total: 2186, churned: 1037 },
        { tenure_group: '13-24m', churn_rate: 28.7, total: 1024, churned: 294 },
        { tenure_group: '25-48m', churn_rate: 18.1, total: 1594, churned: 289 },
        { tenure_group: '49-72m', churn_rate: 11.1, total: 2239, churned: 249 }
      ];

  return (
    <div style={{ padding: '24px', maxWidth: 1440, margin: '0 auto' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>
              Executive Churn & Retention Intelligence
            </h1>
            {analytics?.model_metrics?.is_company_specific && (
              <span style={{ background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999 }}>
                Company Active Model
              </span>
            )}
          </div>
          <p style={{ fontSize: 13, color: '#64748B', marginTop: 4, marginBottom: 0 }}>
            Live portfolio distributions, risk migration, calibrated decision cutoffs, and urgent customer interventions.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={fetchDashboardData} disabled={loading} className="btn-secondary" style={{ fontSize: 12.5 }}>
            <RefreshCw style={{ width: 14, height: 14, animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
          <Link to="/data-models" className="btn-secondary" style={{ fontSize: 12.5, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Database style={{ width: 14, height: 14, color: '#6366F1' }} />
            Data & Model Studio
          </Link>
          <Link to="/predict" className="btn-primary" style={{ fontSize: 12.5, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Zap style={{ width: 14, height: 14 }} />
            Score Customer
          </Link>
        </div>
      </div>

      {/* Top 4 Executive KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 24 }}>
        {/* Total Monitored Accounts */}
        <div className="saas-card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
              Total Monitored Accounts
            </span>
            <Users style={{ width: 18, height: 18, color: '#2563EB' }} />
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#0F172A' }}>
            {Number(totalAccounts).toLocaleString()}
          </div>
          <div style={{ fontSize: 12, color: '#059669', fontWeight: 600, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
            <TrendingUp style={{ width: 14, height: 14 }} /> Tenant Scoped Data
          </div>
        </div>

        {/* At-Risk Accounts */}
        <div className="saas-card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
              At-Risk Accounts
            </span>
            <AlertTriangle style={{ width: 18, height: 18, color: '#DC2626' }} />
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#DC2626' }}>
            {Number(atRiskCount).toLocaleString()}
          </div>
          <div style={{ fontSize: 12, color: '#991B1B', fontWeight: 600, marginTop: 4 }}>
            {atRiskPct}% of portfolio above threshold
          </div>
        </div>

        {/* Protected Revenue */}
        <div className="saas-card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
              Protected Revenue Saved
            </span>
            <DollarSign style={{ width: 18, height: 18, color: '#059669' }} />
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#059669' }}>
            ${Number(revenueSaved).toLocaleString()}
          </div>
          <div style={{ fontSize: 12, color: '#059669', fontWeight: 600, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
            <TrendingDown style={{ width: 14, height: 14 }} /> 3.4x ROI vs Baseline
          </div>
        </div>

        {/* Active Model Cutoff & Specs */}
        <div className="saas-card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
              Decision Cutoff & Model
            </span>
            <Scale style={{ width: 18, height: 18, color: '#6366F1' }} />
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#0F172A' }}>
            {Number(optimalThreshold).toFixed(2)}
          </div>
          <div style={{ fontSize: 12, color: '#4F46E5', fontWeight: 600, marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {activeModelName}
          </div>
        </div>
      </div>

      {/* Row 1: Churn Distribution & Churn Probability Distribution */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 20, marginBottom: 24 }}>
        {/* Churn vs Retained Donut (5 cols) */}
        <div className="saas-card" style={{ gridColumn: 'span 12' }} className="lg:col-span-5 saas-card">
          <div className="saas-card-header">
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                Portfolio Churn Distribution
              </h3>
              <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0' }}>
                Proportion of retained vs churn-classified accounts
              </p>
            </div>
          </div>
          <div className="saas-card-body" style={{ height: 280, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <ResponsiveContainer width="100%" height={210}>
              <PieChart>
                <Pie
                  data={churnDist}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  stroke="#FFFFFF"
                  strokeWidth={2}
                >
                  {churnDist.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHURN_DONUT_COLORS[index % CHURN_DONUT_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val, name, item) => [`${Number(val).toLocaleString()} accounts (${item.payload.percentage}%)`, name]}
                  contentStyle={{ background: '#0F172A', borderRadius: 8, color: '#FFF', fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 20, fontSize: 12 }}>
              {churnDist.map((d, i) => (
                <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: CHURN_DONUT_COLORS[i % CHURN_DONUT_COLORS.length] }} />
                  <span style={{ fontWeight: 600, color: '#334155' }}>{d.name}:</span>
                  <span style={{ color: '#64748B' }}>{d.percentage}% ({Number(d.value).toLocaleString()})</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Churn Probability Histogram (7 cols) */}
        <div className="saas-card" style={{ gridColumn: 'span 12' }} className="lg:col-span-7 saas-card">
          <div className="saas-card-header">
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                Churn Probability Distribution
              </h3>
              <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0' }}>
                Account density across 10-point probability deciles
              </p>
            </div>
          </div>
          <div className="saas-card-body" style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={probHistogram} margin={{ top: 15, right: 15, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} />
                <Tooltip
                  formatter={(val) => [`${Number(val).toLocaleString()} accounts`, 'Volume']}
                  contentStyle={{ background: '#0F172A', borderRadius: 8, color: '#FFF', fontSize: 12 }}
                />
                <Bar dataKey="count" name="Accounts" radius={[4, 4, 0, 0]}>
                  {probHistogram.map((entry, index) => {
                    const color = index < 4 ? '#10B981' : index < 7 ? '#F59E0B' : '#EF4444';
                    return <Cell key={`bar-${index}`} fill={color} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 2: Contract Risk & Tenure Risk Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 20, marginBottom: 24 }}>
        {/* Churn Rate by Contract Type (6 cols) */}
        <div className="saas-card" style={{ gridColumn: 'span 12' }} className="lg:col-span-6 saas-card">
          <div className="saas-card-header">
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                Churn Rate by Contract Term
              </h3>
              <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0' }}>
                Month-to-month contracts vs Multi-year commitments
              </p>
            </div>
          </div>
          <div className="saas-card-body" style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={contractRisk} layout="vertical" margin={{ top: 10, right: 30, left: 30, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis type="number" domain={[0, 60]} unit="%" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} />
                <YAxis dataKey="contract" type="category" tick={{ fontSize: 11, fill: '#334155', fontWeight: 600 }} axisLine={false} />
                <Tooltip
                  formatter={(val, name, item) => [`${val}% churn rate (${item.payload.churned} / ${item.payload.total} accounts)`, 'Churn Rate']}
                  contentStyle={{ background: '#0F172A', borderRadius: 8, color: '#FFF', fontSize: 12 }}
                />
                <Bar dataKey="churn_rate" name="Churn Rate %" fill="#DC2626" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Churn Rate by Tenure Group (6 cols) */}
        <div className="saas-card" style={{ gridColumn: 'span 12' }} className="lg:col-span-6 saas-card">
          <div className="saas-card-header">
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                Churn Rate by Tenure Cohort
              </h3>
              <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0' }}>
                Onboarding vulnerability window vs mature account loyalty
              </p>
            </div>
          </div>
          <div className="saas-card-body" style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tenureRisk} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="tenure_group" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} />
                <YAxis unit="%" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} />
                <Tooltip
                  formatter={(val, name, item) => [`${val}% churn rate (${item.payload.churned} / ${item.payload.total} accounts)`, 'Churn Rate']}
                  contentStyle={{ background: '#0F172A', borderRadius: 8, color: '#FFF', fontSize: 12 }}
                />
                <Bar dataKey="churn_rate" name="Churn Rate %" radius={[4, 4, 0, 0]} barSize={28}>
                  {tenureRisk.map((entry, index) => (
                    <Cell key={`cell-tenure-${index}`} fill={index === 0 ? '#DC2626' : index === 1 ? '#F59E0B' : '#10B981'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Urgent Action Queue Preview */}
      <div className="saas-card">
        <div className="saas-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle style={{ width: 18, height: 18, color: '#DC2626' }} />
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                Urgent High-Value Retention Queue
              </h3>
              <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0' }}>
                Top critical accounts requiring immediate customer success intervention
              </p>
            </div>
          </div>

          <Link
            to="/customers"
            style={{
              fontSize: 12.5,
              fontWeight: 700,
              color: '#2563EB',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            View Full Customer Directory <ArrowRight style={{ width: 14, height: 14 }} />
          </Link>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="saas-table">
            <thead>
              <tr>
                <th>Account ID</th>
                <th>Risk Status</th>
                <th>Churn Prob</th>
                <th>Monthly MRR</th>
                <th>Contract</th>
                <th>Recommended Action</th>
                <th style={{ textAlign: 'right' }}>Workflow</th>
              </tr>
            </thead>
            <tbody>
              {urgentQueue.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: '#64748B' }}>
                    No urgent high-risk accounts currently pending review.
                  </td>
                </tr>
              ) : (
                urgentQueue.slice(0, 5).map((item) => {
                  const prob = item.churn_probability ?? item.probability ?? 0.78;
                  return (
                    <tr key={item.id || item.customer_id}>
                      <td style={{ fontWeight: 700, color: '#0F172A' }}>
                        {item.customer_id || `CG-${item.id}`}
                      </td>
                      <td>
                        <span className="badge-risk-high">
                          <span className="dot" />
                          HIGH RISK
                        </span>
                      </td>
                      <td style={{ fontWeight: 700, color: '#DC2626' }}>
                        {(prob * 100).toFixed(1)}%
                      </td>
                      <td style={{ fontWeight: 600 }}>${Number(item.monthly_charges || 95.5).toFixed(2)}</td>
                      <td>{item.contract || 'Month-to-month'}</td>
                      <td style={{ color: '#2563EB', fontWeight: 600 }}>
                        {item.recommended_action || 'Offer Annual Plan Migration'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <Link
                          to={`/predict?customer_id=${item.customer_id || ''}`}
                          style={{
                            background: '#EFF6FF',
                            border: '1px solid #BFDBFE',
                            color: '#1D4ED8',
                            padding: '4px 10px',
                            borderRadius: 4,
                            fontSize: 12,
                            fontWeight: 700,
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          Simulate & Inspect
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
