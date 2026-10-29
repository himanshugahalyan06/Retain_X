import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  History, Trash2, ShieldAlert, ShieldCheck, AlertCircle,
  Search, ArrowRight, Filter, X, ChevronDown, Clock, UserCheck
} from 'lucide-react';
import { useHistory } from '../context/HistoryContext';

function RiskBadge({ pct }) {
  if (pct >= 70) return (
    <span className="pill-critical" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <ShieldAlert style={{ width: 12, height: 12 }} /> High ({pct}%)
    </span>
  );
  if (pct >= 40) return (
    <span className="pill-high" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <AlertCircle style={{ width: 12, height: 12 }} /> Medium ({pct}%)
    </span>
  );
  return (
    <span className="pill-low" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <ShieldCheck style={{ width: 12, height: 12 }} /> Low ({pct}%)
    </span>
  );
}

function ExpandedRow({ entry }) {
  const topFeatures = entry.shapData
    ? [...entry.shapData].sort((a, b) => Math.abs(b.SHAP || b.importance || 0) - Math.abs(a.SHAP || a.importance || 0)).slice(0, 5)
    : [];

  function fmtName(name) {
    let c = name.replace('categorical__', '').replace('numerical__', '').replace('remainder__', '');
    if (c.includes('_')) { const p = c.split('_'); c = `${p[0]}: ${p.slice(1).join(' ')}`; }
    return c.charAt(0).toUpperCase() + c.slice(1);
  }

  return (
    <div style={{ background: '#F7F4EF', borderTop: '1px solid #F0EBDD', padding: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
      {/* Customer Profile */}
      <div className="card" style={{ padding: 16, background: '#FFFFFF' }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: 8 }}>
          Customer Profile
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
          {Object.entries(entry.formData).map(([k, v]) => (
            <div key={k}>
              <span style={{ color: '#64748B' }}>{k.replace(/([A-Z])/g, ' $1').trim()}: </span>
              <span style={{ fontWeight: 700, color: '#0F172A' }}>{String(v)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Risk Drivers */}
      <div className="card" style={{ padding: 16, background: '#FFFFFF' }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: 8 }}>
          Top SHAP Risk Drivers
        </div>
        {topFeatures.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {topFeatures.map((f) => {
              const val = parseFloat(f.SHAP || f.importance || 0);
              const isPos = val > 0;
              return (
                <div key={f.Feature || f.feature} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: '#334155', fontWeight: 600 }}>{fmtName(f.Feature || f.feature)}</span>
                  <span style={{ fontWeight: 800, color: isPos ? '#E07A5F' : '#2D6A4F' }}>
                    {isPos ? '+' : ''}{val.toFixed(3)}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: '#94A3B8' }}>No SHAP drivers logged for this evaluation</div>
        )}
      </div>
    </div>
  );
}

export default function HistoryPage() {
  const { history, clearHistory } = useHistory();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    document.title = 'Prediction Audit History — RetainX';
  }, []);

  const filtered = history.filter((entry) => {
    const pct = Math.round(entry.prediction.probability * 100);
    const matchFilter =
      filter === 'all' ||
      (filter === 'churn' && pct >= 70) ||
      (filter === 'medium' && pct >= 40 && pct < 70) ||
      (filter === 'safe' && pct < 40);
    const matchSearch = search === '' || Object.values(entry.formData).some(
      (v) => String(v).toLowerCase().includes(search.toLowerCase())
    );
    return matchFilter && matchSearch;
  });

  return (
    <div style={{ maxWidth: 1340, margin: '0 auto', padding: '40px 24px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 9999, background: '#D8F3DC', color: '#1B4332', fontSize: 12, fontWeight: 800, marginBottom: 8 }}>
            <History style={{ width: 14, height: 14, color: '#2D6A4F' }} />
            SESSION AUDIT LOG
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 950, color: '#0F172A', margin: 0, letterSpacing: '-0.025em' }}>
            Prediction History
          </h1>
          <p style={{ fontSize: 14, color: '#475569', marginTop: 4, fontWeight: 500 }}>
            Comprehensive audit log of all customer churn risk evaluations and decision models.
          </p>
        </div>

        {history.length > 0 && (
          <button
            onClick={clearHistory}
            className="btn-secondary"
            style={{ fontSize: 13, padding: '8px 16px', color: '#991B1B', borderColor: 'rgba(224,122,95,0.3)' }}
          >
            <Trash2 style={{ width: 14, height: 14 }} />
            Clear History
          </button>
        )}
      </div>

      {history.length === 0 ? (
        /* Empty state */
        <div className="card" style={{ padding: 60, textAlign: 'center', background: '#FFFFFF', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: '#F7F4EF', border: '1px solid rgba(212,163,115,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <History style={{ width: 28, height: 28, color: '#D4A373' }} />
          </div>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', margin: 0 }}>No session predictions recorded</h3>
            <p style={{ fontSize: 14, color: '#64748B', maxWidth: 360, margin: '6px 0 20px' }}>
              Evaluated predictions will populate here automatically for auditing and comparison.
            </p>
            <Link to="/predict" className="btn-primary">
              Evaluate First Customer <ArrowRight style={{ width: 16, height: 16 }} />
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Controls Bar */}
          <div className="card" style={{ padding: 16, marginBottom: 20, background: '#FFFFFF', display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ position: 'relative', flexGrow: 1, maxWidth: 360 }}>
              <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: '#94A3B8' }} />
              <input
                type="text"
                placeholder="Search attributes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="form-input"
                style={{ paddingLeft: 38 }}
              />
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { key: 'all', label: 'All Evaluations' },
                { key: 'churn', label: 'High Risk' },
                { key: 'medium', label: 'Medium' },
                { key: 'safe', label: 'Low Risk' },
              ].map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setFilter(opt.key)}
                  style={{
                    padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                    background: filter === opt.key ? '#1B4332' : '#F7F4EF',
                    color: filter === opt.key ? '#FFFFFF' : '#334155',
                    border: `1px solid ${filter === opt.key ? '#1B4332' : 'rgba(212,163,115,0.3)'}`,
                    cursor: 'pointer'
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ fontSize: 12, color: '#64748B', marginBottom: 12, fontWeight: 600 }}>
            Showing {filtered.length} of {history.length} logged evaluations
          </div>

          {/* History Table */}
          <div className="card" style={{ overflow: 'hidden', background: '#FFFFFF' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#F7F4EF', borderBottom: '1px solid #F0EBDD' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontWeight: 800, fontSize: 11, textTransform: 'uppercase' }}>#</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontWeight: 800, fontSize: 11, textTransform: 'uppercase' }}>Timestamp</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontWeight: 800, fontSize: 11, textTransform: 'uppercase' }}>Contract</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontWeight: 800, fontSize: 11, textTransform: 'uppercase' }}>Tenure</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', color: '#475569', fontWeight: 800, fontSize: 11, textTransform: 'uppercase' }}>Monthly Bill</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', color: '#475569', fontWeight: 800, fontSize: 11, textTransform: 'uppercase' }}>Probability</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', color: '#475569', fontWeight: 800, fontSize: 11, textTransform: 'uppercase' }}>Risk Tier</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', color: '#475569', fontWeight: 800, fontSize: 11, textTransform: 'uppercase' }}>Classification</th>
                    <th style={{ padding: '12px 16px' }} />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((entry, idx) => {
                    const pct = Math.round(entry.prediction.probability * 100);
                    const isExpanded = expanded === entry.id;
                    const dt = new Date(entry.timestamp);
                    return (
                      <React.Fragment key={entry.id}>
                        <tr
                          style={{ borderBottom: '1px solid #F0EBDD', cursor: 'pointer', transition: 'background 0.15s' }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#F7F4EF'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          onClick={() => setExpanded(isExpanded ? null : entry.id)}
                        >
                          <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#94A3B8', fontWeight: 700 }}>{history.length - idx}</td>
                          <td style={{ padding: '12px 16px', color: '#334155', fontWeight: 600 }}>{dt.toLocaleTimeString()}</td>
                          <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0F172A' }}>{entry.formData.Contract}</td>
                          <td style={{ padding: '12px 16px', color: '#334155' }}>{entry.formData.tenure} mos</td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, color: '#0F172A' }}>${entry.formData.MonthlyCharges}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 900, color: pct >= 70 ? '#E07A5F' : '#2D6A4F' }}>{pct}%</td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}><RiskBadge pct={pct} /></td>
                          <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 800, color: entry.prediction.prediction === 1 ? '#E07A5F' : '#2D6A4F' }}>
                            {entry.prediction.prediction === 1 ? 'Churn' : 'Retained'}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            <ChevronDown style={{ width: 16, height: 16, color: '#64748B', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={9} style={{ padding: 0 }}>
                              <ExpandedRow entry={entry} />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

    </div>
  );
}
