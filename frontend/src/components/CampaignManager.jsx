import React, { useState, useEffect } from 'react';
import { Target, Play, Plus, TrendingUp, DollarSign, Users, Award, ShieldAlert } from 'lucide-react';
import { getCampaigns, createCampaign, launchCampaign } from '../lib/api';

export default function CampaignManager() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [targetSegment, setTargetSegment] = useState('HIGH_RISK_HIGH_VALUE');
  const [budget, setBudget] = useState(50000);
  const [treatmentPct, setTreatmentPct] = useState(0.50);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const res = await getCampaigns();
      setCampaigns(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await createCampaign({
        name,
        target_segment: targetSegment,
        budget: Number(budget),
        treatment_pct: Number(treatmentPct),
        control_pct: 1.0 - Number(treatmentPct)
      });
      setShowModal(false);
      setName('');
      fetchCampaigns();
    } catch (err) {
      alert('Failed to create campaign.');
    }
  };

  const handleLaunch = async (id) => {
    try {
      await launchCampaign(id);
      fetchCampaigns();
    } catch (err) {
      alert('Failed to launch campaign.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#1B4332' }}>Retention Campaigns & Experiments</h2>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748B' }}>
            Manage treatment vs control retention campaigns and measure true causal incremental uplift.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          style={{
            padding: '10px 18px', borderRadius: '10px', border: 'none',
            background: 'linear-gradient(135deg, #1B4332, #2D6A4F)', color: '#FFF',
            fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
          }}
        >
          <Plus style={{ width: 16, height: 16 }} />
          Create New Campaign
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>Loading campaign intelligence...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
          {campaigns.map((c) => (
            <div key={c.campaign_id || c.id} style={{
              background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0',
              padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>{c.name}</h3>
                  <span style={{
                    fontSize: '11px', fontWeight: 800, padding: '4px 10px', borderRadius: '999px',
                    background: c.status === 'ACTIVE' ? '#DCFCE7' : '#F1F5F9',
                    color: c.status === 'ACTIVE' ? '#15803D' : '#64748B'
                  }}>
                    {c.status}
                  </span>
                </div>

                {/* Simulation Badge */}
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                  padding: '2px 8px', borderRadius: '4px', background: '#FEF3C7',
                  border: '1px solid #FCD34D', color: '#B45309', fontSize: '10px', fontWeight: 700, marginTop: '8px'
                }}>
                  {c.data_label || 'Simulation / Demonstration Data'}
                </div>

                {/* Campaign Metrics */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '16px' }}>
                  <div style={{ padding: '10px', background: '#F8FAFC', borderRadius: '8px' }}>
                    <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Treatment Retention</div>
                    <div style={{ fontSize: '18px', fontWeight: 900, color: '#15803D' }}>{(c.treatment_retention_rate * 100).toFixed(1)}%</div>
                    <div style={{ fontSize: '10px', color: '#475569' }}>Count: {c.treatment_count}</div>
                  </div>

                  <div style={{ padding: '10px', background: '#F8FAFC', borderRadius: '8px' }}>
                    <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Control Retention</div>
                    <div style={{ fontSize: '18px', fontWeight: 900, color: '#475569' }}>{(c.control_retention_rate * 100).toFixed(1)}%</div>
                    <div style={{ fontSize: '10px', color: '#475569' }}>Count: {c.control_count}</div>
                  </div>
                </div>

                <div style={{ marginTop: '16px', padding: '12px', background: '#ECFDF5', borderRadius: '10px', border: '1px solid #A7F3D0' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#065F46' }}>Incremental Uplift</div>
                  <div style={{ fontSize: '20px', fontWeight: 900, color: '#065F46' }}>
                    +{(c.incremental_retention_pp * 100).toFixed(1)} pp ({c.incremental_customers_saved} saved)
                  </div>
                  <div style={{ fontSize: '11px', color: '#047857', marginTop: '2px' }}>
                    Realized ROI: <strong>{(c.realized_roi * 100).toFixed(0)}%</strong> | Net: <strong>₹{Number(c.net_incremental_value || 0).toLocaleString()}</strong>
                  </div>
                </div>
              </div>

              {c.status === 'DRAFT' && (
                <button
                  onClick={() => handleLaunch(c.campaign_id || c.id)}
                  style={{
                    width: '100%', marginTop: '16px', padding: '10px', borderRadius: '8px',
                    border: 'none', background: '#1B4332', color: '#FFF', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                  }}
                >
                  <Play style={{ width: 14, height: 14 }} />
                  Launch Experiment
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal for Creating Campaign */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(15,23,42,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
          <div style={{ background: '#FFF', borderRadius: '16px', maxWidth: '480px', width: '100%', padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 800, color: '#1E293B' }}>Create Retention Campaign</h3>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Campaign Name</label>
                <input
                  type="text" required value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Q4 High-Value VIP Retention Campaign"
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Target Segment</label>
                <select
                  value={targetSegment} onChange={(e) => setTargetSegment(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px', background: '#FFF' }}
                >
                  <option value="HIGH_RISK_HIGH_VALUE">HIGH_RISK_HIGH_VALUE</option>
                  <option value="HIGH_RISK_VIP">HIGH_RISK_VIP</option>
                  <option value="ALL_AT_RISK">ALL_AT_RISK</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Campaign Budget (₹)</label>
                <input
                  type="number" required value={budget} onChange={(e) => setBudget(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFF' }}>Cancel</button>
                <button type="submit" style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#1B4332', color: '#FFF', fontWeight: 700 }}>Save Campaign</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
