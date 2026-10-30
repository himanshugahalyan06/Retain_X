import React, { useState, Suspense, lazy } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldAlert,
  BrainCircuit,
  BarChart3,
  Target,
  ArrowRight,
  Lock,
  Activity,
  PieChart,
  UploadCloud,
  Cpu,
  Layers,
  KeyRound,
  FileCheck2,
  Building2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const MascotPortfolioHero = lazy(() => import('../components/ui/mascot-portfolio-hero'));

function HeroFallback() {
  return (
    <div className="relative w-full h-[88svh] min-h-[540px] bg-[#EBEBEA] flex flex-col items-center justify-center border-b border-[#D8D8D5]">
      <div className="flex flex-col items-center gap-3 animate-pulse">
        <div className="w-12 h-12 rounded-2xl bg-white border border-[#D8D8D5] flex items-center justify-center shadow-sm">
          <ShieldAlert className="w-6 h-6 text-[#5FB57A]" />
        </div>
        <span className="text-xs font-bold text-[#656565] uppercase tracking-wider">
          Initializing Intelligence Platform...
        </span>
      </div>
    </div>
  );
}

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
      tag: '01 / ML Core',
      title: 'AI-Powered Churn Prediction',
      desc: 'Cost-sensitive calibrated models trained on your historical subscription data. Asymmetric loss penalties prevent costly false negatives among enterprise accounts.',
    },
    {
      id: 'risk',
      icon: Activity,
      tag: '02 / Risk Engine',
      title: 'Customer Risk Intelligence',
      desc: 'Continuous scoring identifies early friction points, behavioral drops, and billing anomalies weeks before cancellation occurs.',
    },
    {
      id: 'shap',
      icon: BarChart3,
      tag: '03 / Explainability',
      title: 'Explainable AI with SHAP',
      desc: 'Transparent Shapley value attribution for every prediction. Pinpoints exact contractual, support, and engagement drivers for each customer.',
    },
    {
      id: 'analytics',
      icon: PieChart,
      tag: '04 / Analytics',
      title: 'Customer Analytics & Visualization',
      desc: 'High-density interactive charts tracking churn distributions, calibration reliability curves, and cohort risk migration.',
    },
    {
      id: 'training',
      icon: Cpu,
      tag: '05 / Model Studio',
      title: 'Company-Specific Model Training',
      desc: 'Upload custom datasets, inspect automated feature profiling, launch isolated training runs, and activate top-performing candidate models.',
    },
    {
      id: 'retention',
      icon: Target,
      tag: '06 / Decision Hub',
      title: 'Retention Decision Intelligence',
      desc: 'Economic net-benefit calculation pairs high-risk accounts with tailored retention offers, calculating positive expected ROI before intervention.',
    },
    {
      id: 'campaigns',
      icon: Layers,
      tag: '07 / Execution',
      title: 'Campaign & Intervention Management',
      desc: 'Manager-approved intervention workflows with lifecycle tracking, outcome logging, and causal uplift measurement.',
    },
  ];

  const workflowSteps = [
    {
      step: '01',
      title: 'Upload Data',
      subtitle: 'Tenant-Scoped Datasets',
      desc: 'Import demographic, subscription, and CRM telemetry via secure CSV upload or automated API pipelines.',
      icon: UploadCloud,
    },
    {
      step: '02',
      title: 'Train Model',
      subtitle: 'Calibrated Cost-Sensitive ML',
      desc: 'Execute automated training jobs optimizing precision-recall balance and asymmetric business loss.',
      icon: Cpu,
    },
    {
      step: '03',
      title: 'Analyze Risk',
      subtitle: 'SHAP Feature Attribution',
      desc: 'Inspect global feature importance and individual customer risk drivers with zero black-box obscurity.',
      icon: BarChart3,
    },
    {
      step: '04',
      title: 'Retain Customers',
      subtitle: 'Manager-Approved Actions',
      desc: 'Execute high-ROI retention interventions with continuous uplift measurement and audit logging.',
      icon: Target,
    },
  ];

  return (
    <div className="min-h-screen bg-[#EBEBEA] text-[#111111] font-sans selection:bg-[#5FB57A] selection:text-[#111111]">
      {/* ─── STICKY HEADER NAVIGATION ──────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-[#EBEBEA]/95 backdrop-blur-md border-b border-[#D8D8D5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-[#111111] flex items-center justify-center text-[#5FB57A] shadow-sm group-hover:scale-105 transition-transform">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <span className="font-display text-xl tracking-tight text-[#111111]">
              Retain<span className="text-[#5FB57A]">X</span> AI
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-7 text-xs font-bold uppercase tracking-wider text-[#656565]">
            <a href="#features" className="hover:text-[#111111] transition-colors">Features</a>
            <a href="#workflow" className="hover:text-[#111111] transition-colors">How It Works</a>
            <a href="#preview" className="hover:text-[#111111] transition-colors">Workspace</a>
            <a href="#security" className="hover:text-[#111111] transition-colors">Security</a>
            <a href="#roi" className="hover:text-[#111111] transition-colors">ROI Calculator</a>
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
                  className="px-3.5 py-2 text-xs font-bold text-[#656565] hover:text-red-600 transition-colors cursor-pointer"
                  title="Sign Out of Retain X"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-3.5 py-2 text-xs font-bold text-[#111111] hover:text-[#5FB57A] transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="btn-ink py-2 px-4 text-xs font-bold flex items-center gap-1.5"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#5FB57A]" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ─── REFERENCE MASCOT HERO SECTION ─────────────────────────── */}
      <section className="relative w-full border-b border-[#D8D8D5]">
        <Suspense fallback={<HeroFallback />}>
          <MascotPortfolioHero
            height="88svh"
            minHeight="540px"
            index="01/10"
            discipline="AI RETENTION INTELLIGENCE"
            tagline="Understand. Predict. Retain."
            collection={['CUSTOMER', 'INTELLIGENCE']}
            reel={['RETAIN X / AI PLATFORM', 'Cost-Sensitive Retention']}
            year="AI"
            initials="ML"
            badge="Explore Platform"
            line2="CUSTOMER"
            line3="RETENTION"
            word="INTELLIGENCE"
            verticalTag="SaaS"
            bracketed="*"
            seekingLabel="BUILT FOR"
            seeking="SMARTER RETENTION"
            services={[
              'Churn Prediction',
              'Customer Analytics',
              'Explainable AI',
              'Retention Intelligence',
            ]}
            greetings={[
              "Hi there! Let's prevent customer churn.",
              "Understanding churn risk with SHAP explainability.",
              "High-ROI retention interventions ready.",
              "Click on me or explore the platform below!",
            ]}
            href={isAuthenticated ? '/dashboard' : '/login'}
            accent="#5FB57A"
            paper="#EBEBEA"
            ink="#111111"
          />
        </Suspense>
      </section>

      {/* ─── KEY STATS BAR ─────────────────────────────────────────── */}
      <section className="border-b border-[#D8D8D5] bg-white py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="border-l-2 border-[#5FB57A] pl-4">
              <div className="text-3xl font-black text-[#111111] font-display">94.2%</div>
              <div className="text-xs font-bold uppercase tracking-wider text-[#656565] mt-1">Calibrated AUC-ROC</div>
              <div className="text-[11px] text-[#8E8E8A] mt-0.5">Cost-sensitive loss optimization</div>
            </div>
            <div className="border-l-2 border-[#111111] pl-4">
              <div className="text-3xl font-black text-[#111111] font-display">&lt;45ms</div>
              <div className="text-xs font-bold uppercase tracking-wider text-[#656565] mt-1">Prediction Latency</div>
              <div className="text-[11px] text-[#8E8E8A] mt-0.5">Real-time FastAPI inference engine</div>
            </div>
            <div className="border-l-2 border-[#5FB57A] pl-4">
              <div className="text-3xl font-black text-[#111111] font-display">3.4×</div>
              <div className="text-xs font-bold uppercase tracking-wider text-[#656565] mt-1">Retention Spend ROI</div>
              <div className="text-[11px] text-[#8E8E8A] mt-0.5">vs. uncalibrated flat campaigns</div>
            </div>
            <div className="border-l-2 border-[#111111] pl-4">
              <div className="text-3xl font-black text-[#111111] font-display">100%</div>
              <div className="text-xs font-bold uppercase tracking-wider text-[#656565] mt-1">SHAP Explainable</div>
              <div className="text-[11px] text-[#8E8E8A] mt-0.5">No black-box decision models</div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── PRODUCT INTRODUCTION ──────────────────────────────────── */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5 space-y-5">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#F3F3F1] border border-[#D8D8D5] text-[#111111]">
              Engineered for Enterprise SaaS
            </span>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-[#111111] font-display leading-tight">
              Stop guessing why your customers leave.
            </h2>
            <p className="text-sm text-[#656565] leading-relaxed">
              Standard churn models treat all mistakes equally. Retain X applies <strong>cost-sensitive machine learning</strong> that accounts for customer lifetime value (CLV) and intervention costs, helping retention leaders act decisively before renewal windows close.
            </p>
            <div className="pt-2 flex flex-wrap gap-4">
              <Link to="/signup" className="btn-ink py-3 px-6 text-xs font-bold flex items-center gap-2">
                <span>Start Free Trial</span>
                <ArrowRight className="w-4 h-4 text-[#5FB57A]" />
              </Link>
              <a href="#features" className="btn-secondary py-3 px-6 text-xs font-bold">
                Explore Features
              </a>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="bg-white border border-[#D8D8D5] rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-[#D8D8D5] pb-4 mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-[#5FB57A]" />
                  <span className="ml-2 text-xs font-bold text-[#656565]">LIVE PREDICTION FEED</span>
                </div>
                <span className="badge-risk-high text-[11px]">High Risk Customer</span>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-3.5 bg-[#F3F3F1] rounded-xl border border-[#D8D8D5]">
                  <div>
                    <div className="text-sm font-bold text-[#111111]">Customer #7590-VHVEG</div>
                    <div className="text-xs text-[#656565]">Month-to-month • Electronic Check • Fiber 200M</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-black text-red-600 font-display">86.4%</div>
                    <div className="text-[10.5px] uppercase font-bold text-[#656565]">Churn Probability</div>
                  </div>
                </div>

                <div className="p-4 bg-white border border-[#D8D8D5] rounded-xl space-y-2.5">
                  <div className="text-xs font-bold text-[#111111] uppercase tracking-wider flex items-center justify-between">
                    <span>Top Risk Drivers (SHAP)</span>
                    <span className="text-[11px] text-[#5FB57A] font-semibold">Impact on Churn</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div>
                      <div className="flex justify-between text-[11.5px] mb-1">
                        <span className="text-[#111111]">Month-to-month Contract</span>
                        <span className="text-red-600 font-bold">+34.2%</span>
                      </div>
                      <div className="h-1.5 bg-[#F3F3F1] rounded-full overflow-hidden">
                        <div className="h-full bg-red-500 rounded-full" style={{ width: '85%' }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[11.5px] mb-1">
                        <span className="text-[#111111]">Payment Method: Electronic Check</span>
                        <span className="text-red-600 font-bold">+18.9%</span>
                      </div>
                      <div className="h-1.5 bg-[#F3F3F1] rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full" style={{ width: '55%' }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[11.5px] mb-1">
                        <span className="text-[#111111]">Tenure: 1 month</span>
                        <span className="text-red-600 font-bold">+15.1%</span>
                      </div>
                      <div className="h-1.5 bg-[#F3F3F1] rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full" style={{ width: '42%' }} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[11px] uppercase font-bold text-[#5FB57A] block">Next-Best Action</span>
                    <span className="text-xs font-bold text-[#111111]">1-Year Contract Upgrade Offer with $15 Credit</span>
                  </div>
                  <span className="text-xs font-bold text-emerald-800 bg-white px-2.5 py-1 rounded-md border border-emerald-300">
                    +$320 Net ROI
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FEATURE SHOWCASE ──────────────────────────────────────── */}
      <section id="features" className="py-20 bg-white border-t border-b border-[#D8D8D5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-[#5FB57A]">
              Full Spectrum Intelligence
            </span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-black text-[#111111] font-display tracking-tight">
              Enterprise retention capabilities in one cohesive platform
            </h2>
            <p className="mt-3 text-sm text-[#656565]">
              Designed from first principles to bridge the gap between machine learning research and frontline retention operations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feat) => {
              const Icon = feat.icon;
              return (
                <div
                  key={feat.id}
                  className="bg-[#EBEBEA] border border-[#D8D8D5] rounded-2xl p-6 hover:border-[#111111] transition-all hover:-translate-y-1 group"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-white border border-[#D8D8D5] flex items-center justify-center text-[#111111] group-hover:bg-[#111111] group-hover:text-[#5FB57A] transition-colors">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-bold text-[#656565] uppercase tracking-wider font-mono">
                      {feat.tag}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-[#111111] mb-2">{feat.title}</h3>
                  <p className="text-xs text-[#656565] leading-relaxed">{feat.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS (FOUR-STEP WORKFLOW) ──────────────────────── */}
      <section id="workflow" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold uppercase tracking-wider text-[#5FB57A]">
            End-to-End Workflow
          </span>
          <h2 className="mt-2 text-3xl sm:text-4xl font-black text-[#111111] font-display tracking-tight">
            How Retain X delivers measurable ROI
          </h2>
          <p className="mt-3 text-sm text-[#656565]">
            A rigorous 4-step pipeline turning raw customer signals into audited, cost-effective interventions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {workflowSteps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div
                key={step.step}
                className="bg-white border border-[#D8D8D5] rounded-2xl p-6 relative flex flex-col justify-between shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="font-display text-2xl text-[#111111]">{step.step}</span>
                    <div className="w-9 h-9 rounded-lg bg-[#F3F3F1] border border-[#D8D8D5] flex items-center justify-center text-[#5FB57A]">
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>
                  <h3 className="text-base font-bold text-[#111111] mb-1">{step.title}</h3>
                  <div className="text-[11.5px] font-semibold text-[#5FB57A] mb-2.5">{step.subtitle}</div>
                  <p className="text-xs text-[#656565] leading-relaxed">{step.desc}</p>
                </div>
                {idx < workflowSteps.length - 1 && (
                  <div className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-[#111111] text-white flex items-center justify-center text-xs">
                    →
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── AUTHENTIC WORKSPACE PREVIEW ────────────────────────────── */}
      <section id="preview" className="py-20 bg-white border-t border-b border-[#D8D8D5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-[#5FB57A]">
              Live Application Preview
            </span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-black text-[#111111] font-display tracking-tight">
              An enterprise analytics workspace, not a toy
            </h2>
            <p className="mt-3 text-sm text-[#656565]">
              Real-time dashboards, interactive SHAP visualizers, and manager intervention approval queues.
            </p>
          </div>

          {/* Preview Tabs */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <button
              onClick={() => setActivePreviewTab('dashboard')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activePreviewTab === 'dashboard'
                ? 'bg-[#111111] text-white shadow-md'
                : 'bg-[#F3F3F1] border border-[#D8D8D5] text-[#656565] hover:text-[#111111]'
                }`}
            >
              Executive Dashboard
            </button>
            <button
              onClick={() => setActivePreviewTab('retention')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activePreviewTab === 'retention'
                ? 'bg-[#111111] text-white shadow-md'
                : 'bg-[#F3F3F1] border border-[#D8D8D5] text-[#656565] hover:text-[#111111]'
                }`}
            >
              Retention Decision Hub
            </button>
            <button
              onClick={() => setActivePreviewTab('studio')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activePreviewTab === 'studio'
                ? 'bg-[#111111] text-white shadow-md'
                : 'bg-[#F3F3F1] border border-[#D8D8D5] text-[#656565] hover:text-[#111111]'
                }`}
            >
              Data & Model Studio
            </button>
          </div>

          {/* Tab Preview Screen */}
          <div className="bg-[#EBEBEA] border border-[#D8D8D5] rounded-2xl p-6 shadow-2xl overflow-hidden">
            {activePreviewTab === 'dashboard' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white border border-[#D8D8D5] rounded-xl p-4">
                    <span className="text-xs text-[#656565] font-semibold">Active Customers</span>
                    <div className="text-2xl font-black text-[#111111] font-display mt-1">7,043</div>
                    <span className="text-[11px] text-[#5FB57A] font-bold">● Live Sync</span>
                  </div>
                  <div className="bg-white border border-[#D8D8D5] rounded-xl p-4">
                    <span className="text-xs text-[#656565] font-semibold">High-Risk Customers</span>
                    <div className="text-2xl font-black text-red-600 font-display mt-1">1,869</div>
                    <span className="text-[11px] text-red-700 font-bold">26.5% of total base</span>
                  </div>
                  <div className="bg-white border border-[#D8D8D5] rounded-xl p-4">
                    <span className="text-xs text-[#656565] font-semibold">Est. Saved Revenue (Mo.)</span>
                    <div className="text-2xl font-black text-[#5FB57A] font-display mt-1">$48,250</div>
                    <span className="text-[11px] text-[#656565]">Targeted next-best actions</span>
                  </div>
                </div>

                <div className="bg-white border border-[#D8D8D5] rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-xs font-bold uppercase tracking-wider text-[#111111]">
                      Model Probability Calibration
                    </div>
                    <span className="text-xs text-[#5FB57A] font-bold">Brier Score: 0.128</span>
                  </div>
                  <div className="h-44 flex items-end justify-between gap-3 pt-6 border-b border-[#D8D8D5]">
                    {[20, 35, 45, 60, 75, 88, 92, 95].map((val, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                        <div
                          className="w-full bg-[#111111] rounded-t-sm transition-all hover:bg-[#5FB57A]"
                          style={{ height: `${val}%` }}
                        />
                        <span className="text-[10px] text-[#8E8E8A]">T{i + 1}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activePreviewTab === 'retention' && (
              <div className="bg-white border border-[#D8D8D5] rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-[#D8D8D5] pb-3">
                  <div>
                    <h4 className="text-sm font-bold text-[#111111]">Manager Decision Queue</h4>
                    <p className="text-xs text-[#656565]">Prioritized customers requiring human approval</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#F3F3F1] border border-[#D8D8D5] text-[#111111]">
                    12 Pending Review
                  </span>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="p-3 bg-[#F3F3F1] rounded-lg border border-[#D8D8D5] flex items-center justify-between">
                    <div>
                      <div className="font-bold text-[#111111]">Cust #3928-XYV • $140/mo Contract</div>
                      <div className="text-[#656565]">Recommended Action: Priority Support Upgrade + 10% Discount</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-red-700 font-bold bg-red-100 px-2 py-0.5 rounded text-[11px]">89% Risk</span>
                      <button className="btn-primary py-1 px-3 text-[11px]">Approve</button>
                    </div>
                  </div>

                  <div className="p-3 bg-[#F3F3F1] rounded-lg border border-[#D8D8D5] flex items-center justify-between">
                    <div>
                      <div className="font-bold text-[#111111]">Cust #1029-ABB • $95/mo Contract</div>
                      <div className="text-[#656565]">Recommended Action: Free Fiber Speed Boost for 6 Months</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-amber-700 font-bold bg-amber-100 px-2 py-0.5 rounded text-[11px]">74% Risk</span>
                      <button className="btn-primary py-1 px-3 text-[11px]">Approve</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activePreviewTab === 'studio' && (
              <div className="bg-white border border-[#D8D8D5] rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-[#D8D8D5] pb-3">
                  <div>
                    <h4 className="text-sm font-bold text-[#111111]">Custom Dataset & Training Studio</h4>
                    <p className="text-xs text-[#656565]">Manage company datasets and execute candidate model runs</p>
                  </div>
                  <span className="text-xs font-bold text-[#5FB57A]">● Model v2.4 Active</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border border-[#D8D8D5] rounded-lg bg-[#F3F3F1]">
                    <div className="text-xs font-bold text-[#111111]">Active Model: XGBoost Cost-Calibrated</div>
                    <div className="text-[11px] text-[#656565] mt-1">Trained on 7,043 customer samples • 5-fold CV</div>
                    <div className="mt-3 flex gap-2">
                      <span className="bg-white border border-[#D8D8D5] px-2 py-1 rounded text-[10.5px] font-bold">AUC: 0.942</span>
                      <span className="bg-white border border-[#D8D8D5] px-2 py-1 rounded text-[10.5px] font-bold">F1: 0.814</span>
                    </div>
                  </div>

                  <div className="p-4 border border-[#D8D8D5] rounded-lg bg-[#F3F3F1]">
                    <div className="text-xs font-bold text-[#111111]">Dataset Ingestion Pipeline</div>
                    <div className="text-[11px] text-[#656565] mt-1">Validated against 21 feature schema definitions</div>
                    <div className="mt-3">
                      <span className="text-[11px] text-[#5FB57A] font-bold">✓ 0 Null Imputation Anomalies</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ─── INTERACTIVE ROI & RETENTION CALCULATOR ──────────────────── */}
      <section id="roi" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#111111] text-white rounded-3xl p-8 sm:p-12 border border-[#262626] shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6 space-y-6">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#262626] text-[#5FB57A] border border-[#333]">
                Value Calculator
              </span>
              <h2 className="text-3xl font-black font-display tracking-tight text-white">
                Calculate your potential annual retention savings
              </h2>
              <p className="text-xs text-[#8E8E8A] leading-relaxed">
                Tune the inputs to see how cost-calibrated machine learning and targeted offers reduce lost revenue.
              </p>

              <div className="space-y-4 pt-2">
                <div>
                  <div className="flex justify-between text-xs font-bold mb-2">
                    <span>Average Monthly Churned Customers</span>
                    <span className="text-[#5FB57A]">{roiMonthlyChurn} accounts / mo</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="300"
                    value={roiMonthlyChurn}
                    onChange={(e) => setRoiMonthlyChurn(Number(e.target.value))}
                    className="w-full accent-[#5FB57A] cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold mb-2">
                    <span>Average Monthly Customer Value (ARPU)</span>
                    <span className="text-[#5FB57A]">${roiCustomerValue} / mo</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="1000"
                    step="25"
                    value={roiCustomerValue}
                    onChange={(e) => setRoiCustomerValue(Number(e.target.value))}
                    className="w-full accent-[#5FB57A] cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-7 space-y-6">
                <div>
                  <span className="text-xs text-[#8E8E8A] font-bold uppercase tracking-wider">
                    Unmanaged Annual Churn Cost
                  </span>
                  <div className="text-2xl font-black text-red-400 font-display mt-1">
                    ${totalChurnCost.toLocaleString()} / year
                  </div>
                </div>

                <div className="border-t border-[#2A2A2A] pt-5">
                  <span className="text-xs text-[#5FB57A] font-bold uppercase tracking-wider">
                    Estimated Annual Revenue Protected
                  </span>
                  <div className="text-4xl font-black text-[#5FB57A] font-display mt-1">
                    ${estimatedAnnualSavings.toLocaleString()}
                  </div>
                  <p className="text-[11px] text-[#8E8E8A] mt-2">
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
      <section id="security" className="py-20 bg-white border-t border-b border-[#D8D8D5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-[#5FB57A]">
              Security by Architecture
            </span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-black text-[#111111] font-display tracking-tight">
              Verified multi-tenant security architecture
            </h2>
            <p className="mt-3 text-sm text-[#656565]">
              Real backend authorization and tenant isolation — never relying on frontend-only concealment.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-[#F3F3F1] border border-[#D8D8D5] rounded-2xl p-6">
              <Building2 className="w-8 h-8 text-[#111111] mb-4" />
              <h3 className="text-sm font-bold text-[#111111] mb-2">Zero Tenant Leaks</h3>
              <p className="text-xs text-[#656565] leading-relaxed">
                Every sensitive database query enforces server-validated <code className="text-[#111111] font-mono">company_id</code> scope. Company A can never view or execute on Company B data.
              </p>
            </div>

            <div className="bg-[#F3F3F1] border border-[#D8D8D5] rounded-2xl p-6">
              <KeyRound className="w-8 h-8 text-[#5FB57A] mb-4" />
              <h3 className="text-sm font-bold text-[#111111] mb-2">Granular Backend RBAC</h3>
              <p className="text-xs text-[#656565] leading-relaxed">
                Role hierarchies (Admin, Manager, Analyst) enforced on API endpoints. Model activations and settings strictly require Admin authority.
              </p>
            </div>

            <div className="bg-[#F3F3F1] border border-[#D8D8D5] rounded-2xl p-6">
              <Lock className="w-8 h-8 text-[#111111] mb-4" />
              <h3 className="text-sm font-bold text-[#111111] mb-2">Token Rotation</h3>
              <p className="text-xs text-[#656565] leading-relaxed">
                Short-lived JWT access tokens paired with cryptographically rotated refresh tokens and HttpOnly cookie support with session revocation.
              </p>
            </div>

            <div className="bg-[#F3F3F1] border border-[#D8D8D5] rounded-2xl p-6">
              <FileCheck2 className="w-8 h-8 text-[#5FB57A] mb-4" />
              <h3 className="text-sm font-bold text-[#111111] mb-2">Governance Audit Trail</h3>
              <p className="text-xs text-[#656565] leading-relaxed">
                Comprehensive audit logs for model activations, threshold changes, team invitations, and user role updates for governance compliance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CALL TO ACTION ────────────────────────────────────────── */}
      <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-[#111111] text-[#5FB57A] flex items-center justify-center mx-auto shadow-lg">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-4xl font-black text-[#111111] font-display tracking-tight">
            Ready to upgrade your customer retention intelligence?
          </h2>
          <p className="text-sm text-[#656565] leading-relaxed">
            Create an organization workspace in seconds. Invite your team, upload your historical telemetry, and predict customer churn with explainable AI.
          </p>
          <div className="pt-4 flex items-center justify-center gap-4">
            <Link to="/signup" className="btn-ink py-3.5 px-7 text-xs font-bold flex items-center gap-2">
              <span>Create Organization Workspace</span>
              <ArrowRight className="w-4 h-4 text-[#5FB57A]" />
            </Link>
            <Link to="/login" className="btn-secondary py-3.5 px-6 text-xs font-bold">
              Sign In to Existing Account
            </Link>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ────────────────────────────────────────────────── */}
      <footer className="border-t border-[#D8D8D5] bg-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
            <div className="col-span-2">
              <Link to="/" className="flex items-center gap-2.5 mb-3">
                <div className="w-7 h-7 rounded-lg bg-[#111111] flex items-center justify-center text-[#5FB57A]">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <span className="font-display text-lg tracking-tight text-[#111111]">
                  CHURN<span className="text-[#5FB57A]">GUARD</span>
                </span>
              </Link>
              <p className="text-xs text-[#656565] max-w-sm leading-relaxed">
                Enterprise AI customer retention intelligence platform. Calibrated cost-sensitive machine learning and explainable SHAP attributions.
              </p>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#111111] mb-3">Product</h4>
              <ul className="space-y-2 text-xs text-[#656565]">
                <li><a href="#features" className="hover:text-[#111111]">Features</a></li>
                <li><a href="#workflow" className="hover:text-[#111111]">How It Works</a></li>
                <li><a href="#preview" className="hover:text-[#111111]">Analytics Workspace</a></li>
                <li><a href="#roi" className="hover:text-[#111111]">ROI Calculator</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#111111] mb-3">Security</h4>
              <ul className="space-y-2 text-xs text-[#656565]">
                <li><a href="#security" className="hover:text-[#111111]">Multi-Tenant Isolation</a></li>
                <li><a href="#security" className="hover:text-[#111111]">Role-Based Access</a></li>
                <li><a href="#security" className="hover:text-[#111111]">Token Rotation</a></li>
                <li><a href="#security" className="hover:text-[#111111]">Audit Logging</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#111111] mb-3">Account</h4>
              <ul className="space-y-2 text-xs text-[#656565]">
                <li><Link to="/login" className="hover:text-[#111111]">Sign In</Link></li>
                <li><Link to="/signup" className="hover:text-[#111111]">Create Organization</Link></li>
                <li><Link to="/forgot-password" className="hover:text-[#111111]">Forgot Password</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-[#D8D8D5] pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-[#8E8E8A]">
            <div>
              &copy; {new Date().getFullYear()} Retain X AI Inc. All rights reserved.
            </div>
            <div className="mt-2 sm:mt-0 flex items-center gap-6">
              <span>Multi-Tenant Architecture</span>
              <span>Cost-Sensitive Loss Optimization</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
