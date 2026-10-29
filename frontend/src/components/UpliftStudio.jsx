import React, { useState, useEffect } from 'react';
import { Cpu, Play, BarChart2, CheckCircle2, ShieldAlert, Sparkles, Layers } from 'lucide-react';
import { getUpliftStatus, simulateUplift } from '../lib/api';

export default function UpliftStudio() {
  const [status, setStatus] = useState(null);
  const [simulation, setSimulation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await getUpliftStatus();
      setStatus(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleSimulate = async () => {
    setSimulating(true);
    try {
      const res = await simulateUplift({ num_customers: 500, control_ratio: 0.30 });
      setSimulation(res.data);
      fetchStatus();
    } catch (err) {
      alert('Simulation failed.');
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Top Banner */}
      <div style={{
        padding: '24px', borderRadius: '16px',
        background: 'linear-gradient(135deg, #0F172A, #1E293B)', color: '#FFF',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <Sparkles style={{ width: 18, height: 18, color: '#F59E0B' }} />
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Causal Uplift Engine
            </span>
          </div>
          <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 900 }}>T-Learner Treatment Effect Estimation</h2>
          <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#94A3B8', maxWidth: '600px' }}>
            Establishes Individual Treatment Effects (ITE) P(Retained|Treatment) - P(Retained|Control) to eliminate counterfactual fallacies.
          </p>
        </div>

        <button
          onClick={handleSimulate}
          disabled={simulating}
          style={{
            padding: '12px 20px', borderRadius: '10px', border: 'none',
            background: 'linear-gradient(135deg, #2563EB, #1D4ED8)', color: '#FFF',
            fontSize: '14px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
            boxShadow: '0 4px 14px rgba(37,99,235,0.35)'
          }}
        >
          <Play style={{ width: 16, height: 16 }} />
          {simulating ? 'Running Simulation...' : 'Run A/B Experiment Simulation'}
        </button>
      </div>

      {/* Model Status Card */}
      {status && (
        <div style={{
          background: '#FFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '24px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>Model Architecture & Status</h3>
            <span style={{
              fontSize: '11px', fontWeight: 800, padding: '4px 12px', borderRadius: '999px',
              background: status.is_fitted ? '#DCFCE7' : '#FEF3C7',
              color: status.is_fitted ? '#15803D' : '#D97706'
            }}>
              {status.is_fitted ? 'FITTED & ACTIVE' : 'UNFITTED (USING DOMAIN HEURISTIC)'}
            </span>
          </div>

          {/* Demonstration mode tag */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '4px 10px', borderRadius: '6px', background: '#F8FAFC',
            border: '1px solid #E2E8F0', color: '#64748B', fontSize: '12px', fontWeight: 600, marginBottom: '16px'
          }}>
            <ShieldAlert style={{ width: 14, height: 14, color: '#D97706' }} />
            Data Label: <strong>{status.data_label}</strong>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            <div style={{ padding: '14px', borderRadius: '10px', background: '#F8FAFC' }}>
              <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700 }}>Meta-Learner Type</div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#1E293B', marginTop: '4px' }}>Two-Model Learner (T-Learner)</div>
            </div>

            <div style={{ padding: '14px', borderRadius: '10px', background: '#F8FAFC' }}>
              <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700 }}>Supported Interventions</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#1E293B', marginTop: '4px' }}>
                {status.supported_treatments.length} Active Catalog Actions
              </div>
            </div>

            <div style={{ padding: '14px', borderRadius: '10px', background: '#F8FAFC' }}>
              <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700 }}>Data Framework</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#1E293B', marginTop: '4px' }}>A/B Experiment Allocation</div>
            </div>
          </div>
        </div>
      )}

      {/* Simulation Results Section */}
      {simulation && (
        <div style={{
          background: '#FFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '24px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
        }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
            Latest Experiment Simulation Summary
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
            <div style={{ padding: '16px', borderRadius: '12px', background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B' }}>Total Sample Customers</div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: '#0F172A', marginTop: '4px' }}>{simulation.num_customers}</div>
            </div>

            <div style={{ padding: '16px', borderRadius: '12px', background: '#ECFDF5', border: '1px solid #A7F3D0' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#065F46' }}>Treatment Group Retention</div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: '#065F46', marginTop: '4px' }}>
                {(simulation.observed_treatment_retention * 100).toFixed(1)}%
              </div>
            </div>

            <div style={{ padding: '16px', borderRadius: '12px', background: '#F1F5F9', border: '1px solid #CBD5E1' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>Control Group Retention</div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: '#475569', marginTop: '4px' }}>
                {(simulation.observed_control_retention * 100).toFixed(1)}%
              </div>
            </div>

            <div style={{ padding: '16px', borderRadius: '12px', background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#1E40AF' }}>Average Treatment Effect (ATE)</div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: '#1E40AF', marginTop: '4px' }}>
                +{(simulation.average_treatment_effect_ate * 100).toFixed(1)} pp
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
