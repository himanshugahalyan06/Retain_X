import React, { useState, useEffect, useRef } from 'react';
import { SlidersHorizontal, ArrowDownRight, ArrowUpRight, Minus, RotateCcw, Sparkles, Loader2, Zap } from 'lucide-react';
import { simulateWhatIf } from '../lib/api';

// Canonical feature config mapper
const FEATURE_CONFIGS = {
  Contract: {
    label: 'Contract Term',
    type: 'select',
    options: ['Month-to-month', 'One year', 'Two year'],
    hint: 'Longer contracts dramatically reduce churn probability',
  },
  MonthlyCharges: {
    label: 'Monthly Charges ($)',
    type: 'slider',
    min: 18,
    max: 120,
    step: 1,
    unit: '$',
    hint: 'Lowering monthly price reduces economic pressure',
  },
  tenure: {
    label: 'Tenure (Months)',
    type: 'slider',
    min: 1,
    max: 72,
    step: 1,
    unit: 'mo',
    hint: 'Mature accounts exhibit lower churn hazard',
  },
  TechSupport: {
    label: 'VIP Tech Support',
    type: 'select',
    options: ['Yes', 'No'],
    hint: 'Active technical support mitigates early frustration',
  },
  OnlineSecurity: {
    label: 'Online Security Addon',
    type: 'select',
    options: ['Yes', 'No'],
    hint: 'Security addons increase account stickiness',
  },
  InternetService: {
    label: 'Internet Service Type',
    type: 'select',
    options: ['Fiber optic', 'DSL', 'No'],
    hint: 'Fiber users often have higher competitive alternatives',
  },
  login_frequency: {
    label: 'Weekly Login Frequency',
    type: 'slider',
    min: 0,
    max: 14,
    step: 0.5,
    unit: 'x/wk',
    hint: 'High active engagement correlates with high retention',
  },
  last_csat_score: {
    label: 'CSAT Satisfaction (1-5)',
    type: 'slider',
    min: 1,
    max: 5,
    step: 1,
    unit: '★',
    hint: 'Customer satisfaction score from recent support interaction',
  },
  total_tickets: {
    label: 'Support Tickets Count',
    type: 'slider',
    min: 0,
    max: 10,
    step: 1,
    unit: 'tix',
    hint: 'High ticket volume indicates unresolved customer friction',
  },
  failed_payments_count: {
    label: 'Failed Payments Count',
    type: 'slider',
    min: 0,
    max: 5,
    step: 1,
    unit: 'fails',
    hint: 'Payment failures signal involuntary churn risk',
  },
};

// Fallback top features if SHAP names are obscure
const DEFAULT_TOP_FEATURES = ['Contract', 'MonthlyCharges', 'TechSupport'];

export default function WhatIfSimulator({ customerData, originalProbability, shapExplanation = [] }) {
  // Extract top 3 features based on SHAP impacts
  const topFeatureKeys = React.useMemo(() => {
    const identified = [];
    if (Array.isArray(shapExplanation) && shapExplanation.length > 0) {
      for (const item of shapExplanation) {
        const rawName = item.name || item.Feature || item.feature || '';
        // Match against our known feature configs
        for (const key of Object.keys(FEATURE_CONFIGS)) {
          if (rawName.toLowerCase().includes(key.toLowerCase()) && !identified.includes(key)) {
            identified.push(key);
            break;
          }
        }
        if (identified.length >= 3) break;
      }
    }

    // Fill remaining slots with defaults
    for (const defKey of DEFAULT_TOP_FEATURES) {
      if (!identified.includes(defKey) && identified.length < 3) {
        identified.push(defKey);
      }
    }
    return identified.slice(0, 3);
  }, [shapExplanation]);

  // Local state for modified values
  const [modifications, setModifications] = useState({});
  const [simResult, setSimResult] = useState(null);
  const [isDebouncing, setIsDebouncing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Initialize modifications whenever customerData or topFeatureKeys change
  useEffect(() => {
    const initialMods = {};
    topFeatureKeys.forEach((key) => {
      initialMods[key] = customerData[key] !== undefined ? customerData[key] : (FEATURE_CONFIGS[key].type === 'slider' ? FEATURE_CONFIGS[key].min : FEATURE_CONFIGS[key].options[0]);
    });
    setModifications(initialMods);
  }, [customerData, topFeatureKeys]);

  // Debounced Simulation Effect (300ms)
  const debounceTimerRef = useRef(null);

  useEffect(() => {
    if (Object.keys(modifications).length === 0) return;

    setIsDebouncing(true);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      setIsDebouncing(false);
      setLoading(true);
      setError(null);
      try {
        const res = await simulateWhatIf({
          customer: customerData,
          modifications: modifications,
        });
        setSimResult(res.data);
      } catch (err) {
        console.error('What-If simulation error:', err);
        setError('Simulation failed to update');
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [modifications, customerData]);

  const handleValueChange = (key, value) => {
    setModifications((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleReset = () => {
    const resetMods = {};
    topFeatureKeys.forEach((key) => {
      resetMods[key] = customerData[key];
    });
    setModifications(resetMods);
  };

  const simProb = simResult?.simulated_probability ?? originalProbability;
  const deltaProb = simResult?.delta_probability ?? (simProb - originalProbability);
  const deltaPct = simResult?.delta_percentage ?? 0;
  const direction = simResult?.impact_direction ?? (deltaProb < -0.005 ? 'REDUCED_RISK' : deltaProb > 0.005 ? 'INCREASED_RISK' : 'NO_CHANGE');

  const isReduced = direction === 'REDUCED_RISK';
  const isIncreased = direction === 'INCREASED_RISK';

  return (
    <div
      className="card"
      style={{
        padding: 24,
        background: '#FFFFFF',
        borderRadius: 16,
        border: '1px solid rgba(45, 106, 79, 0.2)',
        boxShadow: '0 4px 20px rgba(15, 23, 42, 0.04)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: '#D8F3DC',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SlidersHorizontal style={{ width: 16, height: 16, color: '#1B4332' }} />
          </div>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', margin: 0 }}>
              What-If Scenario Simulator
            </h3>
            <p style={{ fontSize: 11.5, color: '#64748B', margin: 0 }}>
              Live sensitivity analysis on Top {topFeatureKeys.length} SHAP risk drivers
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {(isDebouncing || loading) && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#2D6A4F',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                background: '#D8F3DC',
                padding: '3px 8px',
                borderRadius: 9999,
              }}
            >
              <Loader2 style={{ width: 12, height: 12, animation: 'spin 1s linear infinite' }} />
              Simulating...
            </span>
          )}
          <button
            type="button"
            onClick={handleReset}
            title="Reset to original customer profile"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 11.5,
              fontWeight: 700,
              padding: '4px 8px',
              borderRadius: 6,
              background: '#F7F4EF',
              border: '1px solid rgba(212,163,115,0.3)',
              color: '#64748B',
              cursor: 'pointer',
            }}
          >
            <RotateCcw style={{ width: 12, height: 12 }} />
            Reset
          </button>
        </div>
      </div>

      {/* Live Probability Comparison Banner */}
      <div
        style={{
          background: isReduced ? 'rgba(216, 243, 220, 0.45)' : isIncreased ? 'rgba(254, 226, 226, 0.45)' : '#F8FAFC',
          border: `1px solid ${isReduced ? 'rgba(45, 106, 79, 0.3)' : isIncreased ? 'rgba(224, 122, 95, 0.35)' : '#E2E8F0'}`,
          borderRadius: 12,
          padding: '14px 16px',
          marginBottom: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Baseline Risk
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#0F172A' }}>
              {(originalProbability * 100).toFixed(1)}%
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 10px',
                borderRadius: 9999,
                fontSize: 12,
                fontWeight: 800,
                background: isReduced ? '#D8F3DC' : isIncreased ? '#FEE2E2' : '#E2E8F0',
                color: isReduced ? '#1B4332' : isIncreased ? '#991B1B' : '#475569',
              }}
            >
              {isReduced ? <ArrowDownRight style={{ width: 14, height: 14 }} /> : isIncreased ? <ArrowUpRight style={{ width: 14, height: 14 }} /> : <Minus style={{ width: 14, height: 14 }} />}
              {deltaProb > 0 ? `+${(deltaProb * 100).toFixed(1)}%` : `${(deltaProb * 100).toFixed(1)}%`} ({deltaPct > 0 ? `+${deltaPct.toFixed(1)}%` : `${deltaPct.toFixed(1)}%`})
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Simulated Risk
            </div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 900,
                color: isReduced ? '#1B4332' : isIncreased ? '#991B1B' : '#0F172A',
              }}
            >
              {(simProb * 100).toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Progress Visualizer */}
        <div style={{ width: '100%', height: 6, background: '#E2E8F0', borderRadius: 9999, overflow: 'hidden', position: 'relative' }}>
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: `${Math.min(100, Math.max(0, simProb * 100))}%`,
              background: simProb >= 0.5 ? '#E07A5F' : '#2D6A4F',
              transition: 'width 0.3s ease, background 0.3s ease',
            }}
          />
        </div>

        {simResult?.summary && (
          <div style={{ marginTop: 10, fontSize: 12, fontWeight: 600, color: isReduced ? '#1B4332' : isIncreased ? '#991B1B' : '#475569' }}>
            💡 {simResult.summary}
          </div>
        )}
      </div>

      {/* Interactive Controls for Top 3 Features */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {topFeatureKeys.map((key) => {
          const cfg = FEATURE_CONFIGS[key] || {
            label: key,
            type: 'slider',
            min: 0,
            max: 100,
            step: 1,
            unit: '',
            hint: '',
          };
          const currentValue = modifications[key] !== undefined ? modifications[key] : customerData[key];

          return (
            <div
              key={key}
              style={{
                background: '#FBF9F6',
                padding: '12px 14px',
                borderRadius: 10,
                border: '1px solid rgba(212,163,115,0.2)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ fontSize: 12.5, fontWeight: 700, color: '#1E293B' }}>
                  {cfg.label}
                </label>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    color: '#1B4332',
                    background: '#D8F3DC',
                    padding: '2px 8px',
                    borderRadius: 6,
                  }}
                >
                  {cfg.unit === '$' ? `$${currentValue}` : `${currentValue} ${cfg.unit || ''}`}
                </span>
              </div>

              {cfg.type === 'slider' ? (
                <div>
                  <input
                    type="range"
                    min={cfg.min}
                    max={cfg.max}
                    step={cfg.step}
                    value={currentValue ?? cfg.min}
                    onChange={(e) => handleValueChange(key, parseFloat(e.target.value))}
                    style={{
                      width: '100%',
                      accentColor: '#2D6A4F',
                      cursor: 'pointer',
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#94A3B8', marginTop: 2 }}>
                    <span>{cfg.unit === '$' ? `$${cfg.min}` : `${cfg.min} ${cfg.unit || ''}`}</span>
                    <span>{cfg.hint}</span>
                    <span>{cfg.unit === '$' ? `$${cfg.max}` : `${cfg.max} ${cfg.unit || ''}`}</span>
                  </div>
                </div>
              ) : (
                <div>
                  <select
                    value={currentValue}
                    onChange={(e) => handleValueChange(key, e.target.value)}
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: 8,
                      border: '1px solid #CBD5E1',
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: '#0F172A',
                      background: '#FFFFFF',
                      outline: 'none',
                    }}
                  >
                    {cfg.options.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  {cfg.hint && (
                    <div style={{ fontSize: 10.5, color: '#64748B', marginTop: 4 }}>
                      {cfg.hint}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
