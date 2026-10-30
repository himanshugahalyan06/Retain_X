import axios from 'axios';

let currentAuthToken = null;

// Use relative URL by default to leverage Vite dev proxy and avoid cross-origin CORS preflights
const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL !== undefined ? import.meta.env.VITE_API_URL : '',
  timeout: 15000,
});

// Request interceptor to attach JWT Bearer token
API.interceptors.request.use(
  (config) => {
    if (currentAuthToken) {
      config.headers['Authorization'] = `Bearer ${currentAuthToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const setAuthToken = (token) => {
  currentAuthToken = token;
};

// High-speed In-Memory SWR Cache for GET requests
const memoryCache = new Map();

export const cachedGet = async (url, params = null, ttlMs = 15000) => {
  const cacheKey = `${url}?${JSON.stringify(params || {})}`;
  const cached = memoryCache.get(cacheKey);
  const now = Date.now();
  if (cached && now - cached.timestamp < ttlMs) {
    return cached.data;
  }
  const res = await API.get(url, { params });
  memoryCache.set(cacheKey, { timestamp: now, data: res });
  return res;
};

export const clearApiCache = (urlPrefix = null) => {
  if (!urlPrefix) {
    memoryCache.clear();
  } else {
    for (const key of memoryCache.keys()) {
      if (key.startsWith(urlPrefix)) {
        memoryCache.delete(key);
      }
    }
  }
};

// Authentication Endpoints
export const loginApi = (credentials) => API.post('/api/auth/login', credentials);
export const signupApi = (data) => API.post('/api/auth/signup', data);
export const refreshTokenApi = (data) => API.post('/api/auth/refresh', data);
export const logoutApi = () => API.post('/api/auth/logout');
export const getMe = () => cachedGet('/api/auth/me', null, 10000);

// Password Management & Email Verification
export const forgotPasswordApi = (data) => API.post('/api/auth/forgot-password', data);
export const resetPasswordApi = (data) => API.post('/api/auth/reset-password', data);
export const verifyEmailRequestApi = (data) => API.post('/api/auth/verify-email/request', data);
export const verifyEmailConfirmApi = (data) => API.post('/api/auth/verify-email/confirm', data);

// Team & Invitation Management
export const getInvitationsApi = () => API.get('/api/auth/invitations');
export const inviteUserApi = (data) => API.post('/api/auth/invitations', data);
export const verifyInvitationApi = (token) => API.get(`/api/auth/invitations/${token}/verify`);
export const acceptInvitationApi = (data) => API.post('/api/auth/invitations/accept', data);
export const getTeamMembersApi = () => API.get('/api/auth/team/members');
export const updateMemberRoleApi = (memberId, data) => API.put(`/api/auth/team/members/${memberId}`, data);
export const getAuditLogsApi = (params) => API.get('/api/auth/audit-logs', { params });

// Core Prediction & Explain Endpoints
export const predict = (formData) => API.post('/api/predict', formData);
export const explain = (formData) => API.post('/api/explain', formData);
export const getMetrics = () => cachedGet('/api/metrics', null, 15000);
export const getHealth = () => API.get('/health');

// Retention Decision Intelligence Endpoints
export const getInterventions = () => cachedGet('/api/v1/retention/interventions', null, 30000);
export const createIntervention = async (data) => {
  const res = await API.post('/api/v1/retention/interventions', data);
  clearApiCache('/api/v1/retention');
  return res;
};
export const updateIntervention = async (id, data) => {
  const res = await API.put(`/api/v1/retention/interventions/${id}`, data);
  clearApiCache('/api/v1/retention');
  return res;
};
export const deleteIntervention = async (id) => {
  const res = await API.delete(`/api/v1/retention/interventions/${id}`);
  clearApiCache('/api/v1/retention');
  return res;
};
export const applyIntervention = async (data) => {
  const res = await API.post('/api/v1/retention/interventions/apply', data);
  clearApiCache('/api/v1/retention');
  return res;
};
export const recordOutcome = async (data) => {
  const res = await API.post('/api/v1/retention/outcomes', data);
  clearApiCache('/api/v1/retention');
  return res;
};
export const getSettings = () => cachedGet('/api/v1/retention/settings', null, 60000);
export const saveSettings = async (data) => {
  const res = await API.post('/api/v1/retention/settings', data);
  clearApiCache('/api/v1/retention');
  return res;
};
export const recalculateThreshold = async () => {
  const res = await API.post('/api/retention/recalculate-threshold');
  clearApiCache();
  return res;
};
export const getDecisions = (params) => API.get('/api/v1/retention/queue', { params });
export const getRetentionQueue = (params) => API.get('/api/v1/retention/queue', { params });
export const getCustomerDetail = (id) => cachedGet(`/api/v1/retention/customers/${id}`, null, 30000);
export const getRetentionDashboard = () => cachedGet('/api/v1/retention/dashboard', null, 15000);
export const recommendIntervention = (data) => API.post('/api/v1/retention/recommend', data);

// Manager Decision Workflows
export const approveDecision = async (id, data = {}) => {
  const res = await API.post(`/api/v1/retention/decisions/${id}/approve`, data);
  clearApiCache('/api/v1/retention');
  return res;
};
export const rejectDecision = async (id, data = {}) => {
  const res = await API.post(`/api/v1/retention/decisions/${id}/reject`, data);
  clearApiCache('/api/v1/retention');
  return res;
};
export const overrideDecision = async (id, data) => {
  const res = await API.post(`/api/v1/retention/decisions/${id}/override`, data);
  clearApiCache('/api/v1/retention');
  return res;
};

// Campaign Management Endpoints
export const getCampaigns = () => cachedGet('/api/v1/campaigns', null, 30000);
export const createCampaign = async (data) => {
  const res = await API.post('/api/v1/campaigns', data);
  clearApiCache('/api/v1/campaigns');
  return res;
};
export const launchCampaign = async (id) => {
  const res = await API.post(`/api/v1/campaigns/${id}/launch`);
  clearApiCache('/api/v1/campaigns');
  return res;
};
export const getCampaignAnalytics = (id) => cachedGet(`/api/v1/campaigns/${id}/analytics`, null, 15000);

// Uplift & Causal Studio Endpoints
export const getUpliftStatus = () => cachedGet('/api/v1/uplift/status', null, 30000);
export const simulateUplift = (params) => API.post('/api/v1/uplift/simulate', null, { params });

// What-If Scenario Simulation Endpoint
export const simulateWhatIf = (data) => API.post('/api/simulate', data);

// Batch CSV Ingestion & Scoring Endpoint
export const uploadBatchCsv = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await API.post('/api/v1/customers/batch-upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  clearApiCache();
  return res;
};

// Analytics & Visualization Engine
export const getDashboardAnalytics = () => cachedGet('/api/v1/analytics/dashboard', null, 15000);

// Company Datasets Endpoints
export const uploadDataset = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await API.post('/api/v1/datasets/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  clearApiCache('/api/v1/datasets');
  return res;
};
export const getDatasets = () => cachedGet('/api/v1/datasets', null, 20000);
export const getDataset = (id) => cachedGet(`/api/v1/datasets/${id}`, null, 30000);
export const profileDataset = (id, data = {}) => API.post(`/api/v1/datasets/${id}/profile`, data);
export const deleteDataset = async (id) => {
  const res = await API.delete(`/api/v1/datasets/${id}`);
  clearApiCache('/api/v1/datasets');
  return res;
};

// Company Model Training & Registry Endpoints
export const startTrainingJob = async (data) => {
  const res = await API.post('/api/v1/training-jobs', data);
  clearApiCache('/api/v1/training-jobs');
  clearApiCache('/api/v1/models');
  return res;
};
export const getTrainingJobs = () => API.get('/api/v1/training-jobs');
export const getTrainingJob = (id) => API.get(`/api/v1/training-jobs/${id}`);
export const getModels = () => cachedGet('/api/v1/models', null, 20000);
export const getModel = (id) => cachedGet(`/api/v1/models/${id}`, null, 30000);
export const getActiveModel = () => cachedGet('/api/v1/models/active', null, 20000);
export const activateModel = async (id) => {
  const res = await API.post(`/api/v1/models/${id}/activate`);
  clearApiCache('/api/v1/models');
  clearApiCache('/api/v1/analytics');
  return res;
};

export default API;



