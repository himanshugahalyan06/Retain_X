import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  User, Wifi, CreditCard, ChevronRight, ChevronLeft,
  Zap, ShieldAlert, ShieldCheck, Target, BarChart3,
  AlertCircle, ArrowRight, RotateCcw, Check, Sparkles,
  HelpCircle, DollarSign, Info, ArrowUpRight, Scale
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine
} from 'recharts';
import { predict, explain } from '../lib/api';
import { useHistory } from '../context/HistoryContext';
import WhatIfSimulator from '../components/WhatIfSimulator';

/* ── Tooltip Component for Technical Terms ────────────────────────── */
const TERMS_GLOSSARY = {
  'AUC': 'Area Under Curve (AUC-ROC) measures model discrimination capability (0.5 = random, 1.0 = perfect).',
  'Threshold': 'Cost-sensitive probability cutoff tuned to balance intervention cost vs loss of customer lifetime value.',
  'SHAP': 'Shapley Additive exPlanations quantify exact contribution of each feature towards boosting or lowering risk.',
  'Expected Value': 'Expected Net Financial Savings (EV) = (Predicted Uplift × CLV) - Intervention Incentive Cost.',
  'ROI': 'Return on Investment = Net Financial Savings divided by Intervention Incentive Cost.',
  'Churn Probability': 'Calibrated model score representing likelihood (0-100%) that customer will disconnect service.',
  'CLV': 'Customer Lifetime Value — total expected gross revenue remaining from customer relationship.'
};

function TermTooltip({ term }) {
  const explanation = TERMS_GLOSSARY[term] || 'Technical model metric.';
  return (
    <span className="tooltip-container" style={{ cursor: 'help', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
      <span className="border-b border-dotted border-[#8E8E8A]">{term}</span>
      <Info className="w-3 h-3 text-[#5FB57A]" />
      <span className="tooltip-text">
        <strong>{term}</strong>: {explanation}
      </span>
    </span>
  );
}

/* ── Form Section Definitions ─────────────────────────────────────── */
const SECTIONS = [
  {
    id: 'demographics',
    num: '01',
    title: 'Demographics & Tenure',
    subtitle: 'Account ownership characteristics and tenure duration',
    icon: User,
    fields: [
      { name: 'gender', label: 'Gender', type: 'select', options: ['Female', 'Male'], hint: 'Customer gender identity' },
      { name: 'SeniorCitizen', label: 'Senior Citizen (65+)', type: 'select', options: [0, 1], display: { 0: 'No (Under 65)', 1: 'Yes (65+ years old)' }, hint: 'Is customer 65 years or older' },
      { name: 'Partner', label: 'Partner Linked', type: 'select', options: ['Yes', 'No'], hint: 'Spouse or partner on account' },
      { name: 'Dependents', label: 'Dependents Linked', type: 'select', options: ['Yes', 'No'], hint: 'Children or dependents linked' },
      { name: 'tenure', label: 'Tenure (Months active)', type: 'number', min: 0, max: 72, hint: 'Active tenure duration (0-72 months)' },
    ],
  },
  {
    id: 'services',
    num: '02',
    title: 'Services & Subscriptions',
    subtitle: 'Phone lines, internet type, and add-on security products',
    icon: Wifi,
    fields: [
      { name: 'PhoneService', label: 'Phone Service', type: 'select', options: ['Yes', 'No'], hint: 'Landline/Mobile line subscription' },
      { name: 'MultipleLines', label: 'Multiple Lines', type: 'select', options: ['Yes', 'No', 'No phone service'], hint: 'Multiple active phone lines' },
      { name: 'InternetService', label: 'Internet Service', type: 'select', options: ['Fiber optic', 'DSL', 'No'], hint: 'Fiber optic users have higher churn propensity' },
      { name: 'OnlineSecurity', label: 'Online Security', type: 'select', options: ['Yes', 'No', 'No internet service'], hint: 'Cybersecurity add-on feature' },
      { name: 'OnlineBackup', label: 'Cloud Backup', type: 'select', options: ['Yes', 'No', 'No internet service'], hint: 'Automated cloud storage backup' },
      { name: 'DeviceProtection', label: 'Device Protection', type: 'select', options: ['Yes', 'No', 'No internet service'], hint: 'Hardware warranty protection plan' },
      { name: 'TechSupport', label: 'VIP Tech Support', type: 'select', options: ['Yes', 'No', 'No internet service'], hint: 'Priority technical support desk' },
      { name: 'StreamingTV', label: 'Streaming TV', type: 'select', options: ['Yes', 'No', 'No internet service'], hint: 'Live TV streaming add-on' },
      { name: 'StreamingMovies', label: 'Streaming Movies', type: 'select', options: ['Yes', 'No', 'No internet service'], hint: 'On-demand movies package' },
    ],
  },
  {
    id: 'billing',
    num: '03',
    title: 'Billing & Economics',
    subtitle: 'Contract terms, monthly charges, and custom CLV override',
    icon: CreditCard,
    fields: [
      { name: 'Contract', label: 'Contract Type', type: 'select', options: ['Month-to-month', 'One year', 'Two year'], hint: 'Month-to-month contracts present highest churn risk' },
      { name: 'PaperlessBilling', label: 'Paperless Billing', type: 'select', options: ['Yes', 'No'], hint: 'Digital e-billing enabled' },
      {
        name: 'PaymentMethod', label: 'Payment Method', type: 'select',
        options: ['Electronic check', 'Mailed check', 'Bank transfer (automatic)', 'Credit card (automatic)'],
        hint: 'Electronic check carries higher historical churn rate'
      },
      { name: 'MonthlyCharges', label: 'Monthly Charges ($)', type: 'number', step: 0.01, min: 0, hint: 'Current recurring monthly bill' },
      { name: 'TotalCharges', label: 'Historical Total ($)', type: 'number', step: 0.01, min: 0, hint: 'Cumulative revenue paid to date' },
      { name: 'custom_customer_value', label: 'CLV Override ($) [Optional]', type: 'number', step: 100, min: 0, hint: 'Custom CLV override; leave empty for auto-estimation' }
    ],
  },
];

/* ── Preset Profiles for 1-Click Testing ─────────────────────────── */
const PRESETS = [
  {
    name: '🔴 High Risk Account',
    desc: 'Fiber Optic, Month-to-Month, No Tech Support ($105/mo)',
    data: {
      gender: 'Female', SeniorCitizen: 0, Partner: 'No', Dependents: 'No',
      tenure: 2, PhoneService: 'Yes', MultipleLines: 'Yes',
      InternetService: 'Fiber optic', OnlineSecurity: 'No', OnlineBackup: 'No',
      DeviceProtection: 'No', TechSupport: 'No', StreamingTV: 'Yes', StreamingMovies: 'Yes',
      Contract: 'Month-to-month', PaperlessBilling: 'Yes',
      PaymentMethod: 'Electronic check', MonthlyCharges: 105.35, TotalCharges: 210.70,
    }
  },
  {
    name: '🟡 Medium Risk Account',
    desc: 'DSL Internet, 1-Yr Contract, Moderate bill ($64/mo)',
    data: {
      gender: 'Male', SeniorCitizen: 0, Partner: 'Yes', Dependents: 'No',
      tenure: 14, PhoneService: 'Yes', MultipleLines: 'No',
      InternetService: 'DSL', OnlineSecurity: 'Yes', OnlineBackup: 'No',
      DeviceProtection: 'Yes', TechSupport: 'No', StreamingTV: 'No', StreamingMovies: 'No',
      Contract: 'One year', PaperlessBilling: 'No',
      PaymentMethod: 'Credit card (automatic)', MonthlyCharges: 64.80, TotalCharges: 907.20,
    }
  },
  {
    name: '🟢 Low Risk Account',
    desc: '2-Yr Contract, High Tenure (60m), Full Tech Support ($98/mo)',
    data: {
      gender: 'Female', SeniorCitizen: 0, Partner: 'Yes', Dependents: 'Yes',
      tenure: 60, PhoneService: 'Yes', MultipleLines: 'Yes',
      InternetService: 'Fiber optic', OnlineSecurity: 'Yes', OnlineBackup: 'Yes',
      DeviceProtection: 'Yes', TechSupport: 'Yes', StreamingTV: 'Yes', StreamingMovies: 'Yes',
      Contract: 'Two year', PaperlessBilling: 'Yes',
      PaymentMethod: 'Bank transfer (automatic)', MonthlyCharges: 98.50, TotalCharges: 5910.00,
    }
  }
];

const DEFAULT_STATE = PRESETS[0].data;

function formatFeature(name) {
  let clean = name.replace('categorical__', '').replace('numerical__', '').replace('remainder__', '');
  if (clean.includes('_')) {
    const parts = clean.split('_');
    clean = `${parts[0]}: ${parts.slice(1).join(' ')}`;
  }
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

/* ── Circular Probability Gauge ─────────────────────────────────── */
function ProbabilityGauge({ probability }) {
  const pct = Math.round(probability * 100);
  const radius = 52;
  const circ = 2 * Math.PI * radius;
  const strokeDash = (pct / 100) * circ;
  
  const color = pct >= 70 ? '#EF4444' : pct >= 40 ? '#F59E0B' : '#5FB57A';
  const bgBadge = pct >= 70 ? '#FEF2F2' : pct >= 40 ? '#FFFBEB' : '#EBF7EF';
  const borderBadge = pct >= 70 ? '#FECACA' : pct >= 40 ? '#FDE68A' : '#A6DCB8';

  return (
    <div className="w-full flex flex-col items-center rounded-2xl p-5 border" style={{ background: bgBadge, borderColor: borderBadge }}>
      <div className="relative w-36 h-36">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(17,17,17,0.08)" strokeWidth="10" />
          <circle
            cx="60" cy="60" r={radius} fill="none"
            stroke={color} strokeWidth="10"
            strokeDasharray={`${strokeDash} ${circ}`}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-black text-[#111111] font-display leading-none">{pct}%</span>
          <span className="text-[11px] font-extrabold mt-1 uppercase" style={{ color }}>CHURN RISK</span>
        </div>
      </div>
      <div className="mt-3 text-[11px] font-bold text-[#656565] uppercase tracking-wider">
        <TermTooltip term="Churn Probability" />
      </div>
    </div>
  );
}

export default function PredictPage() {
  const [activeStep, setActiveStep] = useState(0); // 0: Profile, 1: Services, 2: Economics
  const [formData, setFormData] = useState(DEFAULT_STATE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [shapData, setShapData] = useState(null);
  const { addEntry } = useHistory();

  useEffect(() => {
    document.title = 'Risk Scoring & What-If Studio — Retain X';
  }, []);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    let v = value;
    if (type === 'number') {
      v = value === '' ? '' : parseFloat(value);
    } else if (name === 'SeniorCitizen') {
      v = parseInt(value, 10);
    }
    setFormData((prev) => ({ ...prev, [name]: v }));
  };

  const handleApplyPreset = (presetData) => {
    setFormData(presetData);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const [predRes, expRes] = await Promise.all([
        predict(formData),
        explain(formData),
      ]);
      setPrediction(predRes.data);
      setShapData(expRes.data);
      addEntry(formData, predRes.data, expRes.data);
    } catch (err) {
      console.error(err);
      setError('Could not reach the prediction API. Ensure FastAPI backend is online.');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setPrediction(null);
    setShapData(null);
    setError(null);
    setActiveStep(0);
    setFormData(DEFAULT_STATE);
  };

  const chartData = shapData
    ? shapData.map((item) => ({
        name: formatFeature(item.Feature),
        value: parseFloat(item.SHAP),
        fill: item.SHAP > 0 ? '#EF4444' : '#5FB57A',
      }))
    : [];

  return (
    <div className="space-y-6">
      {/* Workstation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#111111] font-display tracking-tight">
            Customer Risk Scoring & Decision Workstation
          </h1>
          <p className="text-xs text-[#656565] mt-1">
            Evaluate individual churn risk probabilities, analyze local <TermTooltip term="SHAP" /> drivers, and simulate retention scenarios.
          </p>
        </div>

        {prediction && (
          <button onClick={reset} className="btn-secondary py-2 px-3 text-xs font-bold flex items-center gap-1.5 self-start">
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Score New Profile</span>
          </button>
        )}
      </div>

      {/* Preset Profiles Bar */}
      <div className="saas-card p-4">
        <div className="flex items-center gap-2 mb-2.5">
          <Sparkles className="w-4 h-4 text-[#5FB57A]" />
          <span className="text-xs font-bold text-[#111111] uppercase tracking-wider">1-Click Test Archetypes</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {PRESETS.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleApplyPreset(p.data)}
              className="text-left bg-[#F3F3F1] hover:bg-white p-3 rounded-xl border border-[#D8D8D5] hover:border-[#111111] transition-all cursor-pointer"
            >
              <div className="text-xs font-bold text-[#111111]">{p.name}</div>
              <div className="text-[11px] text-[#656565] mt-1 line-clamp-1">{p.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* MAIN TWO-COLUMN WORKSTATION LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ── LEFT COLUMN: CUSTOMER PROFILE FORM ──────────────────── */}
        <div className="lg:col-span-7">
          <div className="saas-card p-6">
            {/* Form Step Nav Tabs */}
            <div className="flex gap-2 mb-6 border-b border-[#D8D8D5] pb-3">
              {SECTIONS.map((sec, idx) => {
                const Icon = sec.icon;
                const active = activeStep === idx;
                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => setActiveStep(idx)}
                    className={`flex-1 flex items-center gap-2 justify-center py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                      active
                        ? 'bg-[#111111] text-white shadow-sm'
                        : 'bg-[#F3F3F1] text-[#656565] hover:text-[#111111] border border-[#D8D8D5]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{sec.num}. {sec.title.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>

            {/* Current Form Step Content */}
            <div className="mb-6">
              <div className="mb-4">
                <h3 className="text-base font-bold text-[#111111]">
                  {SECTIONS[activeStep].num}. {SECTIONS[activeStep].title}
                </h3>
                <p className="text-xs text-[#656565] mt-0.5">
                  {SECTIONS[activeStep].subtitle}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {SECTIONS[activeStep].fields.map((field) => (
                  <div key={field.name} className="flex flex-col gap-1">
                    <label className="form-label">{field.label}</label>
                    {field.type === 'select' ? (
                      <select
                        name={field.name}
                        value={formData[field.name]}
                        onChange={handleChange}
                        className="form-input"
                      >
                        {field.options.map((opt) => (
                          <option key={opt} value={opt}>
                            {field.display ? field.display[opt] : opt}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="number"
                        name={field.name}
                        value={formData[field.name] ?? ''}
                        onChange={handleChange}
                        min={field.min ?? 0}
                        max={field.max}
                        step={field.step ?? 1}
                        className="form-input"
                        placeholder="Enter value"
                      />
                    )}
                    {field.hint && (
                      <span className="text-[10.5px] text-[#8E8E8A]">{field.hint}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Step Controls */}
            <div className="flex justify-between items-center pt-4 border-t border-[#D8D8D5]">
              <button
                type="button"
                onClick={() => setActiveStep((s) => Math.max(0, s - 1))}
                disabled={activeStep === 0}
                className="btn-secondary py-2 px-4 text-xs font-bold"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              {activeStep < 2 ? (
                <button
                  type="button"
                  onClick={() => setActiveStep((s) => Math.min(2, s + 1))}
                  className="btn-primary py-2 px-4 text-xs font-bold"
                >
                  <span>Next Section</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="btn-ink py-2.5 px-6 text-xs font-bold flex items-center gap-2"
                >
                  <Zap className="w-4 h-4 text-[#5FB57A]" />
                  <span>{loading ? 'Evaluating Model…' : 'Run Risk Assessment'}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN: RISK INTELLIGENCE PANEL ───────────────── */}
        <div className="lg:col-span-5 space-y-5">
          {!prediction ? (
            /* Calm Empty State */
            <div className="saas-card p-8 text-center flex flex-col items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#F3F3F1] border border-[#D8D8D5] flex items-center justify-center text-[#5FB57A]">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#111111]">
                  Ready to assess customer risk
                </h3>
                <p className="text-xs text-[#656565] mt-1 leading-relaxed max-w-xs mx-auto">
                  Select an archetype or customize fields, then click <strong>Run Risk Assessment</strong> to compute calibrated churn probability.
                </p>
              </div>
              <div className="bg-[#F3F3F1] rounded-xl p-4 border border-[#D8D8D5] w-full text-left text-xs text-[#656565] space-y-1">
                <div className="font-bold text-[#111111]">Inference Pipeline:</div>
                <div>• Calibrated Random Forest / XGBoost</div>
                <div>• Cost-sensitive optimal cutoff applied</div>
                <div>• Exact SHAP tree feature attribution</div>
              </div>
            </div>
          ) : (
            /* Active Prediction Results Panel */
            <div className="space-y-5">
              {/* Gauge Card */}
              <div className="saas-card p-5 flex flex-col items-center gap-4">
                <ProbabilityGauge probability={prediction.probability ?? prediction.risk?.churn_probability ?? 0.0} />

                <div className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold text-center border ${
                  (prediction.prediction === 1 || (prediction.probability ?? 0) >= (prediction.threshold ?? 0.10))
                    ? 'bg-red-50 border-red-200 text-red-800'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}>
                  {(prediction.prediction === 1 || (prediction.probability ?? 0) >= (prediction.threshold ?? 0.10))
                    ? '⚠️ High Churn Risk Flagged'
                    : '✓ Customer Retention Stable'}
                </div>

                <div className="grid grid-cols-2 gap-3 w-full text-xs">
                  <div className="bg-[#F3F3F1] p-3 rounded-xl border border-[#D8D8D5]">
                    <div className="text-[#656565] font-semibold">Decision Cutoff</div>
                    <div className="font-black text-[#111111] text-base font-display mt-0.5">
                      {Number(prediction.threshold ?? 0.42).toFixed(2)}
                    </div>
                  </div>
                  <div className="bg-[#F3F3F1] p-3 rounded-xl border border-[#D8D8D5]">
                    <div className="text-[#656565] font-semibold">Estimated CLV</div>
                    <div className="font-black text-[#111111] text-base font-display mt-0.5">
                      ${Number(prediction.customer_value ?? prediction.economics?.estimated_economic_value ?? 1250).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* SHAP Chart Panel */}
              <div className="saas-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-[#111111]">
                    SHAP Feature Drivers
                  </h3>
                  <div className="flex gap-3 text-[11px] font-bold">
                    <span className="text-red-600">↑ Risk</span>
                    <span className="text-[#5FB57A]">↓ Protective</span>
                  </div>
                </div>

                {chartData.length > 0 ? (
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                        <XAxis type="number" hide domain={['dataMin', 'dataMax']} />
                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={130} tick={{ fill: '#111111', fontSize: 11, fontWeight: 600 }} />
                        <Tooltip contentStyle={{ borderRadius: 8, background: '#111111', border: '1px solid #333333', color: '#FFF', fontSize: 12 }} />
                        <ReferenceLine x={0} stroke="#D8D8D5" strokeWidth={1} />
                        <Bar dataKey="value" radius={[3, 3, 3, 3]} barSize={12}>
                          {chartData.map((entry, i) => (
                            <Cell key={i} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="text-center text-[#8E8E8A] py-6 text-xs">
                    No SHAP drivers calculated.
                  </div>
                )}
              </div>

              {/* What-If Scenario Simulator Panel */}
              <WhatIfSimulator
                customerData={formData}
                originalProbability={prediction.probability}
                shapExplanation={chartData}
              />

              {/* View in Directory Link */}
              <Link to="/customers" className="w-full btn-ink py-2.5 px-4 text-xs font-bold flex items-center justify-center gap-2">
                <span>View in Customer Intelligence Directory</span>
                <ArrowRight className="w-4 h-4 text-[#5FB57A]" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
