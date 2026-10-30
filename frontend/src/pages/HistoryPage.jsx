import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  History, Trash2, ShieldAlert, ShieldCheck, AlertCircle,
  Search, ArrowRight, Filter, X, ChevronDown, Clock, UserCheck
} from 'lucide-react';
import { useHistory } from '../context/HistoryContext';

function RiskBadge({ pct }) {
  if (pct >= 70) return (
    <span className="badge-risk-critical" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <ShieldAlert style={{ width: 12, height: 12 }} /> High ({pct}%)
    </span>
  );
  if (pct >= 40) return (
    <span className="badge-risk-medium" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <AlertCircle style={{ width: 12, height: 12 }} /> Medium ({pct}%)
    </span>
  );
  return (
    <span className="badge-risk-low" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
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
    <div style={{ background: '#F3F3F1', borderTop: '1px solid #D8D8D5', padding: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
      {/* Customer Profile */}
      <div className="saas-card" style={{ padding: 16, background: '#FFFFFF' }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: '#656565', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>
          Customer Profile
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
          {Object.entries(entry.formData).map(([k, v]) => (
            <div key={k}>
              <span style={{ color: '#656565' }}>{k.replace(/([A-Z])/g, ' $1').trim()}: </span>
              <span style={{ fontWeight: 700, color: '#111111' }}>{String(v)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Risk Drivers */}
      <div className="saas-card" style={{ padding: 16, background: '#FFFFFF' }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: '#656565', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>
          Top SHAP Risk Drivers
        </div>
        {topFeatures.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {topFeatures.map((f) => {
              const val = parseFloat(f.SHAP || f.importance || 0);
              const isPos = val > 0;
              return (
                <div key={f.Feature || f.feature} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: '#111111', fontWeight: 600 }}>{fmtName(f.Feature || f.feature)}</span>
                  <span style={{ fontWeight: 800, color: isPos ? '#EF4444' : '#5FB57A' }}>
                    {isPos ? '+' : ''}{val.toFixed(3)}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: '#656565' }}>No SHAP drivers logged for this evaluation</div>
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
    document.title = 'Prediction Audit History — Retain X';
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
    <div style={{ maxWidth: 1340, margin: '0 auto', paddingBottom: 60 }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 9999, background: 'rgba(95, 181, 122, 0.15)', color: '#111111', fontSize: 12, fontWeight: 800, marginBottom: 8, border: '1px solid rgba(95, 181, 122, 0.3)' }}>
            <History style={{ width: 14, height: 14, color: '#5FB57A' }} />
            SESSION AUDIT LOG
          </div>
          <h1 className="font-display" style={{ fontSize: 32, fontWeight: 900, color: '#111111', margin: 0, letterSpacing: '-0.025em' }}>
            Prediction History
          </h1>
          <p style={{ fontSize: 14, color: '#656565', marginTop: 4, fontWeight: 500 }}>
            Comprehensive audit log of all customer churn risk evaluations and decision models.
          </p>
        </div>

        {history.length > 0 && (
          <button
            onClick={clearHistory}
            className="btn-secondary"
            style={{ fontSize: 13, padding: '8px 16px', color: '#EF4444', borderColor: '#FCA5A5' }}
          >
            <Trash2 style={{ width: 14, height: 14 }} />
            Clear History
          </button>
        )}
      </div>

      {history.length === 0 ? (
        /* Empty state */
        <div className="saas-card" style={{ padding: 60, textAlign: 'center', background: '#FFFFFF', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: '#F3F3F1', border: '1px solid #D8D8D5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <History style={{ width: 28, height: 28, color: '#5FB57A' }} />
          </div>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#111111', margin: 0 }}>No session predictions recorded</h3>
            <p style={{ fontSize: 14, color: '#656565', maxWidth: 360, margin: '6px 0 20px' }}>
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
          <div className="saas-card" style={{ padding: 16, marginBottom: 20, background: '#FFFFFF', display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ position: 'relative', flexGrow: 1, maxWidth: 360 }}>
              <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: '#656565' }} />
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
                    background: filter === opt.key ? '#111111' : '#F3F3F1',
                    color: filter === opt.key ? '#FFFFFF' : '#111111',
                    border: `1px solid ${filter === opt.key ? '#111111' : '#D8D8D5'}`,
                    cursor: 'pointer'
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ fontSize: 12, color: '#656565', marginBottom: 12, fontWeight: 600 }}>
            Showing {filtered.length} of {history.length} logged evaluations
          </div>

          {/* History Table */}
          <div className="saas-card" style={{ overflow: 'hidden', padding: 0 }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="saas-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Timestamp</th>
                    <th>Contract</th>
                    <th>Tenure</th>
                    <th style={{ textAlign: 'right' }}>Monthly Bill</th>
                    <th style={{ textAlign: 'center' }}>Probability</th>
                    <th style={{ textAlign: 'center' }}>Risk Tier</th>
                    <th style={{ textAlign: 'center' }}>Classification</th>
                    <th />
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
                          style={{ cursor: 'pointer' }}
                          onClick={() => setExpanded(isExpanded ? null : entry.id)}
                        >
                          <td style={{ fontFamily: 'monospace', color: '#656565', fontWeight: 700 }}>{history.length - idx}</td>
                          <td style={{ color: '#111111', fontWeight: 600 }}>{dt.toLocaleTimeString()}</td>
                          <td style={{ fontWeight: 700, color: '#111111' }}>{entry.formData.Contract}</td>
                          <td style={{ color: '#656565' }}>{entry.formData.tenure} mos</td>
                          <td style={{ textAlign: 'right', fontWeight: 800, color: '#111111' }}>${entry.formData.MonthlyCharges}</td>
                          <td style={{ textAlign: 'center', fontWeight: 900, color: pct >= 70 ? '#EF4444' : '#5FB57A' }}>{pct}%</td>
                          <td style={{ textAlign: 'center' }}><RiskBadge pct={pct} /></td>
                          <td style={{ textAlign: 'center', fontWeight: 800, color: entry.prediction.prediction === 1 ? '#EF4444' : '#5FB57A' }}>
                            {entry.prediction.prediction === 1 ? 'Churn' : 'Retained'}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <ChevronDown style={{ width: 16, height: 16, color: '#656565', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
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
