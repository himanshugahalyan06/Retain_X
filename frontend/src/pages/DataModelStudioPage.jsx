import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  Play,
  CheckCircle2,
  AlertCircle,
  Brain,
  BarChart2,
  Cpu,
  Sliders,
  Eye,
  Trash2,
  ShieldCheck,
  TrendingUp,
  RefreshCw,
  Clock,
  ArrowRight,
  Database,
  Layers,
  ChevronRight,
  Award,
  AlertTriangle
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import {
  getDatasets,
  uploadDataset,
  getDataset,
  profileDataset,
  deleteDataset,
  startTrainingJob,
  getTrainingJobs,
  getTrainingJob,
  getModels,
  getModel,
  getActiveModel,
  activateModel
} from '../lib/api';

const DONUT_COLORS = ['#10B981', '#EF4444', '#F59E0B', '#3B82F6', '#8B5CF6'];

export default function DataModelStudioPage() {
  const [activeTab, setActiveTab] = useState('datasets');
  const [datasets, setDatasets] = useState([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState(null);
  const [selectedDataset, setSelectedDataset] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [previewRows, setPreviewRows] = useState([]);
  const [previewCols, setPreviewCols] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Target selection & config for training
  const [targetColumn, setTargetColumn] = useState('');
  const [positiveClass, setPositiveClass] = useState('1');
  const [algorithmPreference, setAlgorithmPreference] = useState('');

  // Derive detected unique classes for the selected target column
  const targetClassOptions = useMemo(() => {
    if (!targetColumn) return [];
    // 1. From schema columns if available
    const schemaCols = selectedDataset?.schema?.columns || selectedDataset?.schema_json?.columns;
    const schemaCol = schemaCols?.find(c => c.name === targetColumn);
    if (schemaCol?.sample_values && schemaCol.sample_values.length > 0) {
      return schemaCol.sample_values.map(v => String(v).trim());
    }
    // 2. From previewRows
    if (previewRows && previewRows.length > 0) {
      const distinct = Array.from(new Set(previewRows.map(r => r[targetColumn]).filter(v => v !== undefined && v !== null && v !== '')));
      if (distinct.length > 0) {
        return distinct.map(v => String(v).trim());
      }
    }
    return [];
  }, [selectedDataset, targetColumn, previewRows]);

  // Auto-sync positiveClass to a valid class in targetClassOptions
  useEffect(() => {
    if (!targetColumn || targetClassOptions.length === 0) return;

    // Check if current positiveClass is one of the valid options (case-insensitive)
    const validMatch = targetClassOptions.find(opt => opt.toLowerCase() === (positiveClass || '').trim().toLowerCase());
    if (validMatch) {
      if (validMatch !== positiveClass) {
        setPositiveClass(validMatch);
      }
      return;
    }

    // Auto-detect conventional churn positive label
    const conventional = targetClassOptions.find(opt =>
      ['yes', '1', 'true', 'churn', 'churned', 'positive', 'y'].includes(opt.toLowerCase())
    );
    if (conventional) {
      setPositiveClass(conventional);
    } else if (targetClassOptions.length >= 2) {
      setPositiveClass(targetClassOptions[1]);
    } else {
      setPositiveClass(targetClassOptions[0]);
    }
  }, [targetColumn, targetClassOptions]);

  // Training state & live polling
  const [trainingJobs, setTrainingJobs] = useState([]);
  const [activeJob, setActiveJob] = useState(null);
  const pollIntervalRef = useRef(null);

  // Model Registry state
  const [models, setModels] = useState([]);
  const [selectedModelId, setSelectedModelId] = useState(null);
  const [selectedModel, setSelectedModel] = useState(null);
  const [activeModelData, setActiveModelData] = useState(null);

  const fileInputRef = useRef(null);

  // Load initial datasets, jobs, and models
  useEffect(() => {
    loadDatasets();
    loadTrainingJobs();
    loadModels();
    loadActiveModel();

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  // Polling for active training job
  useEffect(() => {
    if (activeJob && (activeJob.status === 'RUNNING' || activeJob.status === 'QUEUED')) {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = setInterval(async () => {
        try {
          const res = await getTrainingJob(activeJob.id);
          const updated = res.data;
          setActiveJob(updated);
          if (updated.status === 'COMPLETED' || updated.status === 'FAILED') {
            clearInterval(pollIntervalRef.current);
            loadModels();
            loadTrainingJobs();
            if (updated.status === 'COMPLETED') {
              setSuccessMsg(`Model training completed successfully! Algorithm: ${updated.best_algorithm}`);
              if (updated.model_id) {
                loadModelDetails(updated.model_id);
                setActiveTab('registry');
              }
            } else {
              setErrorMsg(`Training job failed: ${updated.error_message}`);
            }
          }
        } catch (err) {
          console.error('Error polling job:', err);
        }
      }, 2000);
    }
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [activeJob?.id, activeJob?.status]);

  const loadDatasets = async () => {
    try {
      const res = await getDatasets();
      setDatasets(res.data || []);
      if (res.data && res.data.length > 0 && !selectedDatasetId) {
        selectDataset(res.data[0].id);
      }
    } catch (err) {
      console.error('Failed to load datasets:', err);
    }
  };

  const loadTrainingJobs = async () => {
    try {
      const res = await getTrainingJobs();
      setTrainingJobs(res.data || []);
      // If a job is running or queued, track it
      const inFlight = (res.data || []).find(j => j.status === 'RUNNING' || j.status === 'QUEUED');
      if (inFlight && !activeJob) {
        setActiveJob(inFlight);
      }
    } catch (err) {
      console.error('Failed to load training jobs:', err);
    }
  };

  const loadModels = async () => {
    try {
      const res = await getModels();
      setModels(res.data || []);
      if (res.data && res.data.length > 0 && !selectedModelId) {
        loadModelDetails(res.data[0].id);
      }
    } catch (err) {
      console.error('Failed to load models:', err);
    }
  };

  const loadActiveModel = async () => {
    try {
      const res = await getActiveModel();
      setActiveModelData(res.data);
    } catch (err) {
      console.error('Failed to load active model:', err);
    }
  };

  const selectDataset = async (id, forceProfile = false) => {
    setSelectedDatasetId(id);
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await getDataset(id);
      setSelectedDataset(res.data);
      setPreviewRows(res.data.rows || res.data.preview || []);
      setPreviewCols(res.data.columns || []);
      if (res.data.target_column) {
        setTargetColumn(res.data.target_column);
      }
      if (res.data.positive_class) {
        setPositiveClass(res.data.positive_class);
      }
      if (res.data.profile) {
        setProfileData(res.data.profile);
      }

      // Fetch dynamic profiling EDA only when user is on profiling tab or explicitly requested
      if (forceProfile || (activeTab === 'profiling' && !res.data.profile)) {
        const profRes = await profileDataset(id, {
          target_column: res.data.target_column || undefined,
          positive_class: res.data.positive_class || undefined
        });
        setProfileData(profRes.data);
      }
    } catch (err) {
      setErrorMsg('Failed to inspect dataset details.');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = async (tabKey) => {
    setActiveTab(tabKey);
    if (tabKey === 'profiling' && selectedDatasetId && !profileData) {
      setLoading(true);
      try {
        const profRes = await profileDataset(selectedDatasetId, {
          target_column: targetColumn || undefined,
          positive_class: positiveClass || undefined
        });
        setProfileData(profRes.data);
      } catch (err) {
        console.error('Failed to profile dataset:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setErrorMsg('Only standard CSV (.csv) files are supported.');
      return;
    }

    setUploading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await uploadDataset(file);
      setSuccessMsg(`Dataset "${res.data.name}" uploaded and validated successfully! (${res.data.row_count} rows, ${res.data.col_count} columns)`);
      await loadDatasets();
      await selectDataset(res.data.dataset_id);
      setActiveTab('profiling');
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Failed to upload and validate dataset.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteDataset = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this dataset?')) return;
    try {
      await deleteDataset(id);
      setSuccessMsg('Dataset removed.');
      if (selectedDatasetId === id) {
        setSelectedDatasetId(null);
        setSelectedDataset(null);
        setProfileData(null);
      }
      loadDatasets();
    } catch (err) {
      setErrorMsg('Failed to delete dataset.');
    }
  };

  const handleProfileWithTarget = async () => {
    if (!selectedDatasetId || !targetColumn) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await profileDataset(selectedDatasetId, {
        target_column: targetColumn,
        positive_class: positiveClass
      });
      setProfileData(res.data);
      setSuccessMsg(`Profiling updated for target column: ${targetColumn}`);
    } catch (err) {
      setErrorMsg('Failed to profile with selected target.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartTraining = async () => {
    if (!selectedDatasetId) {
      setErrorMsg('Please select a dataset to train on.');
      return;
    }
    if (!targetColumn) {
      setErrorMsg('Please select a target churn column.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await startTrainingJob({
        dataset_id: selectedDatasetId,
        target_column: targetColumn,
        positive_class: positiveClass,
        algorithm_preference: algorithmPreference || undefined
      });

      const initialJob = {
        id: res.data.job_id,
        dataset_id: selectedDatasetId,
        status: 'QUEUED',
        progress: 5,
        stage: 'Job queued in background',
        target_column: targetColumn,
        positive_class: positiveClass
      };
      setActiveJob(initialJob);
      setSuccessMsg('Training job queued in background! Benchmarking candidate algorithms...');
      setActiveTab('training');
      loadTrainingJobs();
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Failed to launch training job.');
    } finally {
      setLoading(false);
    }
  };

  const loadModelDetails = async (id) => {
    setSelectedModelId(id);
    try {
      const res = await getModel(id);
      setSelectedModel(res.data);
    } catch (err) {
      console.error('Failed to load model details:', err);
    }
  };

  const handleActivateModel = async (id) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await activateModel(id);
      setSuccessMsg(res.data.message || 'Model activated for production scoring!');
      await loadModels();
      await loadActiveModel();
      if (selectedModelId === id) {
        setSelectedModel(prev => ({ ...prev, is_active: true }));
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Failed to activate model.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: 1440, margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>
              Company Data & Model Studio
            </h1>
            {activeModelData && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999 }}>
                <ShieldCheck style={{ width: 14, height: 14, color: '#059669' }} />
                Active Model: {activeModelData.algorithm} ({activeModelData.version})
              </span>
            )}
          </div>
          <p style={{ fontSize: 13, color: '#64748B', marginTop: 4, marginBottom: 0 }}>
            Upload customer datasets, inspect automated schema profiling and EDA charts, train and benchmark candidate models, and activate company-specific predictive models.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="btn-primary"
            style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <UploadCloud style={{ width: 16, height: 16 }} />
            {uploading ? 'Uploading & Validating...' : 'Upload Customer CSV'}
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".csv"
            style={{ display: 'none' }}
          />
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', color: '#991B1B', padding: '12px 16px', borderRadius: 8, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <AlertCircle style={{ width: 16, height: 16, flexShrink: 0 }} />
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#991B1B', fontWeight: 700, cursor: 'pointer' }}>×</button>
        </div>
      )}

      {successMsg && (
        <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', padding: '12px 16px', borderRadius: 8, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <CheckCircle2 style={{ width: 16, height: 16, flexShrink: 0, color: '#059669' }} />
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#065F46', fontWeight: 700, cursor: 'pointer' }}>×</button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid #E2E8F0', marginBottom: 20 }}>
        {[
          { key: 'datasets', label: '1. Datasets & Preview', icon: FileSpreadsheet, badge: datasets.length },
          { key: 'profiling', label: '2. Dynamic EDA & Profiling', icon: BarChart2 },
          { key: 'training', label: '3. Train & Benchmark', icon: Brain, badge: activeJob?.status === 'RUNNING' ? 'Running' : null },
          { key: 'registry', label: '4. Model Registry & Evaluation', icon: Award, badge: models.length }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 16px',
                fontSize: 13.5,
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#2563EB' : '#64748B',
                borderBottom: isActive ? '2px solid #2563EB' : '2px solid transparent',
                background: 'none',
                borderTop: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <Icon style={{ width: 16, height: 16, color: isActive ? '#2563EB' : '#94A3B8' }} />
              {tab.label}
              {tab.badge !== undefined && tab.badge !== null && (
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  background: isActive ? '#EFF6FF' : '#F1F5F9',
                  color: isActive ? '#1D4ED8' : '#64748B',
                  padding: '1px 7px',
                  borderRadius: 999
                }}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: DATASETS LIST & PREVIEW */}
      {activeTab === 'datasets' && (
        <div>
          {datasets.length === 0 ? (
            <div className="saas-card" style={{ padding: 48, textAlign: 'center' }}>
              <UploadCloud style={{ width: 48, height: 48, color: '#94A3B8', margin: '0 auto 16px' }} />
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>
                No datasets uploaded yet
              </h3>
              <p style={{ fontSize: 13, color: '#64748B', maxWidth: 440, margin: '0 auto 20px' }}>
                Upload your company's customer CSV data to profile feature distributions, discover churn drivers, and train a customized predictive model.
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="btn-primary"
                style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <UploadCloud style={{ width: 16, height: 16 }} />
                Select CSV to Upload
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 20 }}>
              {/* Left Column: Datasets List (4 cols) */}
              <div style={{ gridColumn: 'span 12' }} className="lg:col-span-4">
                <div className="saas-card">
                  <div className="saas-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                      Available Datasets ({datasets.length})
                    </h3>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="btn-secondary"
                      style={{ fontSize: 11, padding: '4px 8px' }}
                    >
                      + Add New
                    </button>
                  </div>
                  <div style={{ maxHeight: 520, overflowY: 'auto' }}>
                    {datasets.map(d => {
                      const isSelected = selectedDatasetId === d.id;
                      return (
                        <div
                          key={d.id}
                          onClick={() => selectDataset(d.id)}
                          style={{
                            padding: '14px 16px',
                            borderBottom: '1px solid #F1F5F9',
                            background: isSelected ? '#EFF6FF' : '#FFFFFF',
                            borderLeft: isSelected ? '4px solid #2563EB' : '4px solid transparent',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ fontWeight: 700, fontSize: 13, color: isSelected ? '#1E40AF' : '#0F172A', wordBreak: 'break-all' }}>
                              {d.name}
                            </div>
                            <button
                              onClick={(e) => handleDeleteDataset(d.id, e)}
                              style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 2 }}
                              title="Delete dataset"
                            >
                              <Trash2 style={{ width: 14, height: 14 }} />
                            </button>
                          </div>
                          <div style={{ display: 'flex', gap: 12, fontSize: 11.5, color: '#64748B', marginTop: 6 }}>
                            <span><strong>{Number(d.row_count).toLocaleString()}</strong> rows</span>
                            <span><strong>{d.col_count}</strong> cols</span>
                            <span>Missing: <strong>{d.missing_pct}%</strong></span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                            <span style={{ fontSize: 10.5, color: '#94A3B8' }}>
                              {d.created_at ? new Date(d.created_at).toLocaleDateString() : ''}
                            </span>
                            <span style={{
                              fontSize: 10,
                              fontWeight: 700,
                              background: '#F0FDF4',
                              color: '#166534',
                              border: '1px solid #BBF7D0',
                              padding: '1px 6px',
                              borderRadius: 4
                            }}>
                              VALIDATED
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right Column: Dataset Preview & Schema Details (8 cols) */}
              <div style={{ gridColumn: 'span 12' }} className="lg:col-span-8">
                {selectedDataset ? (
                  <div className="saas-card">
                    <div className="saas-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                          Dataset Preview & Schema
                        </h3>
                        <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0' }}>
                          Displaying first {previewRows.length} rows of <strong>{selectedDataset.name}</strong>
                        </p>
                      </div>

                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => {
                            setActiveTab('profiling');
                          }}
                          className="btn-secondary"
                          style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                        >
                          <BarChart2 style={{ width: 14, height: 14, color: '#2563EB' }} />
                          Explore EDA Charts
                        </button>
                        <button
                          onClick={() => {
                            setActiveTab('training');
                          }}
                          className="btn-primary"
                          style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                        >
                          <Brain style={{ width: 14, height: 14 }} />
                          Train Model
                        </button>
                      </div>
                    </div>

                    {/* Quick Stats Badges */}
                    <div style={{ display: 'flex', gap: 12, padding: '12px 16px', background: '#F8FAFC', borderBottom: '1px solid #F1F5F9', flexWrap: 'wrap', fontSize: 12 }}>
                      <span>Rows: <strong>{Number(selectedDataset.row_count).toLocaleString()}</strong></span>
                      <span>Columns: <strong>{selectedDataset.col_count}</strong></span>
                      <span>Missing Cells: <strong>{selectedDataset.missing_count} ({selectedDataset.missing_pct}%)</strong></span>
                      <span>Duplicates: <strong>{selectedDataset.duplicate_rows}</strong></span>
                      {selectedDataset.target_column && (
                        <span style={{ color: '#2563EB', fontWeight: 600 }}>
                          Suggested Target: <strong>{selectedDataset.target_column}</strong>
                        </span>
                      )}
                    </div>

                    {/* Preview Table */}
                    <div style={{ overflowX: 'auto', maxHeight: 420 }}>
                      <table className="saas-table" style={{ fontSize: 11.5 }}>
                        <thead>
                          <tr>
                            {previewCols.map(col => (
                              <th key={col} style={{ whiteSpace: 'nowrap', background: col === targetColumn ? '#EFF6FF' : undefined }}>
                                {col}
                                {col === targetColumn && <span style={{ color: '#2563EB', marginLeft: 4 }}>(Target)</span>}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {previewRows.map((row, idx) => (
                            <tr key={idx}>
                              {previewCols.map(col => (
                                <td key={col} style={{ whiteSpace: 'nowrap', background: col === targetColumn ? '#F8FAFC' : undefined }}>
                                  {row[col] !== null && row[col] !== undefined ? String(row[col]) : <em style={{ color: '#94A3B8' }}>null</em>}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="saas-card" style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>
                    Select a dataset to view its schema and data rows.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: DYNAMIC EDA & PROFILING */}
      {activeTab === 'profiling' && (
        <div>
          {!selectedDataset ? (
            <div className="saas-card" style={{ padding: 40, textAlign: 'center' }}>
              <p style={{ color: '#64748B' }}>Please select or upload a dataset first.</p>
              <button onClick={() => setActiveTab('datasets')} className="btn-secondary" style={{ marginTop: 12 }}>
                Go to Datasets
              </button>
            </div>
          ) : (
            <div>
              {/* Target Selection & Re-profile Bar */}
              <div className="saas-card" style={{ padding: '16px 20px', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                  <div>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                      Target Definition & Dynamic Profiling
                    </h3>
                    <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0' }}>
                      Select the column representing whether a customer churned and specify the positive class value.
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>Target Column:</label>
                      <select
                        value={targetColumn}
                        onChange={(e) => setTargetColumn(e.target.value)}
                        style={{ padding: '6px 10px', fontSize: 12.5, borderRadius: 6, border: '1px solid #CBD5E1', background: '#FFF' }}
                      >
                        <option value="">-- Select Target --</option>
                        {previewCols.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>Positive Class (Churn):</label>
                      {targetClassOptions.length > 0 ? (
                        <select
                          value={positiveClass}
                          onChange={(e) => setPositiveClass(e.target.value)}
                          style={{ padding: '6px 10px', fontSize: 12.5, borderRadius: 6, border: '1px solid #CBD5E1', background: '#FFF' }}
                        >
                          {targetClassOptions.map(opt => (
                            <option key={opt} value={opt}>
                              {opt} {['yes', '1', 'true', 'churn'].includes(opt.toLowerCase()) ? '(Churn)' : ''}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={positiveClass}
                          onChange={(e) => setPositiveClass(e.target.value)}
                          placeholder="e.g. 1 or Yes"
                          style={{ width: 80, padding: '6px 8px', fontSize: 12.5, borderRadius: 6, border: '1px solid #CBD5E1' }}
                        />
                      )}
                    </div>

                    <button
                      onClick={handleProfileWithTarget}
                      disabled={loading || !targetColumn}
                      className="btn-secondary"
                      style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      <RefreshCw style={{ width: 14, height: 14, animation: loading ? 'spin 1s linear infinite' : 'none' }} />
                      Update EDA Charts
                    </button>

                    <button
                      onClick={() => setActiveTab('training')}
                      className="btn-primary"
                      style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      <Brain style={{ width: 14, height: 14 }} />
                      Train Model on This Dataset
                    </button>
                  </div>
                </div>
              </div>

              {/* Dynamic EDA Charts Grid */}
              {profileData && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 20 }}>
                  {/* Chart 1: Target Class Distribution Donut (4 cols) */}
                  {profileData.target_profile && (
                    <div className="saas-card lg:col-span-4" style={{ gridColumn: 'span 12' }}>
                      <div className="saas-card-header">
                        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                          Target Class Distribution
                        </h3>
                        <p style={{ fontSize: 11.5, color: '#64748B', margin: '2px 0 0' }}>
                          Positive (Churn) Rate: <strong>{profileData.target_profile.positive_rate}%</strong>
                        </p>
                      </div>
                      <div className="saas-card-body" style={{ height: 260, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <ResponsiveContainer width="100%" height={190}>
                          <PieChart>
                            <Pie
                              data={profileData.target_profile.distribution || []}
                              dataKey="count"
                              nameKey="class"
                              cx="50%"
                              cy="50%"
                              innerRadius={45}
                              outerRadius={75}
                              paddingAngle={4}
                            >
                              {(profileData.target_profile.distribution || []).map((entry, index) => (
                                <Cell key={`target-pie-${index}`} fill={entry.is_positive ? '#EF4444' : '#10B981'} />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(val, name, item) => [`${Number(val).toLocaleString()} accounts (${item.payload.percentage}%)`, name]}
                              contentStyle={{ background: '#0F172A', borderRadius: 8, color: '#FFF', fontSize: 12 }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <div style={{ display: 'flex', gap: 16, fontSize: 11.5 }}>
                          {(profileData.target_profile.distribution || []).map((entry, index) => (
                            <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ width: 8, height: 8, borderRadius: '50%', background: entry.is_positive ? '#EF4444' : '#10B981' }} />
                              <span>{entry.class} ({entry.is_positive ? 'Churn' : 'Retained'}): <strong>{entry.percentage}%</strong></span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Chart 2: Top Categorical Churn Drivers (8 cols) */}
                  {profileData.churn_by_categorical && profileData.churn_by_categorical.length > 0 && (
                    <div className="saas-card lg:col-span-8" style={{ gridColumn: 'span 12' }}>
                      <div className="saas-card-header">
                        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                          Churn Rate by {profileData.churn_by_categorical[0].column}
                        </h3>
                        <p style={{ fontSize: 11.5, color: '#64748B', margin: '2px 0 0' }}>
                          Cohort churn propensity across categorical sub-groups
                        </p>
                      </div>
                      <div className="saas-card-body" style={{ height: 260 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={profileData.churn_by_categorical[0].categories} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                            <XAxis dataKey="category" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} />
                            <YAxis unit="%" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} />
                            <Tooltip
                              formatter={(val, name, item) => [`${val}% churn (${item.payload.churn_count} / ${item.payload.total} accounts)`, 'Churn Rate']}
                              contentStyle={{ background: '#0F172A', borderRadius: 8, color: '#FFF', fontSize: 12 }}
                            />
                            <Bar dataKey="churn_rate" name="Churn Rate %" fill="#DC2626" radius={[4, 4, 0, 0]} barSize={28} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* Chart 3: Numerical Binned Churn Risk (6 cols) */}
                  {profileData.churn_by_numerical && profileData.churn_by_numerical.length > 0 && (
                    <div className="saas-card lg:col-span-6" style={{ gridColumn: 'span 12' }}>
                      <div className="saas-card-header">
                        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                          Churn Rate by {profileData.churn_by_numerical[0].column} Bins
                        </h3>
                        <p style={{ fontSize: 11.5, color: '#64748B', margin: '2px 0 0' }}>
                          How churn rate shifts across numeric feature ranges
                        </p>
                      </div>
                      <div className="saas-card-body" style={{ height: 260 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={profileData.churn_by_numerical[0].bins} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                            <XAxis dataKey="bin" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} />
                            <YAxis unit="%" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} />
                            <Tooltip
                              formatter={(val, name, item) => [`${val}% churn rate (${item.payload.churn_count} / ${item.payload.total} accounts)`, 'Churn Rate']}
                              contentStyle={{ background: '#0F172A', borderRadius: 8, color: '#FFF', fontSize: 12 }}
                            />
                            <Bar dataKey="churn_rate" name="Churn Rate %" fill="#F59E0B" radius={[4, 4, 0, 0]} barSize={24} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* Chart 4: Correlation Heatmap Matrix (6 cols) */}
                  {profileData.correlation_heatmap && (
                    <div className="saas-card lg:col-span-6" style={{ gridColumn: 'span 12' }}>
                      <div className="saas-card-header">
                        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                          Numerical Feature Correlation Heatmap
                        </h3>
                        <p style={{ fontSize: 11.5, color: '#64748B', margin: '2px 0 0' }}>
                          Pearson correlation matrix for numerical attributes
                        </p>
                      </div>
                      <div className="saas-card-body" style={{ height: 260, overflowY: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                          <thead>
                            <tr>
                              <th style={{ padding: '4px 6px', textAlign: 'left', color: '#64748B' }}>Feature</th>
                              {profileData.correlation_heatmap.columns.map(c => (
                                <th key={c} style={{ padding: '4px 6px', textAlign: 'center', color: '#64748B', maxWidth: 65, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c}>
                                  {c}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {profileData.correlation_heatmap.columns.map(rowCol => (
                              <tr key={rowCol}>
                                <td style={{ padding: '4px 6px', fontWeight: 600, color: '#334155', whiteSpace: 'nowrap' }}>{rowCol}</td>
                                {profileData.correlation_heatmap.columns.map(colCol => {
                                  const val = profileData.correlation_heatmap.matrix[rowCol]?.[colCol] ?? 0;
                                  // Color scale from blue (-1) to white (0) to red (+1)
                                  let bg = '#FFFFFF';
                                  let color = '#334155';
                                  if (val > 0.05) {
                                    bg = `rgba(239, 68, 68, ${Math.min(val, 0.85)})`;
                                    if (val > 0.4) color = '#FFFFFF';
                                  } else if (val < -0.05) {
                                    bg = `rgba(37, 99, 235, ${Math.min(Math.abs(val), 0.85)})`;
                                    if (Math.abs(val) > 0.4) color = '#FFFFFF';
                                  }
                                  return (
                                    <td
                                      key={colCol}
                                      style={{
                                        padding: '4px 6px',
                                        textAlign: 'center',
                                        background: bg,
                                        color: color,
                                        fontWeight: 600,
                                        border: '1px solid #F1F5F9'
                                      }}
                                    >
                                      {val.toFixed(2)}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: MODEL TRAINING & BENCHMARKING */}
      {activeTab === 'training' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 20 }}>
          {/* Left Column: Training Configuration Form (5 cols) */}
          <div style={{ gridColumn: 'span 12' }} className="lg:col-span-5">
            <div className="saas-card">
              <div className="saas-card-header">
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Configure Model Training
                </h3>
                <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0' }}>
                  Train and benchmark candidate models on company data
                </p>
              </div>

              <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    Source Dataset
                  </label>
                  <select
                    value={selectedDatasetId || ''}
                    onChange={(e) => selectDataset(Number(e.target.value))}
                    style={{ width: '100%', padding: '8px 12px', fontSize: 13, borderRadius: 6, border: '1px solid #CBD5E1', background: '#FFF' }}
                  >
                    {datasets.map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({d.row_count} rows)</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    Target Churn Column
                  </label>
                  <select
                    value={targetColumn}
                    onChange={(e) => setTargetColumn(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', fontSize: 13, borderRadius: 6, border: '1px solid #CBD5E1', background: '#FFF' }}
                  >
                    <option value="">-- Select Target --</option>
                    {previewCols.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    Positive Class (Customer Churned)
                  </label>
                  {targetClassOptions.length > 0 ? (
                    <select
                      value={positiveClass}
                      onChange={(e) => setPositiveClass(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', fontSize: 13, borderRadius: 6, border: '1px solid #CBD5E1', background: '#FFF' }}
                    >
                      {targetClassOptions.map(opt => (
                        <option key={opt} value={opt}>
                          {opt} {['yes', '1', 'true', 'churn'].includes(opt.toLowerCase()) ? '(Churn Event / Positive)' : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={positiveClass}
                      onChange={(e) => setPositiveClass(e.target.value)}
                      placeholder="e.g. 1, Yes, or True"
                      style={{ width: '100%', padding: '8px 12px', fontSize: 13, borderRadius: 6, border: '1px solid #CBD5E1' }}
                    />
                  )}
                  <span style={{ fontSize: 11, color: '#64748B', marginTop: 4, display: 'block' }}>
                    {targetClassOptions.length > 0
                      ? `Detected classes in ${targetColumn}: [${targetClassOptions.join(', ')}]. Model trains with '${positiveClass}' as positive churn.`
                      : 'Identifies positive churn outcomes for binary classification.'}
                  </span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    Candidate Benchmark Algorithms
                  </label>
                  <div style={{ padding: '10px 12px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 6, fontSize: 12, color: '#334155' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <CheckCircle2 style={{ width: 14, height: 14, color: '#10B981' }} />
                      <span><strong>Baseline:</strong> Dummy Stratified Classifier</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <CheckCircle2 style={{ width: 14, height: 14, color: '#10B981' }} />
                      <span><strong>Linear:</strong> L2 Regularized Logistic Regression</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <CheckCircle2 style={{ width: 14, height: 14, color: '#10B981' }} />
                      <span><strong>Tree Ensemble:</strong> Balanced Random Forest Classifier</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CheckCircle2 style={{ width: 14, height: 14, color: '#10B981' }} />
                      <span><strong>Boosting:</strong> Gradient Boosting Classifier</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    Post-Processing & Thresholding
                  </label>
                  <div style={{ padding: '10px 12px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 6, fontSize: 12, color: '#334155' }}>
                    <div>✓ 60 / 20 / 20 Train, Validation, Test Split</div>
                    <div>✓ Platt Probability Calibration on Validation Fold</div>
                    <div>✓ Cost-Optimal Threshold Search (Cost of Missed Churn vs False Alarm)</div>
                    <div>✓ Final Honest Test Set Evaluation</div>
                  </div>
                </div>

                <button
                  onClick={handleStartTraining}
                  disabled={loading || activeJob?.status === 'RUNNING' || !targetColumn}
                  className="btn-primary"
                  style={{ width: '100%', padding: '12px', fontSize: 13.5, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  <Play style={{ width: 16, height: 16 }} />
                  {activeJob?.status === 'RUNNING' ? 'Training In Progress...' : 'Start Model Training & Benchmark'}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Live Training Progress & Candidate Benchmark (7 cols) */}
          <div style={{ gridColumn: 'span 12' }} className="lg:col-span-7">
            {activeJob ? (
              <div className="saas-card" style={{ marginBottom: 20 }}>
                <div className="saas-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                      Training Job Status
                    </h3>
                    <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0' }}>
                      Job ID: <code>{activeJob.id}</code>
                    </p>
                  </div>

                  <span style={{
                    fontSize: 11.5,
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: 999,
                    background: activeJob.status === 'COMPLETED' ? '#ECFDF5' : activeJob.status === 'RUNNING' ? '#EFF6FF' : activeJob.status === 'FAILED' ? '#FEF2F2' : '#F1F5F9',
                    color: activeJob.status === 'COMPLETED' ? '#065F46' : activeJob.status === 'RUNNING' ? '#1D4ED8' : activeJob.status === 'FAILED' ? '#991B1B' : '#475569'
                  }}>
                    {activeJob.status}
                  </span>
                </div>

                <div style={{ padding: '20px' }}>
                  {/* Progress Bar */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                      <span style={{ color: '#0F172A' }}>{activeJob.stage || 'Executing ML pipeline...'}</span>
                      <span style={{ color: '#2563EB' }}>{activeJob.progress}%</span>
                    </div>
                    <div style={{ width: '100%', height: 8, background: '#E2E8F0', borderRadius: 999, overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${activeJob.progress}%`,
                          height: '100%',
                          background: activeJob.status === 'FAILED' ? '#EF4444' : '#2563EB',
                          borderRadius: 999,
                          transition: 'width 0.4s ease'
                        }}
                      />
                    </div>
                  </div>

                  {/* Benchmark Candidates Table */}
                  {activeJob.algorithms_evaluated && activeJob.algorithms_evaluated.length > 0 && (
                    <div style={{ marginTop: 20 }}>
                      <h4 style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>
                        Candidate Algorithm Benchmarks
                      </h4>
                      <table className="saas-table" style={{ fontSize: 11.5 }}>
                        <thead>
                          <tr>
                            <th>Algorithm</th>
                            <th>Val ROC-AUC</th>
                            <th>Val PR-AUC</th>
                            <th>Val Accuracy</th>
                            <th>Val F1</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activeJob.algorithms_evaluated.map((cand, idx) => {
                            const isBest = cand.algorithm === activeJob.best_algorithm;
                            return (
                              <tr key={idx} style={{ background: isBest ? '#F0FDF4' : undefined }}>
                                <td style={{ fontWeight: 700, color: isBest ? '#15803D' : '#0F172A' }}>
                                  {cand.algorithm} {isBest && '🏆 (Best)'}
                                </td>
                                <td>{cand.val_roc_auc ? (cand.val_roc_auc * 100).toFixed(1) + '%' : '-'}</td>
                                <td>{cand.val_pr_auc ? (cand.val_pr_auc * 100).toFixed(1) + '%' : '-'}</td>
                                <td>{cand.val_accuracy ? (cand.val_accuracy * 100).toFixed(1) + '%' : '-'}</td>
                                <td>{cand.val_f1 ? (cand.val_f1 * 100).toFixed(1) + '%' : '-'}</td>
                                <td>
                                  {cand.status === 'SUCCESS' ? (
                                    <span style={{ color: '#059669', fontWeight: 600 }}>✓ Evaluated</span>
                                  ) : (
                                    <span style={{ color: '#DC2626' }}>Failed</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Completion CTAs */}
                  {activeJob.status === 'COMPLETED' && (
                    <div style={{ marginTop: 20, padding: 14, background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <CheckCircle2 style={{ width: 18, height: 18, color: '#059669' }} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#166534' }}>
                          Model artifact persisted and added to Registry!
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          loadModels();
                          if (activeJob.model_id) loadModelDetails(activeJob.model_id);
                          setActiveTab('registry');
                        }}
                        className="btn-primary"
                        style={{ fontSize: 12, padding: '6px 12px' }}
                      >
                        Inspect & Activate Model →
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="saas-card" style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>
                <Brain style={{ width: 36, height: 36, color: '#CBD5E1', margin: '0 auto 12px' }} />
                <h4 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>
                  No active training job
                </h4>
                <p style={{ fontSize: 12.5 }}>Configure your target column on the left and click "Start Model Training".</p>
              </div>
            )}

            {/* Past Training Jobs History */}
            {trainingJobs.length > 0 && (
              <div className="saas-card">
                <div className="saas-card-header">
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                    Training History ({trainingJobs.length})
                  </h3>
                </div>
                <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                  <table className="saas-table" style={{ fontSize: 11.5 }}>
                    <thead>
                      <tr>
                        <th>Job ID</th>
                        <th>Target</th>
                        <th>Best Algorithm</th>
                        <th>Status</th>
                        <th>Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trainingJobs.map(j => (
                        <tr key={j.id} onClick={() => setActiveJob(j)} style={{ cursor: 'pointer' }}>
                          <td style={{ fontWeight: 600 }}>{j.id.slice(0, 8)}...</td>
                          <td>{j.target_column}</td>
                          <td>{j.best_algorithm || '-'}</td>
                          <td>
                            <span style={{
                              fontSize: 10.5,
                              fontWeight: 700,
                              color: j.status === 'COMPLETED' ? '#059669' : j.status === 'FAILED' ? '#DC2626' : '#2563EB'
                            }}>
                              {j.status}
                            </span>
                          </td>
                          <td style={{ color: '#94A3B8' }}>{j.created_at ? new Date(j.created_at).toLocaleTimeString() : ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: MODEL REGISTRY & EVALUATION */}
      {activeTab === 'registry' && (
        <div>
          {models.length === 0 ? (
            <div className="saas-card" style={{ padding: 48, textAlign: 'center' }}>
              <Award style={{ width: 44, height: 44, color: '#94A3B8', margin: '0 auto 16px' }} />
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>
                No trained company models yet
              </h3>
              <p style={{ fontSize: 13, color: '#64748B', maxWidth: 440, margin: '0 auto 20px' }}>
                Train a model on your uploaded dataset to produce an evaluation artifact, review ROC & PR curves, and activate it for live predictions.
              </p>
              <button onClick={() => setActiveTab('training')} className="btn-primary" style={{ fontSize: 13 }}>
                Go to Training Studio
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 20 }}>
              {/* Left Column: Models List (4 cols) */}
              <div style={{ gridColumn: 'span 12' }} className="lg:col-span-4">
                <div className="saas-card">
                  <div className="saas-card-header">
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                      Company Models ({models.length})
                    </h3>
                  </div>
                  <div style={{ maxHeight: 520, overflowY: 'auto' }}>
                    {models.map(m => {
                      const isSelected = selectedModelId === m.id;
                      return (
                        <div
                          key={m.id}
                          onClick={() => loadModelDetails(m.id)}
                          style={{
                            padding: '14px 16px',
                            borderBottom: '1px solid #F1F5F9',
                            background: isSelected ? '#EFF6FF' : '#FFFFFF',
                            borderLeft: isSelected ? '4px solid #2563EB' : '4px solid transparent',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontWeight: 700, fontSize: 13, color: isSelected ? '#1E40AF' : '#0F172A' }}>
                              {m.algorithm} ({m.version})
                            </div>
                            {m.is_active && (
                              <span style={{ fontSize: 10, fontWeight: 700, background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0', padding: '1px 6px', borderRadius: 999 }}>
                                ACTIVE
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'flex', gap: 12, fontSize: 11.5, color: '#64748B', marginTop: 6 }}>
                            <span>Test AUC: <strong>{m.test_metrics?.roc_auc ? (m.test_metrics.roc_auc * 100).toFixed(1) + '%' : '-'}</strong></span>
                            <span>F1: <strong>{m.test_metrics?.f1 ? (m.test_metrics.f1 * 100).toFixed(1) + '%' : '-'}</strong></span>
                            <span>Cutoff: <strong>{m.threshold?.toFixed(2) || '0.50'}</strong></span>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                            <span style={{ fontSize: 10.5, color: '#94A3B8' }}>
                              {m.created_at ? new Date(m.created_at).toLocaleDateString() : ''}
                            </span>
                            {!m.is_active && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleActivateModel(m.id);
                                }}
                                className="btn-secondary"
                                style={{ fontSize: 11, padding: '3px 8px' }}
                              >
                                Activate
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right Column: Model Evaluation Curves & SHAP (8 cols) */}
              <div style={{ gridColumn: 'span 12' }} className="lg:col-span-8">
                {selectedModel ? (
                  <div>
                    {/* Top Model Info Card */}
                    <div className="saas-card" style={{ padding: '16px 20px', marginBottom: 20 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', margin: 0 }}>
                              {selectedModel.algorithm} ({selectedModel.version})
                            </h3>
                            {selectedModel.is_active ? (
                              <span style={{ background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999 }}>
                                Active In Production
                              </span>
                            ) : (
                              <span style={{ background: '#F1F5F9', color: '#64748B', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999 }}>
                                Validated Candidate
                              </span>
                            )}
                          </div>
                          <p style={{ fontSize: 12, color: '#64748B', margin: '4px 0 0' }}>
                            Decision Cutoff: <strong>{selectedModel.threshold?.toFixed(2)}</strong> | Evaluated on untouched 20% test fold
                          </p>
                        </div>

                        {!selectedModel.is_active && (
                          <button
                            onClick={() => handleActivateModel(selectedModel.id)}
                            disabled={loading}
                            className="btn-primary"
                            style={{ fontSize: 12.5, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                          >
                            <ShieldCheck style={{ width: 14, height: 14 }} />
                            Activate This Model
                          </button>
                        )}
                      </div>

                      {/* Test Metrics Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 12, marginTop: 16 }}>
                        <div style={{ padding: '10px 12px', background: '#F8FAFC', borderRadius: 6, border: '1px solid #E2E8F0' }}>
                          <span style={{ fontSize: 11, color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>Test ROC-AUC</span>
                          <div style={{ fontSize: 18, fontWeight: 800, color: '#2563EB', marginTop: 2 }}>
                            {selectedModel.test_metrics?.roc_auc ? (selectedModel.test_metrics.roc_auc * 100).toFixed(1) + '%' : '-'}
                          </div>
                        </div>

                        <div style={{ padding: '10px 12px', background: '#F8FAFC', borderRadius: 6, border: '1px solid #E2E8F0' }}>
                          <span style={{ fontSize: 11, color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>PR-AUC</span>
                          <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', marginTop: 2 }}>
                            {selectedModel.test_metrics?.pr_auc ? (selectedModel.test_metrics.pr_auc * 100).toFixed(1) + '%' : '-'}
                          </div>
                        </div>

                        <div style={{ padding: '10px 12px', background: '#F8FAFC', borderRadius: 6, border: '1px solid #E2E8F0' }}>
                          <span style={{ fontSize: 11, color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>Accuracy</span>
                          <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', marginTop: 2 }}>
                            {selectedModel.test_metrics?.accuracy ? (selectedModel.test_metrics.accuracy * 100).toFixed(1) + '%' : '-'}
                          </div>
                        </div>

                        <div style={{ padding: '10px 12px', background: '#F8FAFC', borderRadius: 6, border: '1px solid #E2E8F0' }}>
                          <span style={{ fontSize: 11, color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>F1-Score</span>
                          <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', marginTop: 2 }}>
                            {selectedModel.test_metrics?.f1 ? (selectedModel.test_metrics.f1 * 100).toFixed(1) + '%' : '-'}
                          </div>
                        </div>

                        <div style={{ padding: '10px 12px', background: '#F8FAFC', borderRadius: 6, border: '1px solid #E2E8F0' }}>
                          <span style={{ fontSize: 11, color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>Brier Score</span>
                          <div style={{ fontSize: 18, fontWeight: 800, color: '#059669', marginTop: 2 }}>
                            {selectedModel.test_metrics?.brier_score !== undefined ? selectedModel.test_metrics.brier_score.toFixed(3) : '-'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Charts: ROC Curve & PR Curve */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 20, marginBottom: 20 }}>
                      {/* ROC Curve (6 cols) */}
                      {selectedModel.evaluation_curves?.roc_curve && (
                        <div className="saas-card lg:col-span-6" style={{ gridColumn: 'span 12' }}>
                          <div className="saas-card-header">
                            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                              ROC Curve
                            </h3>
                            <p style={{ fontSize: 11.5, color: '#64748B', margin: '2px 0 0' }}>
                              True Positive Rate vs False Positive Rate
                            </p>
                          </div>
                          <div className="saas-card-body" style={{ height: 250 }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={selectedModel.evaluation_curves.roc_curve} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                                <XAxis dataKey="fpr" type="number" domain={[0, 1]} tick={{ fontSize: 10, fill: '#64748B' }} label={{ value: 'FPR', position: 'insideBottom', offset: -2, fontSize: 10 }} />
                                <YAxis dataKey="tpr" type="number" domain={[0, 1]} tick={{ fontSize: 10, fill: '#64748B' }} label={{ value: 'TPR', angle: -90, position: 'insideLeft', fontSize: 10 }} />
                                <Tooltip formatter={(val) => [Number(val).toFixed(3), 'Rate']} contentStyle={{ background: '#0F172A', borderRadius: 8, color: '#FFF', fontSize: 11 }} />
                                <Line type="monotone" dataKey="tpr" stroke="#2563EB" strokeWidth={2.5} dot={false} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}

                      {/* Precision-Recall Curve (6 cols) */}
                      {selectedModel.evaluation_curves?.pr_curve && (
                        <div className="saas-card lg:col-span-6" style={{ gridColumn: 'span 12' }}>
                          <div className="saas-card-header">
                            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                              Precision-Recall Curve
                            </h3>
                            <p style={{ fontSize: 11.5, color: '#64748B', margin: '2px 0 0' }}>
                              Precision vs Recall across decision thresholds
                            </p>
                          </div>
                          <div className="saas-card-body" style={{ height: 250 }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={selectedModel.evaluation_curves.pr_curve} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                                <XAxis dataKey="recall" type="number" domain={[0, 1]} tick={{ fontSize: 10, fill: '#64748B' }} label={{ value: 'Recall', position: 'insideBottom', offset: -2, fontSize: 10 }} />
                                <YAxis dataKey="precision" type="number" domain={[0, 1]} tick={{ fontSize: 10, fill: '#64748B' }} label={{ value: 'Precision', angle: -90, position: 'insideLeft', fontSize: 10 }} />
                                <Tooltip formatter={(val) => [Number(val).toFixed(3), 'Value']} contentStyle={{ background: '#0F172A', borderRadius: 8, color: '#FFF', fontSize: 11 }} />
                                <Line type="monotone" dataKey="precision" stroke="#10B981" strokeWidth={2.5} dot={false} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Row 2: Confusion Matrix & Global Feature Importance */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 20 }}>
                      {/* Confusion Matrix (5 cols) */}
                      {selectedModel.test_metrics?.confusion_matrix && (
                        <div className="saas-card lg:col-span-5" style={{ gridColumn: 'span 12' }}>
                          <div className="saas-card-header">
                            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                              Confusion Matrix
                            </h3>
                            <p style={{ fontSize: 11.5, color: '#64748B', margin: '2px 0 0' }}>
                              At decision threshold: <strong>{selectedModel.threshold?.toFixed(2)}</strong>
                            </p>
                          </div>
                          <div className="saas-card-body" style={{ padding: '20px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, textAlign: 'center' }}>
                              <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', padding: 14, borderRadius: 8 }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: '#166534' }}>TRUE NEGATIVES</span>
                                <div style={{ fontSize: 20, fontWeight: 800, color: '#15803D', marginTop: 4 }}>
                                  {Number(selectedModel.test_metrics.confusion_matrix.tn).toLocaleString()}
                                </div>
                                <span style={{ fontSize: 10.5, color: '#64748B' }}>Correct Retained</span>
                              </div>

                              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', padding: 14, borderRadius: 8 }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: '#991B1B' }}>FALSE POSITIVES</span>
                                <div style={{ fontSize: 20, fontWeight: 800, color: '#DC2626', marginTop: 4 }}>
                                  {Number(selectedModel.test_metrics.confusion_matrix.fp).toLocaleString()}
                                </div>
                                <span style={{ fontSize: 10.5, color: '#64748B' }}>Unnecessary Outreach</span>
                              </div>

                              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', padding: 14, borderRadius: 8 }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: '#991B1B' }}>FALSE NEGATIVES</span>
                                <div style={{ fontSize: 20, fontWeight: 800, color: '#DC2626', marginTop: 4 }}>
                                  {Number(selectedModel.test_metrics.confusion_matrix.fn).toLocaleString()}
                                </div>
                                <span style={{ fontSize: 10.5, color: '#64748B' }}>Missed Churners</span>
                              </div>

                              <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', padding: 14, borderRadius: 8 }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: '#166534' }}>TRUE POSITIVES</span>
                                <div style={{ fontSize: 20, fontWeight: 800, color: '#15803D', marginTop: 4 }}>
                                  {Number(selectedModel.test_metrics.confusion_matrix.tp).toLocaleString()}
                                </div>
                                <span style={{ fontSize: 10.5, color: '#64748B' }}>Caught Churners</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Feature Importance / SHAP (7 cols) */}
                      {selectedModel.feature_importance && selectedModel.feature_importance.length > 0 && (
                        <div className="saas-card lg:col-span-7" style={{ gridColumn: 'span 12' }}>
                          <div className="saas-card-header">
                            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                              Top Global Feature Importance
                            </h3>
                            <p style={{ fontSize: 11.5, color: '#64748B', margin: '2px 0 0' }}>
                              Primary drivers influencing company churn predictions
                            </p>
                          </div>
                          <div className="saas-card-body" style={{ height: 230 }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart
                                data={selectedModel.feature_importance.slice(0, 7)}
                                layout="vertical"
                                margin={{ top: 5, right: 25, left: 40, bottom: 0 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                                <XAxis type="number" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} />
                                <YAxis dataKey="feature" type="category" tick={{ fontSize: 10, fill: '#334155', fontWeight: 600 }} axisLine={false} />
                                <Tooltip formatter={(val) => [Number(val).toFixed(4), 'Importance']} contentStyle={{ background: '#0F172A', borderRadius: 8, color: '#FFF', fontSize: 11 }} />
                                <Bar dataKey="importance" fill="#4F46E5" radius={[0, 4, 4, 0]} barSize={16} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="saas-card" style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>
                    Select a model version from the registry on the left to inspect its test evaluation curves.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
