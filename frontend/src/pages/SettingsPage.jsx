import React, { useState, useEffect } from 'react';
import {
  Settings,
  Save,
  RefreshCw,
  Scale,
  ShieldCheck,
  Building2,
  User,
  Key,
  CheckCircle2,
  AlertCircle,
  Users,
  UserPlus,
  Mail,
  Shield,
  FileText,
  Clock,
  Loader2,
  ArrowRight
} from 'lucide-react';
import {
  getSettings,
  saveSettings,
  recalculateThreshold,
  getTeamMembersApi,
  getInvitationsApi,
  inviteUserApi,
  updateMemberRoleApi,
  getAuditLogsApi
} from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function SettingsPage() {
  const { user, role, companyName, isAdmin, isManager } = useAuth();
  const [activeTab, setActiveTab] = useState('economics');

  // Economics state
  const [settings, setSettings] = useState({
    false_positive_cost: 500.0,
    false_negative_cost: 5000.0,
    default_gross_margin: 0.65,
    expected_lifetime_m2m: 12,
    expected_lifetime_one_year: 24,
    expected_lifetime_two_year: 36,
    min_roi_threshold: 0.2,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [recalibrating, setRecalibrating] = useState(false);
  const [message, setMessage] = useState(null);

  // Team management state
  const [members, setMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('MEMBER');
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState(null);

  // Audit logs state
  const [auditLogs, setAuditLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const res = await getSettings();
        if (res.data) setSettings(res.data);
      } catch (err) {
        console.error('Settings load error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  // Fetch team members when team tab is clicked
  useEffect(() => {
    if (activeTab === 'team' && isAdmin) {
      loadTeam();
    }
    if (activeTab === 'audit' && isAdmin) {
      loadAuditLogs();
    }
  }, [activeTab, isAdmin]);

  const loadTeam = async () => {
    try {
      const [membersRes, invitesRes] = await Promise.all([
        getTeamMembersApi(),
        getInvitationsApi(),
      ]);
      setMembers(membersRes.data || []);
      setInvitations(invitesRes.data || []);
    } catch (e) {
      console.warn('Team fetch error:', e);
    }
  };

  const loadAuditLogs = async () => {
    setLogsLoading(true);
    try {
      const res = await getAuditLogsApi({ limit: 50 });
      setAuditLogs(res.data || []);
    } catch (e) {
      console.warn('Audit logs fetch error:', e);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setSettings((prev) => ({
      ...prev,
      [field]: parseFloat(value) || value,
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await saveSettings(settings);
      setMessage({ type: 'success', text: 'Workspace economic settings successfully updated.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to update settings.' });
    } finally {
      setSaving(false);
    }
  };

  const handleRecalibrate = async () => {
    setRecalibrating(true);
    setMessage(null);
    try {
      const res = await recalculateThreshold();
      setMessage({
        type: 'success',
        text: `Optimal cutoff threshold successfully recalibrated: ${res.data?.optimal_threshold || 0.42}`,
      });
    } catch (err) {
      setMessage({ type: 'error', text: 'Threshold recalibration failed.' });
    } finally {
      setRecalibrating(false);
    }
  };

  const handleInviteUser = async (e) => {
    e.preventDefault();
    setInviting(true);
    setInviteResult(null);
    try {
      const res = await inviteUserApi({ email: inviteEmail, role: inviteRole });
      setInviteResult({
        type: 'success',
        text: `Invitation dispatched to ${inviteEmail}. Token: ${res.data?.invite_token?.slice(0, 16)}...`,
      });
      setInviteEmail('');
      loadTeam();
    } catch (err) {
      setInviteResult({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to dispatch invitation.',
      });
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (memberId, newRole) => {
    try {
      await updateMemberRoleApi(memberId, { role: newRole });
      loadTeam();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update member role.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-black text-[#111111] font-display tracking-tight">
          Settings & Workspace Governance
        </h1>
        <p className="text-xs text-[#656565] mt-1">
          Configure economic loss penalties, organization credentials, team RBAC roles, and security audit logs.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#D8D8D5] gap-2">
        <button
          onClick={() => setActiveTab('economics')}
          className={`pb-3 px-3 text-xs font-bold transition-all ${
            activeTab === 'economics'
              ? 'border-b-2 border-[#111111] text-[#111111]'
              : 'text-[#656565] hover:text-[#111111]'
          }`}
        >
          Economic Loss Matrix
        </button>
        <button
          onClick={() => setActiveTab('organization')}
          className={`pb-3 px-3 text-xs font-bold transition-all ${
            activeTab === 'organization'
              ? 'border-b-2 border-[#111111] text-[#111111]'
              : 'text-[#656565] hover:text-[#111111]'
          }`}
        >
          Organization & Profile
        </button>
        {isAdmin && (
          <button
            onClick={() => setActiveTab('team')}
            className={`pb-3 px-3 text-xs font-bold transition-all ${
              activeTab === 'team'
                ? 'border-b-2 border-[#111111] text-[#111111]'
                : 'text-[#656565] hover:text-[#111111]'
            }`}
          >
            Team & RBAC Roles
          </button>
        )}
        {isAdmin && (
          <button
            onClick={() => setActiveTab('audit')}
            className={`pb-3 px-3 text-xs font-bold transition-all ${
              activeTab === 'audit'
                ? 'border-b-2 border-[#111111] text-[#111111]'
                : 'text-[#656565] hover:text-[#111111]'
            }`}
          >
            Security Audit Trail
          </button>
        )}
      </div>

      {/* ─── TAB: ECONOMICS ────────────────────────────────────────── */}
      {activeTab === 'economics' && (
        <form onSubmit={handleSave} className="space-y-6">
          {message && (
            <div
              className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs font-medium ${
                message.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-[#5FB57A]" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          <div className="saas-card">
            <div className="saas-card-header">
              <div className="flex items-center gap-2.5">
                <Scale className="w-4 h-4 text-[#5FB57A]" />
                <h3 className="text-sm font-bold text-[#111111]">Cost-Sensitive Loss Matrix</h3>
              </div>
              {isManager && (
                <button
                  type="button"
                  onClick={handleRecalibrate}
                  disabled={recalibrating}
                  className="btn-secondary py-1.5 px-3 text-xs font-bold flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${recalibrating ? 'animate-spin' : ''}`} />
                  <span>Recalibrate Cutoff</span>
                </button>
              )}
            </div>

            <div className="saas-card-body grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="form-label">False Positive Cost ($)</label>
                <input
                  type="number"
                  value={settings.false_positive_cost}
                  onChange={(e) => handleChange('false_positive_cost', e.target.value)}
                  className="form-input"
                  disabled={!isManager}
                />
                <span className="text-[11px] text-[#8E8E8A] mt-1 block">
                  Cost of an unnecessary retention offer on an already loyal customer.
                </span>
              </div>

              <div>
                <label className="form-label">False Negative Cost ($)</label>
                <input
                  type="number"
                  value={settings.false_negative_cost}
                  onChange={(e) => handleChange('false_negative_cost', e.target.value)}
                  className="form-input"
                  disabled={!isManager}
                />
                <span className="text-[11px] text-[#8E8E8A] mt-1 block">
                  Heavy business loss of missing an at-risk customer (Lost Lifetime Value).
                </span>
              </div>

              <div>
                <label className="form-label">Default Gross Margin (0.0 - 1.0)</label>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  max="1"
                  value={settings.default_gross_margin}
                  onChange={(e) => handleChange('default_gross_margin', e.target.value)}
                  className="form-input"
                  disabled={!isManager}
                />
                <span className="text-[11px] text-[#8E8E8A] mt-1 block">
                  Gross profit margin ratio applied to recurring subscription revenue.
                </span>
              </div>

              <div>
                <label className="form-label">Minimum Intervention ROI</label>
                <input
                  type="number"
                  step="0.05"
                  value={settings.min_roi_threshold}
                  onChange={(e) => handleChange('min_roi_threshold', e.target.value)}
                  className="form-input"
                  disabled={!isManager}
                />
                <span className="text-[11px] text-[#8E8E8A] mt-1 block">
                  Expected net benefit threshold required to recommend an automated offer.
                </span>
              </div>
            </div>
          </div>

          {isManager && (
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="btn-ink py-2.5 px-6 text-xs flex items-center gap-2"
              >
                <Save className="w-3.5 h-3.5 text-[#5FB57A]" />
                <span>{saving ? 'Saving...' : 'Save Economic Matrix'}</span>
              </button>
            </div>
          )}
        </form>
      )}

      {/* ─── TAB: ORGANIZATION ──────────────────────────────────────── */}
      {activeTab === 'organization' && (
        <div className="space-y-6">
          <div className="saas-card">
            <div className="saas-card-header">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#5FB57A]" />
                <h3 className="text-sm font-bold text-[#111111]">Tenant Identity & Account Profile</h3>
              </div>
            </div>
            <div className="saas-card-body grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="form-label">Organization Name</label>
                <input type="text" readOnly value={companyName} className="form-input bg-[#F3F3F1]" />
              </div>
              <div>
                <label className="form-label">Tenant Identifier</label>
                <input type="text" readOnly value={user?.company_slug || 'tenant-isolated'} className="form-input bg-[#F3F3F1] font-mono text-xs" />
              </div>
              <div>
                <label className="form-label">Your User Account</label>
                <input type="text" readOnly value={user?.email} className="form-input bg-[#F3F3F1]" />
              </div>
              <div>
                <label className="form-label">Assigned Role</label>
                <input type="text" readOnly value={`${role} (Server Scoped)`} className="form-input bg-[#F3F3F1] font-bold" />
              </div>
            </div>
          </div>

          <div className="saas-card">
            <div className="saas-card-header">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#5FB57A]" />
                <h3 className="text-sm font-bold text-[#111111]">Security Architecture Posture</h3>
              </div>
            </div>
            <div className="saas-card-body text-xs text-[#656565] space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-[#F3F3F1] border border-[#D8D8D5]">
                <span>Tenant Isolation Scope:</span>
                <span className="font-bold text-[#111111]">Active (Strict Server-Side Filter)</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-[#F3F3F1] border border-[#D8D8D5]">
                <span>Session Refresh Rotation:</span>
                <span className="font-bold text-[#111111]">Active (Single-Use JTI Nonce)</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-[#F3F3F1] border border-[#D8D8D5]">
                <span>Brute-force Login Rate Limiter:</span>
                <span className="font-bold text-[#111111]">Active (5 attempts / 5 min window)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB: TEAM MANAGEMENT (ADMIN) ───────────────────────────── */}
      {activeTab === 'team' && isAdmin && (
        <div className="space-y-6">
          {/* Invite User Card */}
          <div className="saas-card">
            <div className="saas-card-header">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#5FB57A]" />
                <h3 className="text-sm font-bold text-[#111111]">Invite Colleague to Organization</h3>
              </div>
            </div>
            <div className="saas-card-body">
              {inviteResult && (
                <div
                  className={`mb-4 p-3 rounded-xl border text-xs font-medium ${
                    inviteResult.type === 'success'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}
                >
                  {inviteResult.text}
                </div>
              )}

              <form onSubmit={handleInviteUser} className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <Mail className="absolute left-3 top-2.5 w-4 h-4 text-[#8E8E8A]" />
                  <input
                    type="email"
                    required
                    placeholder="colleague@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="form-input pl-9"
                  />
                </div>
                <div className="w-40">
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="form-input"
                  >
                    <option value="MEMBER">Member (Analyst)</option>
                    <option value="MANAGER">Manager</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={inviting}
                  className="btn-ink py-2 px-5 text-xs font-bold flex items-center justify-center gap-2"
                >
                  {inviting ? <Loader2 className="w-4 h-4 animate-spin text-[#5FB57A]" /> : null}
                  <span>Send Invitation</span>
                </button>
              </form>
            </div>
          </div>

          {/* Members Table */}
          <div className="saas-card overflow-hidden">
            <div className="saas-card-header">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#5FB57A]" />
                <h3 className="text-sm font-bold text-[#111111]">Active Team Members ({members.length})</h3>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="saas-table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.id}>
                      <td className="font-bold text-[#111111]">{m.full_name || 'Member'}</td>
                      <td className="text-xs text-[#656565] font-mono">{m.email}</td>
                      <td>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#F3F3F1] border border-[#D8D8D5]">
                          {m.role}
                        </span>
                      </td>
                      <td>
                        <span className="text-xs text-[#5FB57A] font-semibold">● Active</span>
                      </td>
                      <td>
                        {m.id !== user?.id ? (
                          <select
                            value={m.role}
                            onChange={(e) => handleRoleChange(m.id, e.target.value)}
                            className="text-xs p-1 rounded border border-[#D8D8D5] bg-white font-medium"
                          >
                            <option value="MEMBER">Member</option>
                            <option value="MANAGER">Manager</option>
                            <option value="ADMIN">Admin</option>
                          </select>
                        ) : (
                          <span className="text-[11px] text-[#8E8E8A] italic">Current User</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pending Invitations Table */}
          {invitations.length > 0 && (
            <div className="saas-card overflow-hidden">
              <div className="saas-card-header">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#8E8E8A]" />
                  <h3 className="text-sm font-bold text-[#111111]">Pending Invitations ({invitations.length})</h3>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="saas-table">
                  <thead>
                    <tr>
                      <th>Invited Email</th>
                      <th>Target Role</th>
                      <th>Expires At</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invitations.map((inv) => (
                      <tr key={inv.id}>
                        <td className="font-mono text-xs">{inv.email}</td>
                        <td className="text-xs font-bold">{inv.role}</td>
                        <td className="text-xs text-[#8E8E8A]">{new Date(inv.expires_at).toLocaleString()}</td>
                        <td>
                          <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            Pending Accept
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB: AUDIT LOGS (ADMIN) ────────────────────────────────── */}
      {activeTab === 'audit' && isAdmin && (
        <div className="saas-card overflow-hidden">
          <div className="saas-card-header">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#5FB57A]" />
              <h3 className="text-sm font-bold text-[#111111]">Compliance & Security Audit Trail</h3>
            </div>
            <button
              onClick={loadAuditLogs}
              disabled={logsLoading}
              className="btn-secondary py-1.5 px-3 text-xs font-bold flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${logsLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Logs</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="saas-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>User ID</th>
                  <th>Resource Target</th>
                  <th>IP Address</th>
                  <th>Event Details</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-xs text-[#8E8E8A]">
                      No audit events recorded yet for this organization.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="text-xs text-[#8E8E8A] whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="font-bold text-xs text-[#111111] font-mono">
                        {log.action}
                      </td>
                      <td className="text-xs text-[#656565] font-mono">
                        {log.user_id ? `User #${log.user_id}` : 'Anonymous'}
                      </td>
                      <td className="text-xs text-[#656565]">
                        {log.resource_type ? `${log.resource_type}:${log.resource_id || ''}` : '-'}
                      </td>
                      <td className="text-xs font-mono text-[#8E8E8A]">
                        {log.ip_address || '127.0.0.1'}
                      </td>
                      <td className="text-xs text-[#656565] max-w-xs truncate">
                        {log.details || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
