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
  X,
  FileSpreadsheet
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

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          String(c.customer_id || '').toLowerCase().includes(q) ||
          String(c.recommended_action || '').toLowerCase().includes(q) ||
          String(c.contract || '').toLowerCase().includes(q)
      );
    }

    if (riskFilter !== 'ALL') {
      result = result.filter((c) => {
        const prob = c.churn_probability ?? c.probability ?? 0;
        if (riskFilter === 'HIGH') return prob >= 0.7;
        if (riskFilter === 'MEDIUM') return prob >= 0.4 && prob < 0.7;
        if (riskFilter === 'LOW') return prob < 0.4;
        return true;
      });
    }

    if (contractFilter !== 'ALL') {
      result = result.filter((c) => c.contract === contractFilter);
    }

    result.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (sortField === 'probability') {
        valA = a.churn_probability ?? a.probability ?? 0;
        valB = b.churn_probability ?? b.probability ?? 0;
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [customers, searchQuery, riskFilter, contractFilter, sortField, sortDirection]);

  // Pagination slice
  const paginatedCustomers = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return processedCustomers.slice(startIndex, startIndex + pageSize);
  }, [processedCustomers, currentPage, pageSize]);

  const totalPages = Math.ceil(processedCustomers.length / pageSize) || 1;

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#111111] font-display tracking-tight">
            Customer Directory & Risk Intelligence
          </h1>
          <p className="text-xs text-[#656565] mt-1">
            Monitor scored accounts, inspect SHAP behavioral drivers, and launch targeted retention workflows.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="btn-ink py-2 px-3 text-xs font-bold flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5 text-[#5FB57A]" />
            <span>{uploading ? 'Processing CSV...' : 'Upload CSV Batch'}</span>
          </button>

          <button
            onClick={fetchCustomerData}
            disabled={loading}
            className="btn-secondary py-2 px-3 text-xs font-bold flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Batch Processing Status Banner */}
      {uploadResult && (
        <div className="saas-card p-4 bg-emerald-50 border-emerald-300 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#5FB57A] flex items-center justify-center text-[#111111]">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-[#111111]">
                Batch Ingested & Scored Successfully
              </div>
              <div className="text-xs text-[#1B5E34] mt-0.5 flex gap-4 flex-wrap">
                <span>Total: <strong>{uploadResult.total_records} accounts</strong></span>
                <span>High Risk: <strong className="text-red-700">{uploadResult.high_risk_count}</strong></span>
                <span>Medium Risk: <strong className="text-amber-700">{uploadResult.medium_risk_count}</strong></span>
                <span>At-Risk Revenue: <strong>${Number(uploadResult.estimated_at_risk_revenue || 0).toLocaleString()}</strong></span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {uploadResult.download_url && (
              <a
                href={uploadResult.download_url}
                target="_blank"
                rel="noreferrer"
                download
                className="btn-secondary py-1.5 px-3 text-xs font-bold flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Scored CSV</span>
              </a>
            )}
            <button
              onClick={() => setUploadResult(null)}
              className="p-1 text-[#656565] hover:text-[#111111]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {uploadError && (
        <div className="saas-card p-4 bg-red-50 border-red-200 text-red-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{uploadError}</span>
          </div>
          <button onClick={() => setUploadError(null)} className="text-red-600 hover:text-red-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter & Search Toolbar */}
      <div className="saas-card p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#8E8E8A]" />
          <input
            type="text"
            placeholder="Search Account ID or action..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="form-input pl-9"
          />
        </div>

        {/* Filter dropdowns */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={riskFilter}
            onChange={(e) => {
              setRiskFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="form-input w-auto text-xs py-2"
          >
            <option value="ALL">All Risk Levels</option>
            <option value="HIGH">High Risk (≥ 70%)</option>
            <option value="MEDIUM">Medium Risk (40 - 69%)</option>
            <option value="LOW">Low Risk (&lt; 40%)</option>
          </select>

          <select
            value={contractFilter}
            onChange={(e) => {
              setContractFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="form-input w-auto text-xs py-2"
          >
            <option value="ALL">All Contracts</option>
            <option value="Month-to-month">Month-to-month</option>
            <option value="One year">One year</option>
            <option value="Two year">Two year</option>
          </select>

          <span className="text-xs font-bold text-[#656565] ml-2 font-mono">
            {processedCustomers.length} accounts
          </span>
        </div>
      </div>

      {/* Customer Data Table */}
      <div className="saas-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="saas-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('customer_id')} className="cursor-pointer select-none">
                  <div className="flex items-center gap-1.5">
                    <span>Account ID</span>
                    <ArrowUpDown className="w-3 h-3 text-[#8E8E8A]" />
                  </div>
                </th>
                <th onClick={() => handleSort('probability')} className="cursor-pointer select-none">
                  <div className="flex items-center gap-1.5">
                    <span>Churn Risk</span>
                    <ArrowUpDown className="w-3 h-3 text-[#8E8E8A]" />
                  </div>
                </th>
                <th onClick={() => handleSort('monthly_charges')} className="cursor-pointer select-none">
                  <div className="flex items-center gap-1.5">
                    <span>Monthly MRR</span>
                    <ArrowUpDown className="w-3 h-3 text-[#8E8E8A]" />
                  </div>
                </th>
                <th>Contract</th>
                <th>Tenure</th>
                <th>Recommended Action</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-xs text-[#8E8E8A]">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#5FB57A]" />
                    <span>Querying tenant customer directory...</span>
                  </td>
                </tr>
              ) : paginatedCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-xs text-[#8E8E8A]">
                    No customer records matched your query.
                  </td>
                </tr>
              ) : (
                paginatedCustomers.map((cust) => {
                  const prob = cust.churn_probability ?? cust.probability ?? 0;
                  const isHigh = prob >= 0.7;
                  const isMed = prob >= 0.4 && prob < 0.7;

                  return (
                    <tr key={cust.id || cust.customer_id} className="hover:bg-[#F3F3F1]/60">
                      <td className="font-bold text-[#111111]">
                        {cust.customer_id || `CG-${cust.id}`}
                      </td>
                      <td>
                        <span className={isHigh ? 'badge-risk-high' : isMed ? 'badge-risk-med' : 'badge-risk-low'}>
                          <span className="dot" />
                          {(prob * 100).toFixed(1)}% {isHigh ? 'HIGH' : isMed ? 'MED' : 'LOW'}
                        </span>
                      </td>
                      <td className="font-semibold text-[#111111]">
                        ${Number(cust.monthly_charges || 85.0).toFixed(2)}
                      </td>
                      <td className="text-xs text-[#656565]">
                        {cust.contract || 'Month-to-month'}
                      </td>
                      <td className="text-xs text-[#656565]">
                        {cust.tenure || 1} mo
                      </td>
                      <td className="text-xs font-semibold text-[#111111] max-w-xs truncate">
                        {cust.recommended_action || 'Offer Annual Plan Migration'}
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedCustomerId(cust.customer_id || cust.id)}
                            className="btn-secondary py-1 px-2.5 text-xs flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5 text-[#5FB57A]" />
                            <span>Inspect</span>
                          </button>
                          <button
                            onClick={() => navigate(`/predict?customer_id=${cust.customer_id || cust.id}`)}
                            className="btn-ink py-1 px-2.5 text-xs flex items-center gap-1"
                          >
                            <Zap className="w-3.5 h-3.5 text-[#5FB57A]" />
                            <span>Simulate</span>
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

        {/* Pagination Bar */}
        <div className="p-4 border-t border-[#D8D8D5] flex items-center justify-between text-xs text-[#656565]">
          <div>
            Showing {(currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, processedCustomers.length)} of {processedCustomers.length} accounts
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="btn-secondary py-1 px-2.5 text-xs disabled:opacity-40"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="font-bold text-[#111111]">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="btn-secondary py-1 px-2.5 text-xs disabled:opacity-40"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
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
