import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldAlert,
  BrainCircuit,
  BarChart3,
  Target,
  ArrowRight,
  Lock,
  Activity,
  PieChart as PieIcon,
  UploadCloud,
  Cpu,
  Layers,
  KeyRound,
  FileCheck2,
  Building2,
  TrendingUp,
  DollarSign,
  CheckCircle2,
  Zap,
  Sliders,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { useAuth } from '../context/AuthContext';

// Calibration curve bins: compares predicted risk against observed churn
const CALIBRATION_BINS = [
  { bin: 'T1', calibrated: 20, observed: 19.4, count: 1840, label: '0% - 12.5%' },
  { bin: 'T2', calibrated: 35, observed: 34.2, count: 1420, label: '12.5% - 25%' },
  { bin: 'T3', calibrated: 45, observed: 44.8, count: 850, label: '25% - 37.5%' },
  { bin: 'T4', calibrated: 60, observed: 61.1, count: 520, label: '37.5% - 50%' },
  { bin: 'T5', calibrated: 75, observed: 74.3, count: 410, label: '50% - 62.5%' },
  { bin: 'T6', calibrated: 88, observed: 87.5, count: 480, label: '62.5% - 75%' },
  { bin: 'T7', calibrated: 92, observed: 91.8, count: 560, label: '75% - 87.5%' },
  { bin: 'T8', calibrated: 95, observed: 95.2, count: 963, label: '87.5% - 100%' },
];

// Simulated high-resolution portfolio retention curve for the Hero Visual
const HERO_RETENTION_SERIES = [
  { month: 'Jan', baselineLoss: 120, protectedARR: 42, netRetained: 34 },
  { month: 'Feb', baselineLoss: 128, protectedARR: 58, netRetained: 51 },
  { month: 'Mar', baselineLoss: 135, protectedARR: 79, netRetained: 72 },
  { month: 'Apr', baselineLoss: 142, protectedARR: 104, netRetained: 96 },
  { month: 'May', baselineLoss: 150, protectedARR: 132, netRetained: 124 },
  { month: 'Jun', baselineLoss: 158, protectedARR: 165, netRetained: 156 },
  { month: 'Jul', baselineLoss: 164, protectedARR: 198, netRetained: 188 },
];

export default function HomePage() {
  const { isAuthenticated, logout } = useAuth();
  const [activePreviewTab, setActivePreviewTab] = useState('dashboard');
  const [roiMonthlyChurn, setRoiMonthlyChurn] = useState(45);
  const [roiCustomerValue, setRoiCustomerValue] = useState(250);

  // ROI calculations
  const totalChurnCost = roiMonthlyChurn * roiCustomerValue * 12;
  const estimatedSavedCustomers = Math.round(roiMonthlyChurn * 0.38);
  const estimatedAnnualSavings = estimatedSavedCustomers * roiCustomerValue * 12;

  const features = [
    {
      id: 'prediction',
      icon: BrainCircuit,
      tag: '01 / Revenue Protection',
      title: 'Proactive Account Churn Detection',
      desc: 'Identify at-risk accounts 30 to 60 days before contract renewal. Cost-sensitive algorithms prioritize high-ARR enterprise logos over small accounts.',
    },
    {
      id: 'risk',
      icon: Activity,
      tag: '02 / Account Telemetry',
      title: 'Customer Health & Risk Signals',
      desc: 'Detect behavioral friction, declining seat adoption, and billing anomalies across all company accounts before accounts initiate cancellation.',
    },
    {
      id: 'shap',
      icon: BarChart3,
      tag: '03 / Root-Cause Attribution',
      title: 'Explainable Decision Drivers (SHAP)',
      desc: 'Pinpoint the exact commercial and product drivers behind churn risk. Eliminate black-box uncertainty with verifiable factor contributions.',
    },
    {
      id: 'analytics',
      icon: PieIcon,
      tag: '04 / Executive Analytics',
      title: 'Portfolio Revenue Intelligence',
      desc: 'High-density dashboards tracking ARR preserved, cohort retention trends, and churn probability distribution across customer tiers.',
    },
    {
      id: 'training',
      icon: Cpu,
      tag: '05 / Custom Intelligence',
      title: 'Company-Specific Model Training',
      desc: 'Upload historical CRM and subscription telemetry to train isolated, tenant-scoped algorithms fine-tuned to your business model.',
    },
    {
      id: 'retention',
      icon: Target,
      tag: '06 / Decision Hub',
      title: 'Economic Net-Benefit Decisions',
      desc: 'Pair high-risk accounts with tailored retention interventions, verifying positive expected financial ROI before budget is deployed.',
    },
    {
      id: 'campaigns',
      icon: Layers,
      tag: '07 / Action Engine',
      title: 'Manager Intervention Workflows',
      desc: 'Workflow queues with manager approval checkpoints, automated campaign dispatch, and causal revenue uplift tracking.',
    },
  ];

  const workflowSteps = [
    {
      step: '01',
      title: 'Ingest Customer Telemetry',
      subtitle: 'Tenant-Isolated Pipelines',
      desc: 'Sync CRM, usage, and subscription records via automated API or secure CSV import with strict company boundary isolation.',
      icon: UploadCloud,
    },
    {
      step: '02',
      title: 'Calibrate Risk Probabilities',
      subtitle: 'Cost-Sensitive AI',
      desc: 'Train models weighted by customer contract value, minimizing costly false-negative dropouts across key accounts.',
      icon: Cpu,
    },
    {
      step: '03',
      title: 'Audit Decision Drivers',
      subtitle: 'SHAP Feature Attribution',
      desc: 'Understand whether pricing, integration friction, or ticket volume drove the risk score with transparent attribution.',
      icon: BarChart3,
    },
    {
      step: '04',
      title: 'Execute High-ROI Interventions',
      subtitle: 'Manager-Approved Actions',
      desc: 'Deploy targeted incentives and customer success plays that measurably protect annual recurring revenue.',
      icon: Target,
    },
  ];

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-[#0B1F3A] font-sans selection:bg-[#14B8A6] selection:text-white">
      {/* ─── STICKY HEADER NAVIGATION ──────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-[#F1F5F9]/95 backdrop-blur-md border-b border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo: Navy wordmark on light background with shield clear space */}
          <Link to="/" className="flex items-center gap-3.5 group">
            <div className="w-9 h-9 rounded-lg bg-[#0B1F3A] flex items-center justify-center text-[#14B8A6] shadow-sm group-hover:scale-105 transition-transform">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <span className="font-heading text-xl font-bold tracking-tight text-[#0B1F3A]">
              Retain<span className="text-[#14B8A6]">X</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-7 text-xs font-bold uppercase tracking-wider text-[#475569]">
            <a href="#features" className="hover:text-[#0B1F3A] transition-colors">Features</a>
            <a href="#workflow" className="hover:text-[#0B1F3A] transition-colors">How It Works</a>
            <a href="#preview" className="hover:text-[#0B1F3A] transition-colors">Decision Hub</a>
            <a href="#security" className="hover:text-[#0B1F3A] transition-colors">Security</a>
            <a href="#roi" className="hover:text-[#0B1F3A] transition-colors">ARR Calculator</a>
          </nav>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <Link
                  to="/dashboard"
                  className="btn-primary py-2 px-4 text-xs font-bold flex items-center gap-2"
                >
                  <span>Open Workspace</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <button
                  type="button"
                  onClick={logout}
                  className="px-3.5 py-2 text-xs font-bold text-[#64748B] hover:text-[#DC2626] transition-colors cursor-pointer"
                  title="Sign Out of Retain X"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-3.5 py-2 text-xs font-bold text-[#0B1F3A] hover:text-[#14B8A6] transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="btn-primary py-2 px-4 text-xs font-bold flex items-center gap-1.5"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ─── HERO SECTION: DATA CHART AS THE HERO VISUAL ──────────── */}
      <section className="relative w-full pt-12 pb-16 lg:pt-16 lg:pb-24 border-b border-[#E2E8F0] overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            {/* Left Column: Value Proposition & Tagline */}
            <div className="lg:col-span-5 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-[#14B8A6]/10 text-[#0F766E] border border-[#14B8A6]/25">
                <ShieldCheck className="w-4 h-4 text-[#14B8A6]" />
                <span className="tracking-wide">Enterprise Revenue Protection</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-[#0B1F3A] font-heading leading-[1.08]">
                Retain customers. <br />
                <span className="text-[#14B8A6]">Protect revenue.</span>
              </h1>

              <p className="text-sm sm:text-base text-[#475569] leading-relaxed">
                Retain X detects churn friction 60 days before contract renewal and recommends manager-approved retention interventions with guaranteed net-positive ROI.
              </p>

              {/* Business Outcomes Ticker */}
              <div className="grid grid-cols-3 gap-3 pt-2 pb-1">
                <div className="bg-white p-3 rounded-xl border border-[#E2E8F0] shadow-sm">
                  <div className="text-xl sm:text-2xl font-bold font-mono text-[#0B1F3A]">$1.42M</div>
                  <div className="text-[10.5px] font-bold text-[#64748B] uppercase tracking-wider mt-0.5">ARR Protected</div>
                </div>
                <div className="bg-white p-3 rounded-xl border border-[#E2E8F0] shadow-sm">
                  <div className="text-xl sm:text-2xl font-bold font-mono text-[#14B8A6]">38.4%</div>
                  <div className="text-[10.5px] font-bold text-[#64748B] uppercase tracking-wider mt-0.5">Churn Reduction</div>
                </div>
                <div className="bg-white p-3 rounded-xl border border-[#E2E8F0] shadow-sm">
                  <div className="text-xl sm:text-2xl font-bold font-mono text-[#F59E0B]">3.4×</div>
                  <div className="text-[10.5px] font-bold text-[#64748B] uppercase tracking-wider mt-0.5">Intervention ROI</div>
                </div>
              </div>

              {/* Call to Actions */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  to={isAuthenticated ? '/dashboard' : '/signup'}
                  className="btn-primary py-3 px-6 text-sm font-bold flex items-center gap-2"
                >
                  <span>Launch Retention Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <a
                  href="#roi"
                  className="btn-secondary py-3 px-5 text-sm font-bold flex items-center gap-2"
                >
                  <DollarSign className="w-4 h-4 text-[#14B8A6]" />
                  <span>Estimate ARR Saved</span>
                </a>
              </div>

              <div className="flex items-center gap-4 text-xs text-[#64748B] pt-1">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#14B8A6]" />
                  Multi-Tenant Isolation
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#14B8A6]" />
                  SHAP Explainability
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#14B8A6]" />
                  Manager Sign-Off
                </span>
              </div>
            </div>

            {/* Right Column: Hero Visual - Clean Dashboard with Data Charts */}
            <div className="lg:col-span-7">
              <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-xl overflow-hidden">
                {/* Dashboard Header Bar */}
                <div className="bg-[#0B1F3A] px-5 py-3.5 flex items-center justify-between text-white border-b border-[#132F54]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-[#14B8A6]/20 border border-[#14B8A6]/40 flex items-center justify-center text-[#14B8A6]">
                      <Activity className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold font-heading tracking-wide">
                        PORTFOLIO REVENUE RETENTION ENGINE
                      </div>
                      <div className="text-[10px] text-[#94A3B8]">
                        Real-time Intervention Tracking • 7,043 Monitored Accounts
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#14B8A6] text-[#0B1F3A] uppercase font-mono">
                      Live Telemetry
                    </span>
                  </div>
                </div>

                {/* Dashboard Chart Hero Body */}
                <div className="p-5 space-y-4">
                  {/* Risk Category Distribution Badges */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] flex items-center justify-between">
                      <div>
                        <div className="text-[10.5px] font-bold text-[#991B1B] uppercase tracking-wider">High Risk</div>
                        <div className="text-base font-bold font-mono text-[#DC2626]">182 accounts</div>
                      </div>
                      <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626]" />
                    </div>

                    <div className="p-3 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] flex items-center justify-between">
                      <div>
                        <div className="text-[10.5px] font-bold text-[#92400E] uppercase tracking-wider">Medium Risk</div>
                        <div className="text-base font-bold font-mono text-[#F59E0B]">429 accounts</div>
                      </div>
                      <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
                    </div>

                    <div className="p-3 rounded-xl bg-[#F0FDFA] border border-[#99F6E4] flex items-center justify-between">
                      <div>
                        <div className="text-[10.5px] font-bold text-[#0F766E] uppercase tracking-wider">Low Risk</div>
                        <div className="text-base font-bold font-mono text-[#14B8A6]">6,432 accounts</div>
                      </div>
                      <span className="w-2.5 h-2.5 rounded-full bg-[#14B8A6]" />
                    </div>
                  </div>

                  {/* Main Hero Data Chart: Protected ARR vs Expected Churn Loss */}
                  <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="text-xs font-bold text-[#0B1F3A] uppercase tracking-wider">
                          Net Revenue Preserved Through Targeted Retention ($k)
                        </div>
                        <div className="text-[11px] text-[#64748B]">
                          Causal ARR uplift achieved across monthly renewal cycles
                        </div>
                      </div>
                      <span className="text-xs font-bold font-mono text-[#14B8A6]">
                        +$198k/mo saved
                      </span>
                    </div>

                    <div className="h-48 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={HERO_RETENTION_SERIES} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="heroTealGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#14B8A6" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="#14B8A6" stopOpacity={0.0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                          <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#0B1F3A',
                              borderColor: '#132F54',
                              borderRadius: '8px',
                              color: '#FFFFFF',
                              fontSize: '12px',
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="protectedARR"
                            name="Protected ARR ($k)"
                            stroke="#14B8A6"
                            strokeWidth={2.5}
                            fillOpacity={1}
                            fill="url(#heroTealGradient)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Decision Highlight Card (Talks in money & outcomes) */}
                  <div className="bg-white border border-[#E2E8F0] rounded-xl p-3.5 flex items-center justify-between shadow-sm">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#0B1F3A]">Enterprise Account #ACME-890</span>
                        <span className="badge-risk-high text-[10px] py-0 px-2">78% Risk</span>
                      </div>
                      <div className="text-[11.5px] text-[#475569]">
                        Recommended Action: <strong className="text-[#0B1F3A]">Dedicated CS Architect + Annual Commit Incentive</strong>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-mono font-bold text-[#14B8A6]">+$42,000 Net Margin</div>
                      <span className="text-[10px] text-[#64748B]">Manager Sign-Off Ready</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ─── KEY STATS BAR: BUSINESS FIRST METRICS ─────────────────── */}
      <section className="border-b border-[#E2E8F0] bg-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="border-l-2 border-[#14B8A6] pl-4">
              <div className="text-3xl font-black text-[#0B1F3A] font-heading font-mono">$1.42M+</div>
              <div className="text-xs font-bold uppercase tracking-wider text-[#475569] mt-1">Protected ARR</div>
              <div className="text-[11px] text-[#64748B] mt-0.5">Preserved contract recurring revenue</div>
            </div>
            <div className="border-l-2 border-[#0B1F3A] pl-4">
              <div className="text-3xl font-black text-[#0B1F3A] font-heading font-mono">&lt;24h</div>
              <div className="text-xs font-bold uppercase tracking-wider text-[#475569] mt-1">Decision Velocity</div>
              <div className="text-[11px] text-[#64748B] mt-0.5">Early flags 30-60 days before renewal</div>
            </div>
            <div className="border-l-2 border-[#14B8A6] pl-4">
              <div className="text-3xl font-black text-[#0B1F3A] font-heading font-mono">3.4×</div>
              <div className="text-xs font-bold uppercase tracking-wider text-[#475569] mt-1">Intervention ROI</div>
              <div className="text-[11px] text-[#64748B] mt-0.5">Net positive economic return per save</div>
            </div>
            <div className="border-l-2 border-[#F59E0B] pl-4">
              <div className="text-3xl font-black text-[#0B1F3A] font-heading font-mono">100%</div>
              <div className="text-xs font-bold uppercase tracking-wider text-[#475569] mt-1">SHAP Attribution</div>
              <div className="text-[11px] text-[#64748B] mt-0.5">Zero unexplainable black-box decisions</div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FEATURE SHOWCASE ──────────────────────────────────────── */}
      <section id="features" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold uppercase tracking-wider text-[#14B8A6]">
            Built for Revenue Leaders & CS Teams
          </span>
          <h2 className="mt-2 text-3xl sm:text-4xl font-black text-[#0B1F3A] font-heading tracking-tight">
            Comprehensive customer retention decision intelligence
          </h2>
          <p className="mt-3 text-sm text-[#475569]">
            Retain X translates raw customer data into high-ROI retention interventions with complete economic and operational visibility.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.id}
                className="bg-white border border-[#E2E8F0] rounded-2xl p-6 hover:border-[#14B8A6] transition-all hover:-translate-y-1 group shadow-sm"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[#F1F5F9] border border-[#E2E8F0] flex items-center justify-center text-[#0B1F3A] group-hover:bg-[#0B1F3A] group-hover:text-[#14B8A6] transition-colors">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider font-mono">
                    {feat.tag}
                  </span>
                </div>
                <h3 className="text-base font-bold text-[#0B1F3A] mb-2 font-heading">{feat.title}</h3>
                <p className="text-xs text-[#475569] leading-relaxed">{feat.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── INTERACTIVE WORKSPACE PREVIEW ─────────────────────────── */}
      <section id="preview" className="py-20 bg-white border-t border-b border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-[#14B8A6]">
              Live Application Preview
            </span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-black text-[#0B1F3A] font-heading tracking-tight">
              An enterprise retention workspace, not a prototype
            </h2>
            <p className="mt-3 text-sm text-[#475569]">
              Explore calibrated risk scoring, real-time revenue analytics, and human-in-the-loop intervention approval.
            </p>
          </div>

          {/* Preview Tabs */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <button
              type="button"
              onClick={() => setActivePreviewTab('dashboard')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activePreviewTab === 'dashboard'
                  ? 'bg-[#0B1F3A] text-white shadow-md'
                  : 'bg-[#F1F5F9] border border-[#E2E8F0] text-[#475569] hover:text-[#0B1F3A] hover:border-[#0B1F3A]'
              }`}
            >
              Executive Dashboard
            </button>
            <button
              type="button"
              onClick={() => setActivePreviewTab('retention')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activePreviewTab === 'retention'
                  ? 'bg-[#0B1F3A] text-white shadow-md'
                  : 'bg-[#F1F5F9] border border-[#E2E8F0] text-[#475569] hover:text-[#0B1F3A] hover:border-[#0B1F3A]'
              }`}
            >
              Retention Decision Hub
            </button>
            <button
              type="button"
              onClick={() => setActivePreviewTab('studio')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activePreviewTab === 'studio'
                  ? 'bg-[#0B1F3A] text-white shadow-md'
                  : 'bg-[#F1F5F9] border border-[#E2E8F0] text-[#475569] hover:text-[#0B1F3A] hover:border-[#0B1F3A]'
              }`}
            >
              Data & Model Studio
            </button>
          </div>

          {/* Tab Preview Screen */}
          <div className="bg-[#F1F5F9] border border-[#E2E8F0] rounded-2xl p-6 shadow-xl overflow-hidden">
            {activePreviewTab === 'dashboard' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-xs">
                    <span className="text-xs text-[#64748B] font-semibold">Active Customers</span>
                    <div className="text-2xl font-black text-[#0B1F3A] font-heading font-mono mt-1">7,043</div>
                    <span className="text-[11px] text-[#14B8A6] font-bold flex items-center gap-1.5 mt-1">
                      <span className="w-2 h-2 rounded-full bg-[#14B8A6]" />
                      Live Sync
                    </span>
                  </div>
                  <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-xs">
                    <span className="text-xs text-[#64748B] font-semibold">High-Risk Customers</span>
                    <div className="text-2xl font-black text-[#DC2626] font-heading font-mono mt-1">1,869</div>
                    <span className="text-[11px] text-[#DC2626] font-bold mt-1 block">26.5% of total base</span>
                  </div>
                  <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-xs">
                    <span className="text-xs text-[#64748B] font-semibold">Est. Saved Revenue (Mo.)</span>
                    <div className="text-2xl font-black text-[#14B8A6] font-heading font-mono mt-1">$48,250</div>
                    <span className="text-[11px] text-[#64748B] mt-1 block">Targeted next-best actions</span>
                  </div>
                </div>

                <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-[#0B1F3A] font-heading">
                        MODEL PROBABILITY CALIBRATION
                      </div>
                      <p className="text-[11px] text-[#64748B]">
                        Reliability diagram comparing predicted risk probability against true observed churn rate
                      </p>
                    </div>
                    <span className="text-xs text-[#14B8A6] font-bold font-mono bg-[#14B8A6]/10 px-2.5 py-1 rounded-md border border-[#14B8A6]/30 self-start sm:self-auto">
                      Brier Score: 0.128
                    </span>
                  </div>

                  {/* Guaranteed Visible, Responsive Calibration Chart */}
                  <div className="h-56 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={CALIBRATION_BINS} margin={{ top: 10, right: 15, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis
                          dataKey="bin"
                          tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          unit="%"
                          tick={{ fontSize: 11, fill: '#64748B' }}
                          axisLine={false}
                          tickLine={false}
                          domain={[0, 100]}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0B1F3A',
                            borderColor: '#132F54',
                            borderRadius: '8px',
                            color: '#FFFFFF',
                            fontSize: '12px',
                          }}
                          formatter={(val, name, item) => [
                            `${val}% (Observed: ${item.payload.observed}%)`,
                            'Calibrated Churn Prob',
                          ]}
                          labelFormatter={(label, items) => {
                            const match = items?.[0]?.payload;
                            return `${label} Range: ${match?.label || ''} (${match?.count || 0} accounts)`;
                          }}
                        />
                        <Bar
                          dataKey="calibrated"
                          name="Calibrated Probability"
                          fill="#0B1F3A"
                          radius={[4, 4, 0, 0]}
                        >
                          {CALIBRATION_BINS.map((entry, index) => (
                            <Cell
                              key={`cal-cell-${index}`}
                              fill={entry.calibrated > 60 ? '#DC2626' : entry.calibrated > 35 ? '#F59E0B' : '#14B8A6'}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Decile breakdown summary cards */}
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 pt-4 mt-2 border-t border-[#E2E8F0] text-center">
                    {CALIBRATION_BINS.map((item) => (
                      <div key={item.bin} className="p-1.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                        <div className="text-[10px] font-bold text-[#64748B]">{item.bin}</div>
                        <div className="text-xs font-bold font-mono text-[#0B1F3A]">{item.calibrated}%</div>
                        <div className="text-[9px] text-[#94A3B8]">obs: {item.observed}%</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activePreviewTab === 'retention' && (
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-4 shadow-xs">
                <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
                  <div>
                    <h4 className="text-sm font-bold text-[#0B1F3A] font-heading">Manager Decision Queue</h4>
                    <p className="text-xs text-[#64748B]">Prioritized accounts requiring human approval</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#FEF3C7] border border-[#FDE68A] text-[#92400E]">
                    12 Pending Review
                  </span>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="p-3.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="font-bold text-[#0B1F3A]">Cust #3928-XYV • $140/mo Contract (Fiber Optic)</div>
                      <div className="text-[#64748B] mt-0.5">Recommended Action: Priority Support Upgrade + 10% Annual Retention Discount</div>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <span className="text-[#991B1B] font-bold bg-[#FEF2F2] border border-[#FECACA] px-2.5 py-1 rounded-full text-[11px] font-mono">
                        89% Risk
                      </span>
                      <button className="btn-primary py-1 px-3.5 text-xs font-bold">Approve</button>
                    </div>
                  </div>

                  <div className="p-3.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="font-bold text-[#0B1F3A]">Cust #1029-ABB • $95/mo Contract (DSL + Streaming)</div>
                      <div className="text-[#64748B] mt-0.5">Recommended Action: Free Fiber Speed Boost for 6 Months</div>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <span className="text-[#92400E] font-bold bg-[#FFFBEB] border border-[#FDE68A] px-2.5 py-1 rounded-full text-[11px] font-mono">
                        74% Risk
                      </span>
                      <button className="btn-primary py-1 px-3.5 text-xs font-bold">Approve</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activePreviewTab === 'studio' && (
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-4 shadow-xs">
                <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
                  <div>
                    <h4 className="text-sm font-bold text-[#0B1F3A] font-heading">Custom Dataset & Training Studio</h4>
                    <p className="text-xs text-[#64748B]">Manage company datasets and execute candidate model runs</p>
                  </div>
                  <span className="text-xs font-bold text-[#0F766E] bg-[#F0FDFA] border border-[#99F6E4] px-2.5 py-1 rounded-full">
                    ● Model v2.4 Active
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 border border-[#E2E8F0] rounded-xl bg-[#F8FAFC]">
                    <div className="text-xs font-bold text-[#0B1F3A]">Active Model: Calibrated Random Forest</div>
                    <div className="text-[11px] text-[#64748B] mt-1">Trained on 7,043 customer samples • 5-fold Stratified CV</div>
                    <div className="mt-3 flex gap-2">
                      <span className="bg-white border border-[#E2E8F0] px-2.5 py-1 rounded text-[11px] font-bold font-mono text-[#0B1F3A]">
                        ROC-AUC: 0.835
                      </span>
                      <span className="bg-white border border-[#E2E8F0] px-2.5 py-1 rounded text-[11px] font-bold font-mono text-[#0B1F3A]">
                        PR-AUC: 0.642
                      </span>
                    </div>
                  </div>

                  <div className="p-4 border border-[#E2E8F0] rounded-xl bg-[#F8FAFC]">
                    <div className="text-xs font-bold text-[#0B1F3A]">Dataset Ingestion Pipeline</div>
                    <div className="text-[11px] text-[#64748B] mt-1">Validated against 21 feature schema definitions</div>
                    <div className="mt-3">
                      <span className="text-[11px] text-[#0F766E] font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#14B8A6]" />
                        0 Null Imputation Anomalies
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ─── STEP BY STEP WORKFLOW ─────────────────────────────────── */}
      <section id="workflow" className="py-20 bg-white border-t border-b border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-[#14B8A6]">
              End-to-End Execution
            </span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-black text-[#0B1F3A] font-heading tracking-tight">
              From telemetry ingestion to approved retention save
            </h2>
            <p className="mt-3 text-sm text-[#475569]">
              Four seamless steps to protect your subscription base and maximize renewal velocity.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {workflowSteps.map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.step} className="p-6 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black font-mono text-[#CBD5E1]">{step.step}</span>
                    <div className="w-9 h-9 rounded-lg bg-white border border-[#E2E8F0] flex items-center justify-center text-[#14B8A6] shadow-xs">
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>
                  <h3 className="text-sm font-bold text-[#0B1F3A] font-heading">{step.title}</h3>
                  <div className="text-[11px] font-bold text-[#14B8A6] uppercase tracking-wider">{step.subtitle}</div>
                  <p className="text-xs text-[#475569] leading-relaxed">{step.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── INTERACTIVE ROI & RETENTION CALCULATOR ──────────────────── */}
      <section id="roi" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#0B1F3A] text-white rounded-3xl p-8 sm:p-12 border border-[#132F54] shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6 space-y-6">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#132F54] text-[#14B8A6] border border-[#1E3A5F]">
                Executive ROI Calculator
              </span>
              <h2 className="text-3xl sm:text-4xl font-black font-heading tracking-tight text-white leading-tight">
                Calculate your potential annual retention savings
              </h2>
              <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed">
                Adjust account churn and customer value to project how much lost revenue Retain X can preserve through proactive interventions.
              </p>

              <div className="space-y-5 pt-2">
                <div>
                  <div className="flex justify-between text-xs font-bold mb-2">
                    <span>Average Monthly Churned Accounts</span>
                    <span className="text-[#14B8A6] font-mono">{roiMonthlyChurn} accounts / mo</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="300"
                    value={roiMonthlyChurn}
                    onChange={(e) => setRoiMonthlyChurn(Number(e.target.value))}
                    className="w-full accent-[#14B8A6] cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold mb-2">
                    <span>Average Monthly Account Value (ARPU)</span>
                    <span className="text-[#14B8A6] font-mono">${roiCustomerValue} / mo</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="1000"
                    step="25"
                    value={roiCustomerValue}
                    onChange={(e) => setRoiCustomerValue(Number(e.target.value))}
                    className="w-full accent-[#14B8A6] cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="bg-[#132F54] border border-[#1E3A5F] rounded-2xl p-7 space-y-6 shadow-xl">
                <div>
                  <span className="text-xs text-[#94A3B8] font-bold uppercase tracking-wider">
                    Unmanaged Annual Revenue Loss
                  </span>
                  <div className="text-2xl font-black text-[#DC2626] font-heading font-mono mt-1">
                    ${totalChurnCost.toLocaleString()} / year
                  </div>
                </div>

                <div className="border-t border-[#1E3A5F] pt-5">
                  <span className="text-xs text-[#14B8A6] font-bold uppercase tracking-wider">
                    Projected Annual Revenue Protected
                  </span>
                  <div className="text-4xl font-black text-[#14B8A6] font-heading font-mono mt-1">
                    ${estimatedAnnualSavings.toLocaleString()}
                  </div>
                  <p className="text-[11px] text-[#94A3B8] mt-2">
                    Based on a conservative 38% retention save rate achieved by targeted cost-sensitive offers.
                  </p>
                </div>

                <div className="pt-2">
                  <Link
                    to="/signup"
                    className="w-full btn-primary py-3.5 text-xs font-bold flex items-center justify-center gap-2"
                  >
                    <span>Protect This Revenue with Retain X</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── ENTERPRISE SECURITY & COMPLIANCE ──────────────────────── */}
      <section id="security" className="py-20 bg-white border-t border-b border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-[#14B8A6]">
              Enterprise-Grade Governance
            </span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-black text-[#0B1F3A] font-heading tracking-tight">
              Verified multi-tenant architecture & security
            </h2>
            <p className="mt-3 text-sm text-[#475569]">
              Strict server-enforced tenant boundaries and cryptographic token rotation protect your customer telemetry.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-6">
              <Building2 className="w-8 h-8 text-[#0B1F3A] mb-4" />
              <h3 className="text-sm font-bold text-[#0B1F3A] mb-2 font-heading">Zero Tenant Leaks</h3>
              <p className="text-xs text-[#475569] leading-relaxed">
                Every sensitive query enforces verified <code className="text-[#0B1F3A] font-mono font-bold">company_id</code> scope in SQLite/PostgreSQL. No cross-tenant access is possible.
              </p>
            </div>

            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-6">
              <KeyRound className="w-8 h-8 text-[#14B8A6] mb-4" />
              <h3 className="text-sm font-bold text-[#0B1F3A] mb-2 font-heading">Granular Backend RBAC</h3>
              <p className="text-xs text-[#475569] leading-relaxed">
                Role hierarchies (Admin, Manager, Analyst) enforced at the API layer. Model deployments and company settings strictly require Admin authority.
              </p>
            </div>

            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-6">
              <Lock className="w-8 h-8 text-[#0B1F3A] mb-4" />
              <h3 className="text-sm font-bold text-[#0B1F3A] mb-2 font-heading">Secure Token Rotation</h3>
              <p className="text-xs text-[#475569] leading-relaxed">
                Short-lived JWT access tokens paired with rotated refresh tokens, HttpOnly cookie options, and instant session revocation.
              </p>
            </div>

            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-6">
              <FileCheck2 className="w-8 h-8 text-[#14B8A6] mb-4" />
              <h3 className="text-sm font-bold text-[#0B1F3A] mb-2 font-heading">Full Decision Audit Trail</h3>
              <p className="text-xs text-[#475569] leading-relaxed">
                Audit logs for every intervention approval, candidate model activation, and threshold tuning event for governance compliance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CALL TO ACTION ────────────────────────────────────────── */}
      <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-[#0B1F3A] text-[#14B8A6] flex items-center justify-center mx-auto shadow-lg">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-4xl font-black text-[#0B1F3A] font-heading tracking-tight">
            Ready to retain customers and protect revenue?
          </h2>
          <p className="text-sm text-[#475569] leading-relaxed">
            Create an organization workspace in seconds. Connect your account telemetry, score churn risk, and authorize interventions that keep customers active.
          </p>
          <div className="pt-4 flex items-center justify-center gap-4">
            <Link to="/signup" className="btn-primary py-3.5 px-7 text-xs font-bold flex items-center gap-2">
              <span>Create Organization Workspace</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/login" className="btn-secondary py-3.5 px-6 text-xs font-bold">
              Sign In to Existing Account
            </Link>
          </div>
        </div>
      </section>

      {/* ─── FOOTER (Brand Guidelines Aligned) ──────────────────────── */}
      <footer className="border-t border-[#E2E8F0] bg-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
            <div className="col-span-2">
              <Link to="/" className="flex items-center gap-3.5 mb-3">
                <div className="w-7 h-7 rounded-lg bg-[#0B1F3A] flex items-center justify-center text-[#14B8A6]">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <span className="font-heading text-lg font-bold tracking-tight text-[#0B1F3A]">
                  Retain<span className="text-[#14B8A6]">X</span>
                </span>
              </Link>
              <p className="text-xs text-[#475569] max-w-sm leading-relaxed">
                Retain customers. Protect revenue. Enterprise customer retention decision intelligence powered by cost-sensitive algorithms and explainable SHAP attributions.
              </p>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#0B1F3A] mb-3">Product</h4>
              <ul className="space-y-2 text-xs text-[#475569]">
                <li><a href="#features" className="hover:text-[#0B1F3A]">Features</a></li>
                <li><a href="#workflow" className="hover:text-[#0B1F3A]">How It Works</a></li>
                <li><a href="#roi" className="hover:text-[#0B1F3A]">ARR Calculator</a></li>
                <li><Link to="/dashboard" className="hover:text-[#0B1F3A]">Analytics Workspace</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#0B1F3A] mb-3">Security</h4>
              <ul className="space-y-2 text-xs text-[#475569]">
                <li><a href="#security" className="hover:text-[#0B1F3A]">Multi-Tenant Isolation</a></li>
                <li><a href="#security" className="hover:text-[#0B1F3A]">Role-Based Access</a></li>
                <li><a href="#security" className="hover:text-[#0B1F3A]">Token Rotation</a></li>
                <li><a href="#security" className="hover:text-[#0B1F3A]">Audit Logging</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#0B1F3A] mb-3">Account</h4>
              <ul className="space-y-2 text-xs text-[#475569]">
                <li><Link to="/login" className="hover:text-[#0B1F3A]">Sign In</Link></li>
                <li><Link to="/signup" className="hover:text-[#0B1F3A]">Create Organization</Link></li>
                <li><Link to="/forgot-password" className="hover:text-[#0B1F3A]">Forgot Password</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-[#E2E8F0] pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-[#64748B]">
            <div>
              &copy; {new Date().getFullYear()} RetainX Intelligence. All rights reserved.
            </div>
            <div className="mt-2 sm:mt-0 flex items-center gap-6">
              <span>Tagline: Retain customers. Protect revenue.</span>
              <span>Team RetainX</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
