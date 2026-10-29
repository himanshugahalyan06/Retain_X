import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  Zap,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Users,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Download,
  Upload,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getRetentionQueue, getRetentionDashboard, uploadBatchCsv } from '../lib/api';
import CustomerDetailDrawer from '../components/CustomerDetailDrawer';

export default function CustomersPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Batch CSV Upload State
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadError, setUploadError] = useState(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [contractFilter, setContractFilter] = useState('ALL');

  // Sorting
  const [sortField, setSortField] = useState('probability');
  const [sortDirection, setSortDirection] = useState('desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Selected customer for side drawer
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);
    setUploadResult(null);

    try {
      const res = await uploadBatchCsv(file);
      setUploadResult(res.data || res);
      await fetchCustomerData();
    } catch (err) {
      console.error('Batch upload failed:', err);
      setUploadError(err.response?.data?.detail || err.message || 'Failed to upload and score CSV batch');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const fetchCustomerData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getRetentionQueue({ limit: 100 });
      const items = res.data?.items || res.items || [];
      setCustomers(items);
    } catch (err) {
      console.error('Failed to load customers:', err);
      setError('Failed to load customer records from server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerData();
  }, []);

  // Filtered and Sorted list
  const processedCustomers = useMemo(() => {
    let result = [...customers];

    // 1. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          (c.customer_id && c.customer_id.toLowerCase().includes(q)) ||
          (c.account_owner && c.account_owner.toLowerCase().includes(q)) ||
          (c.recommended_action && c.recommended_action.toLowerCase().includes(q))
      );
    }

    // 2. Risk Level Filter
    if (riskFilter !== 'ALL') {
      result = result.filter((c) => {
        const level = (c.risk_level || c.risk_badge || '').toUpperCase();
        return level === riskFilter;
      });
    }

    // 3. Contract Filter
    if (contractFilter !== 'ALL') {
      result = result.filter((c) => (c.contract || c.Contract) === contractFilter);
    }

    // 4. Sorting
    result.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      // Handle nested or fallback values
      if (sortField === 'probability') {
        aVal = a.churn_probability ?? a.probability ?? 0;
        bVal = b.churn_probability ?? b.probability ?? 0;
      } else if (sortField === 'monthly_charges') {
        aVal = a.monthly_charges ?? a.MonthlyCharges ?? 0;
        bVal = b.monthly_charges ?? b.MonthlyCharges ?? 0;
      } else if (sortField === 'tenure') {
        aVal = a.tenure ?? 0;
        bVal = b.tenure ?? 0;
      } else if (sortField === 'customer_id') {
        aVal = a.customer_id ?? '';
        bVal = b.customer_id ?? '';
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [customers, searchQuery, riskFilter, contractFilter, sortField, sortDirection]);

  // Pagination slice
  const totalRecords = processedCustomers.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return processedCustomers.slice(start, start + pageSize);
  }, [processedCustomers, currentPage, pageSize]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getRiskBadge = (level, prob) => {
    const lvl = (level || (prob >= 0.75 ? 'CRITICAL' : prob >= 0.45 ? 'HIGH' : prob >= 0.2 ? 'MEDIUM' : 'LOW')).toUpperCase();
    if (lvl === 'CRITICAL' || lvl === 'HIGH') {
      return (
        <span className="badge-risk-high">
          <span className="dot" />
          {lvl}
        </span>
      );
    }
    if (lvl === 'MEDIUM') {
      return (
        <span className="badge-risk-med">
          <span className="dot" />
          MEDIUM
        </span>
      );
    }
    return (
      <span className="badge-risk-low">
        <span className="dot" />
        LOW
      </span>
    );
  };

  return (
    <div style={{ padding: '24px', maxWidth: 1440, margin: '0 auto' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>
            Customer Directory & Risk Intelligence
          </h1>
          <p style={{ fontSize: 13, color: '#64748B', marginTop: 3, marginBottom: 0 }}>
            Monitor scored accounts, inspect behavioral drivers, and launch targeted retention workflows.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="btn-primary"
            style={{ fontSize: 12.5, padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Upload style={{ width: 14, height: 14 }} />
            {uploading ? 'Processing & Scoring...' : 'Upload CSV Batch'}
          </button>

          <button
            onClick={fetchCustomerData}
            disabled={loading}
            className="btn-secondary"
            style={{ fontSize: 12.5, padding: '7px 12px' }}
          >
            <RefreshCw style={{ width: 14, height: 14, animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
        </div>
      </div>

      {/* Batch Processing Status Banner */}
      {uploadResult && (
        <div
          className="saas-card"
          style={{
            padding: '16px 20px',
            marginBottom: 16,
            background: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)',
            border: '1px solid #86EFAC',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#22C55E', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF' }}>
              <CheckCircle2 style={{ width: 20, height: 20 }} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#14532D' }}>
                Batch Ingested & Scored Successfully
              </div>
              <div style={{ fontSize: 12.5, color: '#166534', marginTop: 2, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <span>Total: <strong>{uploadResult.total_records} accounts</strong></span>
                <span>High Risk: <strong style={{ color: '#DC2626' }}>{uploadResult.high_risk_count}</strong></span>
                <span>Medium Risk: <strong style={{ color: '#D97706' }}>{uploadResult.medium_risk_count}</strong></span>
                <span>At-Risk Revenue: <strong>${Number(uploadResult.estimated_at_risk_revenue || 0).toLocaleString()}</strong></span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {uploadResult.download_url && (
              <a
                href={uploadResult.download_url}
                target="_blank"
                rel="noreferrer"
                download
                className="btn-secondary"
                style={{ fontSize: 12, padding: '6px 12px', background: '#FFFFFF', color: '#15803D', borderColor: '#86EFAC', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
              >
                <Download style={{ width: 13, height: 13 }} />
                Download Scored CSV
              </a>
            )}
            <button
              onClick={() => setUploadResult(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#15803D', padding: 4 }}
            >
              <X style={{ width: 16, height: 16 }} />
            </button>
          </div>
        </div>
      )}

      {uploadError && (
        <div
          className="saas-card"
          style={{
            padding: '14px 18px',
            marginBottom: 16,
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#991B1B', fontSize: 13 }}>
            <AlertTriangle style={{ width: 18, height: 18, flexShrink: 0 }} />
            <span>{uploadError}</span>
          </div>
          <button
            onClick={() => setUploadError(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#991B1B', padding: 4 }}
          >
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>
      )}

      {/* Filter & Search Toolbar */}
      <div
        className="saas-card"
        style={{
          padding: '14px 16px',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        {/* Search Bar */}
        <div style={{ position: 'relative', width: '100%', maxWidth: 320 }}>
          <Search style={{ position: 'absolute', left: 10, top: 9, width: 15, height: 15, color: '#94A3B8' }} />
          <input
            type="text"
            placeholder="Search Customer ID or action..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="form-input"
            style={{ paddingLeft: 34, fontSize: 12.5 }}
          />
        </div>

        {/* Filter Dropdowns */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#64748B' }}>Risk:</span>
            <select
              value={riskFilter}
              onChange={(e) => {
                setRiskFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                padding: '6px 10px',
                borderRadius: 6,
                border: '1px solid #CBD5E1',
                fontSize: 12.5,
                fontWeight: 600,
                color: '#0F172A',
                background: '#FFFFFF',
                outline: 'none',
              }}
            >
              <option value="ALL">All Risk Levels</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#64748B' }}>Contract:</span>
            <select
              value={contractFilter}
              onChange={(e) => {
                setContractFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                padding: '6px 10px',
                borderRadius: 6,
                border: '1px solid #CBD5E1',
                fontSize: 12.5,
                fontWeight: 600,
                color: '#0F172A',
                background: '#FFFFFF',
                outline: 'none',
              }}
            >
              <option value="ALL">All Contracts</option>
              <option value="Month-to-month">Month-to-month</option>
              <option value="One year">One year</option>
              <option value="Two year">Two year</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Data Table */}
      <div className="saas-card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="saas-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('customer_id')} style={{ cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    Customer ID
                    {sortField === 'customer_id' && (sortDirection === 'asc' ? <ArrowUp style={{ width: 12, height: 12 }} /> : <ArrowDown style={{ width: 12, height: 12 }} />)}
                  </div>
                </th>
                <th>Risk Level</th>
                <th onClick={() => handleSort('probability')} style={{ cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    Probability
                    {sortField === 'probability' && (sortDirection === 'asc' ? <ArrowUp style={{ width: 12, height: 12 }} /> : <ArrowDown style={{ width: 12, height: 12 }} />)}
                  </div>
                </th>
                <th onClick={() => handleSort('monthly_charges')} style={{ cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    Monthly MRR
                    {sortField === 'monthly_charges' && (sortDirection === 'asc' ? <ArrowUp style={{ width: 12, height: 12 }} /> : <ArrowDown style={{ width: 12, height: 12 }} />)}
                  </div>
                </th>
                <th>Contract</th>
                <th onClick={() => handleSort('tenure')} style={{ cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    Tenure
                    {sortField === 'tenure' && (sortDirection === 'asc' ? <ArrowUp style={{ width: 12, height: 12 }} /> : <ArrowDown style={{ width: 12, height: 12 }} />)}
                  </div>
                </th>
                <th>Recommended Action</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>
                    Loading customer records...
                  </td>
                </tr>
              ) : paginatedCustomers.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>
                    No customer records found matching the criteria.
                  </td>
                </tr>
              ) : (
                paginatedCustomers.map((cust) => {
                  const prob = cust.churn_probability ?? cust.probability ?? 0;
                  const probPct = (prob * 100).toFixed(1);
                  const mrr = cust.monthly_charges ?? cust.MonthlyCharges ?? 70.0;
                  const contract = cust.contract ?? cust.Contract ?? 'Month-to-month';
                  const tenure = cust.tenure ?? 12;
                  const action = cust.recommended_action || 'Review Account';

                  return (
                    <tr key={cust.customer_id || cust.id}>
                      <td style={{ fontWeight: 700, color: '#0F172A' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 6,
                              background: '#F1F5F9',
                              color: '#334155',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 11,
                              fontWeight: 800,
                            }}
                          >
                            {cust.customer_id ? cust.customer_id.substring(0, 2).toUpperCase() : 'CG'}
                          </div>
                          <span>{cust.customer_id || `CG-${cust.id}`}</span>
                        </div>
                      </td>
                      <td>{getRiskBadge(cust.risk_level || cust.risk_badge, prob)}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 700, width: 42 }}>{probPct}%</span>
                          <div style={{ width: 60, height: 5, background: '#E2E8F0', borderRadius: 9999, overflow: 'hidden' }}>
                            <div
                              style={{
                                width: `${Math.min(100, Math.max(0, prob * 100))}%`,
                                height: '100%',
                                background: prob >= 0.45 ? '#DC2626' : prob >= 0.2 ? '#D97706' : '#059669',
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td style={{ fontWeight: 600 }}>${Number(mrr).toFixed(2)}</td>
                      <td>
                        <span
                          style={{
                            fontSize: 12,
                            padding: '3px 8px',
                            borderRadius: 4,
                            background: contract === 'Month-to-month' ? '#FEF2F2' : '#F1F5F9',
                            color: contract === 'Month-to-month' ? '#991B1B' : '#334155',
                            fontWeight: 600,
                          }}
                        >
                          {contract}
                        </span>
                      </td>
                      <td>{tenure} mos</td>
                      <td>
                        <span style={{ fontSize: 12.5, color: '#2563EB', fontWeight: 600 }}>
                          {action}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <button
                            onClick={() => setSelectedCustomerId(cust.customer_id || cust.id)}
                            title="Inspect Customer Details"
                            style={{
                              background: '#F8FAFC',
                              border: '1px solid #CBD5E1',
                              color: '#334155',
                              padding: '5px 8px',
                              borderRadius: 6,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              fontSize: 12,
                              fontWeight: 600,
                            }}
                          >
                            <Eye style={{ width: 13, height: 13 }} />
                            Inspect
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div
          style={{
            padding: '12px 18px',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 12.5,
            color: '#64748B',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <div>
            Showing {totalRecords > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{' '}
            {Math.min(currentPage * pageSize, totalRecords)} of {totalRecords} accounts
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                style={{
                  padding: '3px 6px',
                  borderRadius: 4,
                  border: '1px solid #CBD5E1',
                  fontSize: 12,
                  outline: 'none',
                }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{
                  padding: '4px 8px',
                  borderRadius: 4,
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  opacity: currentPage === 1 ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <ChevronLeft style={{ width: 14, height: 14 }} />
              </button>
              <span style={{ fontWeight: 700, color: '#0F172A', padding: '0 4px' }}>
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                style={{
                  padding: '4px 8px',
                  borderRadius: 4,
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                  opacity: currentPage >= totalPages ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <ChevronRight style={{ width: 14, height: 14 }} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Detail Drawer */}
      {selectedCustomerId && (
        <CustomerDetailDrawer
          customerId={selectedCustomerId}
          onClose={() => setSelectedCustomerId(null)}
        />
      )}
    </div>
  );
}
