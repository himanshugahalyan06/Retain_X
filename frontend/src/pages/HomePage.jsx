import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldAlert, BrainCircuit, BarChart3, Target, ArrowRight,
  TrendingDown, Zap, Lock, CheckCircle, ChevronRight, Activity,
  Users, DollarSign, PieChart, ShieldCheck, Sparkles, Scale, AlertTriangle
} from 'lucide-react';

const stats = [
  { value: '94.2%', label: 'Model AUC-ROC', sub: 'Calibrated cost-sensitive ML', color: '#1B4332' },
  { value: '<50ms', label: 'Inference Latency', sub: 'Real-time FastAPI backend', color: '#2D6A4F' },
  { value: '3.4×', label: 'Retention Spend ROI', sub: 'vs. uncalibrated baseline', color: '#D4A373' },
  { value: '100%', label: 'Explainable AI', sub: 'Local & global SHAP drivers', color: '#E07A5F' },
];

const capabilities = [
  {
    icon: BrainCircuit,
    title: 'Cost-Sensitive Machine Learning',
    description: 'Models trained explicitly with asymmetric loss functions — penalizing false negatives higher to protect high-value customer relationships.',
    bg: '#F7F4EF',
    borderColor: 'rgba(45, 106, 79, 0.2)',
  },
  {
    icon: BarChart3,
    title: 'SHAP Feature Contribution',
    description: 'Granular local explainability for every single customer prediction, pinpointing exact contractual, usage, and billing risk drivers.',
    bg: '#F7F4EF',
    borderColor: 'rgba(212, 163, 115, 0.25)',
  },
  {
    icon: Scale,
    title: 'Economic Threshold Tuning',
    description: 'Dynamic decision threshold calibration that balances intervention incentive costs against customer lifetime value (CLV).',
    bg: '#F7F4EF',
    borderColor: 'rgba(82, 183, 136, 0.25)',
  },
  {
    icon: Target,
    title: 'Next-Best Action Optimization',
    description: 'Automated recommendation engine matching individual customer risk profiles to high-ROI retention offers and service upgrades.',
    bg: '#F7F4EF',
    borderColor: 'rgba(224, 122, 95, 0.2)',
  },
  {
    icon: Activity,
    title: 'Causal Uplift Intelligence',
    description: 'Separates true persuadables from natural retenders, preventing wasted campaign budgets on customers who would stay anyway.',
    bg: '#F7F4EF',
    borderColor: 'rgba(45, 106, 79, 0.2)',
  },
  {
    icon: ShieldCheck,
    title: 'Manager-in-the-Loop Audit',
    description: 'Enterprise decision queue enabling retention managers to approve, override, or audit AI decisions with full governance logging.',
    bg: '#F7F4EF',
    borderColor: 'rgba(212, 163, 115, 0.25)',
  },
];

const steps = [
  { num: '01', title: 'Data Ingestion', desc: 'Demographic, subscription, and billing signals are processed through enterprise feature pipelines.' },
  { num: '02', title: 'Risk Scoring', desc: 'Cost-sensitive ML models calculate calibrated churn probability and risk tier classification.' },
  { num: '03', title: 'SHAP Analysis', desc: 'Local feature attribution extracts positive and negative risk factors for full explainability.' },
  { num: '04', title: 'Retention Action', desc: 'Expected economic net value calculation identifies high-priority intervention opportunities.' },
];

export default function HomePage() {
  useEffect(() => {
    document.title = 'RetainX — Enterprise AI Decision Intelligence';
  }, []);

  return (
    <div style={{ overflowX: 'hidden' }}>

      {/* ─── HERO SECTION ─────────────────────────────────────────── */}
      <section style={{
        position: 'relative',
        padding: '72px 0 88px',
        background: '#F7F4EF',
        borderBottom: '1px solid rgba(27, 67, 50, 0.08)',
      }}>
        {/* Subtle analytical radial glow */}
        <div style={{
          position: 'absolute', top: 0, left: '20%', width: 500, height: 400,
          background: 'radial-gradient(circle, rgba(82,183,136,0.08), transparent 70%)',
          pointerEvents: 'none'
        }} />

        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px', position: 'relative' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 32, alignItems: 'center' }}>
            
            {/* Left Content */}
            <div style={{ gridColumn: 'span 12', '@media (min-width: 1024px)': { gridColumn: 'span 7' } }} className="lg:col-span-7">
              {/* Product Badge */}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 9999,
                background: '#D8F3DC', border: '1px solid rgba(45,106,79,0.3)',
                color: '#1B4332', fontSize: 12, fontWeight: 800,
                marginBottom: 24, letterSpacing: '0.04em'
              }}>
                <Sparkles style={{ width: 14, height: 14, color: '#2D6A4F' }} />
                DECISION INTELLIGENCE PLATFORM
              </div>

              {/* Main Headline */}
              <h1 style={{
                fontSize: 'clamp(40px, 5.5vw, 60px)',
                fontWeight: 900,
                lineHeight: 1.08,
                letterSpacing: '-0.03em',
                marginBottom: 20,
                color: '#0F172A',
              }}>
                Turn Churn Risk Into{' '}
                <span style={{ color: '#2D6A4F' }}>Retention Decisions.</span>
              </h1>

              {/* Concise Explanation */}
              <p style={{
                fontSize: 17, lineHeight: 1.65,
                color: '#334155',
                marginBottom: 32,
                maxWidth: 580,
                fontWeight: 500,
              }}>
                RetainX combines cost-sensitive machine learning, explainable AI, and business economics to identify customers worth saving — optimizing retention budget for maximum net revenue impact.
              </p>

              {/* CTAs */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 36 }}>
                <Link to="/predict" className="btn-primary" style={{ fontSize: 15, padding: '13px 28px' }}>
                  Run Prediction
                  <ArrowRight style={{ width: 16, height: 16 }} />
                </Link>
                <Link to="/dashboard" className="btn-secondary" style={{ fontSize: 15, padding: '13px 28px' }}>
                  Explore Analytics
                  <BarChart3 style={{ width: 16, height: 16 }} />
                </Link>
              </div>

              {/* Trust badges */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
                {['Cost-Sensitive Loss Tuning', 'SHAP Explainability', 'Manager Audit Workflow'].map((tag) => (
                  <span
                    key={tag}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      fontSize: 12, fontWeight: 700,
                      color: '#334155',
                      background: '#FFFFFF',
                      border: '1px solid rgba(27,67,50,0.12)',
                      padding: '5px 12px', borderRadius: 9999,
                      boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                    }}
                  >
                    <CheckCircle style={{ width: 13, height: 13, color: '#2D6A4F' }} />
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Right Side - Abstract "Risk Intelligence" Preview Component */}
            <div style={{ gridColumn: 'span 12' }} className="lg:col-span-5">
              <div className="card" style={{
                padding: 24,
                background: '#FFFFFF',
                borderRadius: 22,
                border: '1px solid rgba(27,67,50,0.15)',
                boxShadow: '0 12px 40px rgba(15,23,42,0.06)',
                position: 'relative'
              }}>
                {/* Header preview bar */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, borderBottom: '1px solid #F0EBDD', paddingBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#E07A5F' }} />
                    <span style={{ fontSize: 12, fontWeight: 800, color: '#0F172A', letterSpacing: '0.04em' }}>CUSTOMER RISK ASSESSMENT</span>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#2D6A4F', background: '#D8F3DC', padding: '3px 10px', borderRadius: 9999, border: '1px solid rgba(45,106,79,0.2)' }}>
                    LIVE SIGNAL
                  </span>
                </div>

                {/* Nodes & Topology Abstract Preview */}
                <div style={{
                  background: '#F7F4EF',
                  borderRadius: 14,
                  padding: 16,
                  marginBottom: 16,
                  border: '1px solid rgba(212,163,115,0.25)',
                  position: 'relative'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Customer Node #7829</div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: '#0F172A' }}>Enterprise Telecom Account</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 20, fontWeight: 900, color: '#E07A5F' }}>78.4%</div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#E07A5F', textTransform: 'uppercase' }}>HIGH CHURN RISK</div>
                    </div>
                  </div>

                  {/* Progress probability bar */}
                  <div style={{ height: 8, background: '#E2E8F0', borderRadius: 9999, overflow: 'hidden', marginBottom: 14 }}>
                    <div style={{ height: '100%', width: '78.4%', background: 'linear-gradient(90deg, #D4A373, #E07A5F)', borderRadius: 9999 }} />
                  </div>

                  {/* Node Network Topology visual */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FFFFFF', padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(27,67,50,0.08)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: '#334155' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#2D6A4F' }} />
                      Signal Flow: Demographics → Usage → Billing
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#1B4332' }}>CLV: ₹72,400</span>
                  </div>
                </div>

                {/* SHAP Drivers preview */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                    SHAP Risk Contributions
                  </div>
                  {[
                    { label: 'Month-to-month Contract', val: '+0.34', pos: true },
                    { label: 'No Tech Support Add-on', val: '+0.21', pos: true },
                    { label: 'High Monthly Charges ($105)', val: '+0.18', pos: true },
                    { label: 'Tenure Length (48 mos)', val: '-0.16', pos: false },
                  ].map((item) => (
                    <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, fontSize: 12 }}>
                      <span style={{ color: '#334155', fontWeight: 600 }}>{item.label}</span>
                      <span style={{
                        fontWeight: 800,
                        color: item.pos ? '#E07A5F' : '#2D6A4F',
                        background: item.pos ? 'rgba(224,122,95,0.1)' : '#D8F3DC',
                        padding: '2px 8px', borderRadius: 6
                      }}>
                        {item.val}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Retention Action summary */}
                <div style={{
                  background: '#D8F3DC',
                  borderRadius: 12,
                  padding: '12px 16px',
                  border: '1px solid rgba(45,106,79,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 800, color: '#1B4332', textTransform: 'uppercase' }}>RECOMMENDED INTERVENTION</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A' }}>1-Yr Contract Renewal Discount (15%)</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13, fontWeight: 900, color: '#1B4332' }}>+₹18,200 EV</div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#2D6A4F' }}>420% ROI</div>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ─── BUSINESS IMPACT METRICS ───────────────────────────────── */}
      <section style={{ padding: '48px 0', background: '#F0EBDD', borderBottom: '1px solid rgba(27,67,50,0.08)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
            {stats.map((s) => (
              <div key={s.label} className="card" style={{ padding: 24, textAlign: 'center', background: '#FFFFFF' }}>
                <div style={{ fontSize: 36, fontWeight: 900, color: s.color, lineHeight: 1, marginBottom: 8 }}>{s.value}</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#0F172A' }}>{s.label}</div>
                <div style={{ fontSize: 12, color: '#64748B', marginTop: 4, fontWeight: 500 }}>{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CORE CAPABILITIES ─────────────────────────────────────── */}
      <section style={{ padding: '80px 0', background: '#F7F4EF' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 9999, background: '#D8F3DC', color: '#1B4332', fontSize: 12, fontWeight: 800, marginBottom: 12 }}>
              CORE PLATFORM CAPABILITIES
            </div>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 900, color: '#0F172A', marginBottom: 12 }}>
              Built for Enterprise Decision Intelligence
            </h2>
            <p style={{ color: '#475569', maxWidth: 540, margin: '0 auto', fontSize: 15, fontWeight: 500 }}>
              Going beyond traditional black-box churn scoring by linking predictions directly to economic ROI and retention workflows.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
            {capabilities.map((c) => (
              <div key={c.title} className="card" style={{ padding: 28, background: c.bg, border: `1px solid ${c.borderColor}` }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: 'linear-gradient(135deg, #1B4332, #2D6A4F)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 18, boxShadow: '0 4px 12px rgba(27,67,50,0.2)'
                }}>
                  <c.icon style={{ width: 22, height: 22, color: 'white' }} />
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: '#0F172A', marginBottom: 8 }}>{c.title}</h3>
                <p style={{ fontSize: 14, color: '#334155', lineHeight: 1.6, margin: 0 }}>{c.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW THE INTELLIGENCE PIPELINE WORKS ───────────────────── */}
      <section style={{ padding: '80px 0', background: '#F0EBDD', borderTop: '1px solid rgba(27,67,50,0.08)', borderBottom: '1px solid rgba(27,67,50,0.08)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 9999, background: '#FAEDCD', color: '#78350F', fontSize: 12, fontWeight: 800, marginBottom: 12 }}>
              INTELLIGENCE PIPELINE
            </div>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 900, color: '#0F172A', marginBottom: 12 }}>
              From Data Signals to Retention Value
            </h2>
            <p style={{ color: '#475569', maxWidth: 520, margin: '0 auto', fontSize: 15 }}>
              CUSTOMERS → SIGNALS → RISK → DECISION → RETENTION
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
            {steps.map((s) => (
              <div key={s.num} className="card" style={{ padding: 28, background: '#FFFFFF', height: '100%' }}>
                <div style={{ fontSize: 36, fontWeight: 900, color: '#2D6A4F', lineHeight: 1, marginBottom: 14 }}>{s.num}</div>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', marginBottom: 8 }}>{s.title}</h3>
                <p style={{ fontSize: 13.5, color: '#334155', lineHeight: 1.6, margin: 0 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── EXPLAINABILITY & SHAP SECTION ─────────────────────────── */}
      <section style={{ padding: '80px 0', background: '#F7F4EF' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 36, alignItems: 'center' }}>
            <div style={{ gridColumn: 'span 12' }} className="lg:col-span-6">
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 9999, background: '#D8F3DC', color: '#1B4332', fontSize: 12, fontWeight: 800, marginBottom: 14 }}>
                EXPLAINABLE AI ARCHITECTURE
              </div>
              <h2 style={{ fontSize: 'clamp(28px, 4vw, 38px)', fontWeight: 900, color: '#0F172A', marginBottom: 16, lineHeight: 1.15 }}>
                Understand Exactly WHY Each Customer is At Risk
              </h2>
              <p style={{ fontSize: 15, color: '#334155', lineHeight: 1.65, marginBottom: 20 }}>
                Traditional black-box machine learning models fail retention teams because they predict risk without explanation. RetainX computes exact SHAP feature contributions for every evaluation.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <CheckCircle style={{ width: 18, height: 18, color: '#2D6A4F', flexShrink: 0, marginTop: 2 }} />
                  <span style={{ fontSize: 14, color: '#0F172A', fontWeight: 600 }}>Identify contract vs service vs billing risk factors in real time.</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <CheckCircle style={{ width: 18, height: 18, color: '#2D6A4F', flexShrink: 0, marginTop: 2 }} />
                  <span style={{ fontSize: 14, color: '#0F172A', fontWeight: 600 }}>Highlight protective tenure factors that balance out churn probability.</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <CheckCircle style={{ width: 18, height: 18, color: '#2D6A4F', flexShrink: 0, marginTop: 2 }} />
                  <span style={{ fontSize: 14, color: '#0F172A', fontWeight: 600 }}>Provide retention agents with clear talking points for customer calls.</span>
                </div>
              </div>
              <Link to="/predict" className="btn-primary">
                Test SHAP Explanation Tool
                <ArrowRight style={{ width: 16, height: 16 }} />
              </Link>
            </div>

            <div style={{ gridColumn: 'span 12' }} className="lg:col-span-6">
              <div className="card" style={{ padding: 28, background: '#FFFFFF' }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', marginBottom: 16 }}>
                  SHAP Contribution Visualizer
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {[
                    { feature: 'Contract: Month-to-month', val: '+0.38', color: '#E07A5F', pct: '85%' },
                    { feature: 'Internet: Fiber optic', val: '+0.24', color: '#E07A5F', pct: '60%' },
                    { feature: 'TechSupport: No', val: '+0.19', color: '#E07A5F', pct: '48%' },
                    { feature: 'Tenure: 48 months', val: '-0.15', color: '#2D6A4F', pct: '38%' },
                    { feature: 'Payment: Auto-bank', val: '-0.09', color: '#2D6A4F', pct: '22%' },
                  ].map((f) => (
                    <div key={f.feature}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                        <span style={{ color: '#334155' }}>{f.feature}</span>
                        <span style={{ color: f.color, fontWeight: 800 }}>{f.val}</span>
                      </div>
                      <div style={{ height: 7, background: '#F0EBDD', borderRadius: 9999, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: f.pct, background: f.color, borderRadius: 9999 }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── RETENTION DECISION SECTION ────────────────────────────── */}
      <section style={{ padding: '80px 0', background: '#F0EBDD', borderTop: '1px solid rgba(27,67,50,0.08)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 9999, background: '#D8F3DC', color: '#1B4332', fontSize: 12, fontWeight: 800, marginBottom: 14 }}>
            ECONOMIC DECISION WORKSPACE
          </div>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 900, color: '#0F172A', marginBottom: 16 }}>
            Operationalize Retention for Business Impact
          </h2>
          <p style={{ color: '#475569', maxWidth: 600, margin: '0 auto 40px', fontSize: 15, lineHeight: 1.6 }}>
            Prioritize high-value accounts with positive expected net value (EV). Empower managers with full audit approval tools.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center' }}>
            <Link to="/retention" className="btn-primary" style={{ padding: '14px 32px', fontSize: 15 }}>
              Open Retention Decision Center
              <ArrowRight style={{ width: 16, height: 16 }} />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─────────────────────────────────────────────────── */}
      <footer style={{
        background: '#0F172A',
        color: '#F8FAFC',
        padding: '40px 24px',
        borderTop: '1px solid rgba(255,255,255,0.1)',
      }}>
        <div style={{
          maxWidth: 1280, margin: '0 auto',
          display: 'flex', flexWrap: 'wrap',
          alignItems: 'center', justifyContent: 'space-between',
          gap: 20, fontSize: 13,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg, #1B4332, #2D6A4F)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <ShieldAlert style={{ width: 16, height: 16, color: 'white' }} />
            </div>
            <span style={{ fontWeight: 800, color: '#FFFFFF', fontSize: 15 }}>RetainX AI</span>
            <span style={{ color: '#64748B' }}>|</span>
            <span style={{ color: '#94A3B8' }}>Executive Decision Intelligence Platform</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            {[
              { to: '/', label: 'Home' },
              { to: '/predict', label: 'Predict' },
              { to: '/retention', label: 'Retention Center' },
              { to: '/dashboard', label: 'Analytics' },
              { to: '/history', label: 'History' },
            ].map(({ to, label }) => (
              <Link key={to} to={to} style={{ color: '#CBD5E1', textDecoration: 'none', fontWeight: 600 }}>{label}</Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
