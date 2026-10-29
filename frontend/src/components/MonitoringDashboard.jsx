import React, { useEffect, useState } from 'react';
import { Activity, Users, AlertTriangle, Clock } from 'lucide-react';
import { getMetrics } from '../lib/api';

export default function MonitoringDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await getMetrics();
        setMetrics(response.data);
        setError(null);
      } catch (err) {
        setError('System Offline');
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-red-200 p-6 flex items-center gap-4 text-red-700">
        <AlertTriangle className="w-6 h-6 text-red-500" />
        <span className="font-medium">System Metrics Offline: {error}</span>
      </div>
    );
  }

  if (!metrics) return null;

  const flaggedRate = metrics.total_predictions > 0 
    ? ((metrics.predictions_distribution.churn / metrics.total_predictions) * 100).toFixed(1) 
    : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex items-center justify-between group hover:border-indigo-200 transition-colors">
        <div>
          <p className="text-sm font-medium text-slate-500 mb-1">Total Predictions</p>
          <p className="text-3xl font-bold text-slate-900 tracking-tight">{metrics.total_predictions}</p>
        </div>
        <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center group-hover:scale-110 transition-transform">
          <Users className="w-6 h-6 text-indigo-600" />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex items-center justify-between group hover:border-rose-200 transition-colors">
        <div>
          <p className="text-sm font-medium text-slate-500 mb-1">Flagged Rate (Churn)</p>
          <p className="text-3xl font-bold text-slate-900 tracking-tight">{flaggedRate}<span className="text-xl text-slate-400">%</span></p>
        </div>
        <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center group-hover:scale-110 transition-transform">
          <AlertTriangle className="w-6 h-6 text-rose-500" />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex items-center justify-between group hover:border-emerald-200 transition-colors">
        <div>
          <p className="text-sm font-medium text-slate-500 mb-1">Avg Latency</p>
          <p className="text-3xl font-bold text-slate-900 tracking-tight">{(metrics.average_latency_seconds * 1000).toFixed(1)}<span className="text-xl text-slate-400">ms</span></p>
        </div>
        <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center group-hover:scale-110 transition-transform">
          <Clock className="w-6 h-6 text-emerald-600" />
        </div>
      </div>
      
    </div>
  );
}
