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
      <span style={{ borderBottom: '1px dotted #64748B' }}>{term}</span>
      <Info style={{ width: 12, height: 12, color: '#2D6A4F' }} />
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
  
  const color = pct >= 70 ? '#E07A5F' : pct >= 40 ? '#D4A373' : '#2D6A4F';
  const bgBadge = pct >= 70 ? 'rgba(224,122,95,0.12)' : pct >= 40 ? 'rgba(212,163,115,0.18)' : '#D8F3DC';
  const borderBadge = pct >= 70 ? 'rgba(224,122,95,0.35)' : pct >= 40 ? 'rgba(212,163,115,0.4)' : 'rgba(45,106,79,0.3)';

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      background: bgBadge, borderRadius: 18, padding: '20px 24px',
      border: `1px solid ${borderBadge}`, width: '100%'
    }}>
      <div style={{ position: 'relative', width: 140, height: 140 }}>
        <svg style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }} viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(15,23,42,0.08)" strokeWidth="10" />
          <circle
            cx="60" cy="60" r={radius} fill="none"
            stroke={color} strokeWidth="10"
            strokeDasharray={`${strokeDash} ${circ}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 1s ease' }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 36, fontWeight: 900, color: '#0F172A', lineHeight: 1 }}>{pct}%</span>
          <span style={{ fontSize: 11, fontWeight: 800, color, marginTop: 2 }}>CHURN RISK</span>
        </div>
      </div>
      <div style={{ marginTop: 12, fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
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
    document.title = 'ML Analyst Workstation — RetainX';
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
      setError('Could not reach the prediction API. Ensure FastAPI backend is running on http://localhost:8000.');
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
        fill: item.SHAP > 0 ? '#DC2626' : '#059669',
      }))
    : [];

  return (
    <div style={{ maxWidth: 1440, margin: '0 auto', padding: '24px' }}>
      
      {/* Workstation Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>
            Customer Risk Scoring & Decision Workstation
          </h1>
          <p style={{ fontSize: 13, color: '#64748B', marginTop: 3, marginBottom: 0 }}>
            Evaluate individual churn risk probabilities, analyze local <TermTooltip term="SHAP" /> drivers, and simulate retention scenarios.
          </p>
        </div>

        {prediction && (
          <button onClick={reset} className="btn-secondary" style={{ fontSize: 12.5 }}>
            <RotateCcw style={{ width: 14, height: 14 }} />
            Score New Profile
          </button>
        )}
      </div>

      {/* Preset Profiles Bar */}
      <div className="saas-card" style={{ padding: '14px 16px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <Sparkles style={{ width: 15, height: 15, color: '#2563EB' }} />
          <span style={{ fontSize: 12.5, fontWeight: 700, color: '#0F172A' }}>1-Click Analyst Preset Profiles</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
          {PRESETS.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleApplyPreset(p.data)}
              style={{
                textAlign: 'left',
                background: '#F8FAFC',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #E2E8F0',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              className="hover:border-blue-500"
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A' }}>{p.name}</div>
              <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>{p.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* MAIN TWO-COLUMN WORKSTATION LAYOUT */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 20, alignItems: 'start' }}>
        
        {/* ── LEFT COLUMN: CUSTOMER PROFILE FORM ──────────────────── */}
        <div style={{ gridColumn: 'span 12' }} className="lg:col-span-7">
          <div className="saas-card" style={{ padding: 20 }}>
            
            {/* Form Step Nav Tabs */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 20, borderBottom: '1px solid #E2E8F0', paddingBottom: 12 }}>
              {SECTIONS.map((sec, idx) => {
                const Icon = sec.icon;
                const active = activeStep === idx;
                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => setActiveStep(idx)}
                    style={{
                      flex: 1,
                      display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center',
                      padding: '8px 10px',
                      borderRadius: 6,
                      background: active ? '#EFF6FF' : '#F8FAFC',
                      border: `1px solid ${active ? '#BFDBFE' : '#E2E8F0'}`,
                      color: active ? '#1D4ED8' : '#64748B',
                      fontWeight: active ? 700 : 500,
                      fontSize: 12,
                      cursor: 'pointer',
                    }}
                  >
                    <Icon style={{ width: 14, height: 14 }} />
                    {sec.num} {sec.title.split(' ')[0]}
                  </button>
                );
              })}
            </div>

            {/* Current Form Step Content */}
            <div>
              <div style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  {SECTIONS[activeStep].num}. {SECTIONS[activeStep].title}
                </h3>
                <p style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>
                  {SECTIONS[activeStep].subtitle}
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
                {SECTIONS[activeStep].fields.map((field) => (
                  <div key={field.name} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
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
                      <span style={{ fontSize: 11, color: '#94A3B8' }}>{field.hint}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <div style={{ margin: '0 0 20px', padding: '12px 16px', background: 'rgba(224,122,95,0.12)', border: '1px solid rgba(224,122,95,0.3)', borderRadius: 10, color: '#991B1B', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertCircle style={{ width: 16, height: 16, flexShrink: 0 }} />
                {error}
              </div>
            )}

            {/* Step Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, borderTop: '1px solid #F0EBDD' }}>
              <button
                type="button"
                onClick={() => setActiveStep((s) => Math.max(0, s - 1))}
                disabled={activeStep === 0}
                className="btn-secondary"
                style={{ opacity: activeStep === 0 ? 0.4 : 1, fontSize: 13 }}
              >
                <ChevronLeft style={{ width: 16, height: 16 }} /> Previous Section
              </button>

              {activeStep < 2 ? (
                <button
                  type="button"
                  onClick={() => setActiveStep((s) => Math.min(2, s + 1))}
                  className="btn-primary"
                  style={{ fontSize: 13 }}
                >
                  Next Section <ChevronRight style={{ width: 16, height: 16 }} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="btn-primary"
                  style={{ fontSize: 14, padding: '12px 28px' }}
                >
                  {loading ? 'Evaluating Model…' : 'Run Risk Assessment'}
                  <Zap style={{ width: 16, height: 16 }} />
                </button>
              )}
            </div>

          </div>
        </div>

        {/* ── RIGHT COLUMN: RISK INTELLIGENCE PANEL ───────────────── */}
        <div style={{ gridColumn: 'span 12' }} className="lg:col-span-5">
          {!prediction ? (
            /* Calm Empty State */
            <div className="saas-card" style={{ padding: 32, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldCheck style={{ width: 24, height: 24, color: '#2563EB' }} />
              </div>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Ready to assess customer risk
                </h3>
                <p style={{ fontSize: 13, color: '#64748B', marginTop: 4, lineHeight: 1.4, maxWidth: 300 }}>
                  Select a preset profile or enter custom attributes, then click <strong>Run Risk Assessment</strong> to compute calibrated churn probability.
                </p>
              </div>
              <div style={{ background: '#F8FAFC', borderRadius: 8, padding: 12, border: '1px solid #E2E8F0', width: '100%', textAlign: 'left', fontSize: 11.5, color: '#334155' }}>
                <div style={{ fontWeight: 700, color: '#0F172A', marginBottom: 2 }}>Workstation Specifications:</div>
                <div>• Model: Cost-Sensitive Random Forest (AUC 94.2%)</div>
                <div>• Optimization: Asymmetric Loss Matrix Threshold Tuning</div>
                <div>• Local Explainability: SHAP Exact Feature Attribution</div>
              </div>
            </div>
          ) : (
            /* Active Prediction Results Panel */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              
              {/* Gauge Card */}
              <div className="saas-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
                <ProbabilityGauge probability={prediction.probability ?? prediction.risk?.churn_probability ?? 0.0} />

                <div style={{
                  width: '100%', padding: '10px 12px', borderRadius: 8, fontSize: 13, fontWeight: 700, textAlign: 'center',
                  background: (prediction.prediction === 1 || prediction.risk?.churn_probability >= (prediction.threshold ?? 0.10)) ? '#FEF2F2' : '#ECFDF5',
                  border: `1px solid ${(prediction.prediction === 1 || prediction.risk?.churn_probability >= (prediction.threshold ?? 0.10)) ? '#FECACA' : '#A7F3D0'}`,
                  color: (prediction.prediction === 1 || prediction.risk?.churn_probability >= (prediction.threshold ?? 0.10)) ? '#991B1B' : '#065F46'
                }}>
                  {(prediction.prediction === 1 || prediction.risk?.churn_probability >= (prediction.threshold ?? 0.10)) ? '⚠️ High Churn Risk Flagged' : '✓ Customer Retention Stable'}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, width: '100%', fontSize: 12 }}>
                  <div style={{ background: '#F8FAFC', padding: '8px 10px', borderRadius: 6, border: '1px solid #E2E8F0' }}>
                    <div style={{ color: '#64748B', fontWeight: 600 }}>Decision Cutoff</div>
                    <div style={{ fontWeight: 800, color: '#0F172A', marginTop: 2 }}>{Number(prediction.threshold ?? prediction.risk?.threshold ?? 0.10).toFixed(2)}</div>
                  </div>
                  <div style={{ background: '#F8FAFC', padding: '8px 10px', borderRadius: 6, border: '1px solid #E2E8F0' }}>
                    <div style={{ color: '#64748B', fontWeight: 600 }}>Estimated CLV</div>
                    <div style={{ fontWeight: 800, color: '#0F172A', marginTop: 2 }}>${Number(prediction.customer_value ?? prediction.economics?.estimated_economic_value ?? 0).toLocaleString()}</div>
                  </div>
                </div>
              </div>


              {/* SHAP Chart Panel */}
              <div className="saas-card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                    SHAP Feature Drivers
                  </h3>
                  <div style={{ display: 'flex', gap: 8, fontSize: 11, fontWeight: 600 }}>
                    <span style={{ color: '#DC2626' }}>↑ Higher risk</span>
                    <span style={{ color: '#059669' }}>↓ Lower risk</span>
                  </div>
                </div>
                
                {chartData.length > 0 ? (
                  <div style={{ height: 220 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                        <XAxis type="number" hide domain={['dataMin', 'dataMax']} />
                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={130} tick={{ fill: '#334155', fontSize: 11, fontWeight: 600 }} />
                        <Tooltip contentStyle={{ borderRadius: 6, background: '#0F172A', color: '#FFF', fontSize: 12 }} />
                        <ReferenceLine x={0} stroke="#E2E8F0" strokeWidth={1} />
                        <Bar dataKey="value" radius={[3, 3, 3, 3]} barSize={12}>
                          {chartData.map((entry, i) => (
                            <Cell key={i} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', color: '#94A3B8', padding: 20, fontSize: 12 }}>No SHAP drivers calculated.</div>
                )}
              </div>

              {/* What-If Scenario Simulator Panel */}
              <WhatIfSimulator
                customerData={formData}
                originalProbability={prediction.probability}
                shapExplanation={chartData}
              />

              {/* View in Directory Link */}
              <Link to="/customers" className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '10px 14px', textDecoration: 'none' }}>
                View in Customer Intelligence Directory <ArrowUpRight style={{ width: 15, height: 15 }} />
              </Link>

            </div>
          )}
        </div>

      </div>

    </div>
  );
}
