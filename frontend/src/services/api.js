const rawApiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
const cleanApiBase = rawApiBase.replace(/\/+$/, '');
const API_BASE_URL = cleanApiBase.endsWith('/api') ? cleanApiBase : `${cleanApiBase}/api`;

// Storage helpers
export function getAccessToken() {
  return localStorage.getItem('greengrid_access_token');
}

export function getRefreshToken() {
  return localStorage.getItem('greengrid_refresh_token');
}

export function setTokens(access, refresh) {
  if (access) localStorage.setItem('greengrid_access_token', access);
  if (refresh) localStorage.setItem('greengrid_refresh_token', refresh);
}

export function clearTokens() {
  localStorage.removeItem('greengrid_access_token');
  localStorage.removeItem('greengrid_refresh_token');
  localStorage.removeItem('greengrid_user_data');
}

// Universal fetch wrapper with auto JWT token refresh
export async function apiRequest(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  let token = getAccessToken();
  if (token && !options.skipAuth) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let res = await fetch(url, { ...options, headers });

  // If 401 Unauthorized, attempt token refresh once
  if (res.status === 401 && getRefreshToken() && !options._isRetry) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      headers['Authorization'] = `Bearer ${getAccessToken()}`;
      res = await fetch(url, { ...options, headers, _isRetry: true });
    } else {
      clearTokens();
      if (window.location.pathname.startsWith('/app')) {
        window.location.href = '/login?session_expired=true';
      }
    }
  }

  const contentType = res.headers.get('content-type');
  let data;
  if (contentType && contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  if (!res.ok) {
    let errorMsg = data?.error || data?.detail;
    if (!errorMsg) {
      if (typeof data === 'string') {
        errorMsg = data;
      } else if (data && typeof data === 'object') {
        const messages = Object.entries(data)
          .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(' ') : val}`)
          .join(' | ');
        errorMsg = messages || 'API Request Failed';
      } else {
        errorMsg = 'API Request Failed';
      }
    }
    throw new Error(errorMsg);
  }

  return data;
}

// Token refresh helper
export async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${API_BASE_URL}/auth/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: refreshToken })
    });
    if (!res.ok) return false;
    const data = await res.json();
    setTokens(data.access, data.refresh || refreshToken);
    return true;
  } catch (err) {
    return false;
  }
}

// Authentication API methods
export async function loginApi(email, password) {
  clearTokens();
  const data = await apiRequest('/auth/login/', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
    skipAuth: true
  });
  setTokens(data.access, data.refresh);
  localStorage.setItem('greengrid_user_data', JSON.stringify(data.user));
  return data;
}

export async function loginWithGoogleApi(credential, organizationName = null, invitationToken = null, autoProvision = true) {
  clearTokens();
  const payload = { credential };
  if (organizationName) payload.organization_name = organizationName;
  if (invitationToken) payload.invitation_token = invitationToken;
  if (autoProvision) payload.auto_provision = true;

  const data = await apiRequest('/auth/google/', {
    method: 'POST',
    body: JSON.stringify(payload),
    skipAuth: true
  });
  setTokens(data.access, data.refresh);
  localStorage.setItem('greengrid_user_data', JSON.stringify(data.user));
  return data;
}

export async function registerApi(payload) {
  clearTokens();
  const data = await apiRequest('/auth/register/', {
    method: 'POST',
    body: JSON.stringify(payload),
    skipAuth: true
  });
  setTokens(data.access, data.refresh);
  localStorage.setItem('greengrid_user_data', JSON.stringify(data.user));
  return data;
}

export async function logoutApi() {
  try {
    const refresh = getRefreshToken();
    if (refresh) {
      await apiRequest('/auth/logout/', {
        method: 'POST',
        body: JSON.stringify({ refresh })
      });
    }
  } catch (err) {
    // Ignore logout errors
  } finally {
    clearTokens();
  }
}

export async function getMeApi() {
  return await apiRequest('/auth/me/');
}

export async function updateProfileApi(payload) {
  return await apiRequest('/auth/profile/', {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export async function changePasswordApi(old_password, new_password) {
  return await apiRequest('/auth/change-password/', {
    method: 'POST',
    body: JSON.stringify({ old_password, new_password })
  });
}

export async function forgotPasswordApi(email) {
  return await apiRequest('/auth/forgot-password/', {
    method: 'POST',
    body: JSON.stringify({ email }),
    skipAuth: true
  });
}

export async function resetPasswordApi(token, new_password) {
  return await apiRequest('/auth/reset-password/', {
    method: 'POST',
    body: JSON.stringify({ token, new_password }),
    skipAuth: true
  });
}

// User Management & Invitations
export async function fetchUsersApi() {
  return await apiRequest('/users/');
}

export async function inviteUserApi(email, role, facility_ids = []) {
  return await apiRequest('/users/invite/', {
    method: 'POST',
    body: JSON.stringify({ email, role, facility_ids })
  });
}

export async function getInvitationDetailsApi(token) {
  return await apiRequest(`/invitations/${token}/`, { skipAuth: true });
}

export async function acceptInvitationApi(token, full_name, password) {
  clearTokens();
  const data = await apiRequest('/invitations/accept/', {
    method: 'POST',
    body: JSON.stringify({ token, full_name, password }),
    skipAuth: true
  });
  setTokens(data.access, data.refresh);
  localStorage.setItem('greengrid_user_data', JSON.stringify(data.user));
  return data;
}

export async function updateUserRoleApi(userId, role, department) {
  return await apiRequest(`/users/${userId}/`, {
    method: 'PATCH',
    body: JSON.stringify({ role, department })
  });
}

export async function disableUserApi(userId) {
  return await apiRequest(`/users/${userId}/disable/`, { method: 'POST' });
}

export async function enableUserApi(userId) {
  return await apiRequest(`/users/${userId}/enable/`, { method: 'POST' });
}

// Facility Access Delegation
export async function fetchFacilityAccessApi() {
  return await apiRequest('/facility-access/');
}

export async function grantFacilityAccessApi(userId, facilityId) {
  return await apiRequest('/facility-access/', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, facility_id: facilityId })
  });
}

export async function revokeFacilityAccessApi(accessId) {
  return await apiRequest(`/facility-access/${accessId}/`, { method: 'DELETE' });
}

// Organization Settings & Audit
export async function fetchOrganizationApi() {
  return await apiRequest('/organization/');
}

export async function updateOrganizationApi(payload) {
  return await apiRequest('/organization/', {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export async function fetchAuditLogsApi() {
  return await apiRequest('/audit-logs/');
}

export async function fetchNotificationsApi() {
  return await apiRequest('/notifications/');
}

export async function markNotificationsReadApi() {
  return await apiRequest('/notifications/', { method: 'POST' });
}

// Domain Telemetry & Phase 3 Energy Analytics APIs
export async function fetchDashboardOverview(facilityId = 'all', dateRange = '7d', start = '', end = '') {
  let url = `/dashboard/?facility_id=${facilityId}&range=${dateRange}`;
  if (start && end) url += `&start=${start}&end=${end}`;
  return await apiRequest(url);
}

export async function fetchFacilities() {
  const data = await apiRequest('/facilities/');
  return data.results || data;
}

export async function fetchFacilityDetail(facilityId) {
  return await apiRequest(`/facilities/${facilityId}/`);
}

export async function fetchMeters() {
  const data = await apiRequest('/meters/');
  return data.results || data;
}

export async function fetchMeterDetail(meterId) {
  return await apiRequest(`/meters/${meterId}/`);
}

export async function fetchAlerts() {
  const data = await apiRequest('/alerts/');
  return data.results || data;
}

export async function fetchUtilityBills() {
  const data = await apiRequest('/utility-bills/');
  return data.results || data;
}

export async function fetchEnergySummary(facilityId = 'all', dateRange = '7d', start = '', end = '') {
  let url = `/energy/summary/?facility_id=${facilityId}&range=${dateRange}`;
  if (start && end) url += `&start=${start}&end=${end}`;
  return await apiRequest(url);
}

export async function fetchEnergyTimeseries(facilityId = 'all', meterId = 'all', dateRange = '7d', aggregation = '', source = '', start = '', end = '') {
  let url = `/energy/timeseries/?facility_id=${facilityId}&meter_id=${meterId}&range=${dateRange}`;
  if (aggregation) url += `&aggregation=${aggregation}`;
  if (source) url += `&source=${source}`;
  if (start && end) url += `&start=${start}&end=${end}`;
  return await apiRequest(url);
}

export async function fetchEnergyDemand(facilityId = 'all', meterId = 'all', dateRange = '7d', start = '', end = '') {
  let url = `/energy/demand/?facility_id=${facilityId}&meter_id=${meterId}&range=${dateRange}`;
  if (start && end) url += `&start=${start}&end=${end}`;
  return await apiRequest(url);
}

export async function fetchEnergyByFacility(dateRange = '7d', start = '', end = '') {
  let url = `/energy/by-facility/?range=${dateRange}`;
  if (start && end) url += `&start=${start}&end=${end}`;
  return await apiRequest(url);
}

export async function fetchEnergyByMeter(facilityId = 'all') {
  return await apiRequest(`/energy/by-meter/?facility_id=${facilityId}`);
}

export async function fetchEnergyBySource(facilityId = 'all', dateRange = '7d', start = '', end = '') {
  let url = `/energy/by-source/?facility_id=${facilityId}&range=${dateRange}`;
  if (start && end) url += `&start=${start}&end=${end}`;
  return await apiRequest(url);
}

export async function fetchEnergyIntensity(dateRange = '7d', start = '', end = '') {
  let url = `/energy/intensity/?range=${dateRange}`;
  if (start && end) url += `&start=${start}&end=${end}`;
  return await apiRequest(url);
}

export async function fetchEnergyDataQuality(facilityId = 'all', dateRange = '7d', start = '', end = '') {
  let url = `/energy/data-quality/?facility_id=${facilityId}&range=${dateRange}`;
  if (start && end) url += `&start=${start}&end=${end}`;
  return await apiRequest(url);
}

export function getEnergyExportUrl(facilityId = 'all', meterId = 'all', dateRange = '7d', start = '', end = '', source = '') {
  let url = `${API_BASE_URL}/energy/export/?facility_id=${facilityId}&meter_id=${meterId}&range=${dateRange}`;
  if (source) url += `&source=${source}`;
  if (start && end) url += `&start=${start}&end=${end}`;
  return url;
}

export async function fetchIngestionCredentials() {
  return await apiRequest('/ingestion/credentials/');
}

export async function createIngestionCredential(name) {
  return await apiRequest('/ingestion/credentials/', {
    method: 'POST',
    body: JSON.stringify({ name })
  });
}

export async function revokeIngestionCredential(id) {
  return await apiRequest(`/ingestion/credentials/${id}/`, {
    method: 'DELETE'
  });
}

export async function ingestTelemetryApi(payload, apiKey = '') {
  const headers = {};
  if (apiKey) {
    headers['X-API-Key'] = apiKey;
  }
  return await apiRequest('/ingestion/readings/', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });
}

// Phase 4 Tariff & Billing API Client Methods
export async function fetchTariffsApi() {
  const data = await apiRequest('/billing/tariffs/');
  return data.results || data;
}

export async function createTariffApi(payload) {
  return await apiRequest('/billing/tariffs/', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function updateTariffApi(id, payload) {
  return await apiRequest(`/billing/tariffs/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export async function deleteTariffApi(id) {
  return await apiRequest(`/billing/tariffs/${id}/`, { method: 'DELETE' });
}

export async function fetchTouPeriodsApi(tariffId) {
  return await apiRequest(`/billing/tariffs/${tariffId}/tou-periods/`);
}

export async function createTouPeriodApi(tariffId, payload) {
  return await apiRequest(`/billing/tariffs/${tariffId}/tou-periods/`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function deleteTouPeriodApi(id) {
  return await apiRequest(`/billing/tou-periods/${id}/`, { method: 'DELETE' });
}

export async function fetchDemandRulesApi() {
  const data = await apiRequest('/billing/demand-rules/');
  return data.results || data;
}

export async function createDemandRuleApi(payload) {
  return await apiRequest('/billing/demand-rules/', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function fetchBillsApi(facilityId = 'all', reconciliationStatus = '') {
  let url = '/billing/bills/';
  const params = [];
  if (facilityId && facilityId !== 'all') params.push(`facility=${facilityId}`);
  if (reconciliationStatus) params.push(`reconciliation_status=${reconciliationStatus}`);
  if (params.length > 0) url += `?${params.join('&')}`;

  const data = await apiRequest(url);
  return data.results || data;
}

export async function fetchBillDetailApi(billId) {
  return await apiRequest(`/billing/bills/${billId}/`);
}

export async function createBillApi(payload) {
  return await apiRequest('/billing/bills/', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function updateBillApi(billId, payload) {
  return await apiRequest(`/billing/bills/${billId}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export async function deleteBillApi(billId) {
  return await apiRequest(`/billing/bills/${billId}/`, { method: 'DELETE' });
}

export async function calculateBillApi(billId) {
  return await apiRequest(`/billing/bills/${billId}/calculate/`, { method: 'POST' });
}

export async function reconcileBillApi(billId, tolerancePercentage = 2.0) {
  return await apiRequest(`/billing/bills/${billId}/reconcile/`, {
    method: 'POST',
    body: JSON.stringify({ tolerance_percentage: tolerancePercentage })
  });
}

export async function fetchBillBreakdownApi(billId) {
  return await apiRequest(`/billing/bills/${billId}/breakdown/`);
}

export async function uploadBillDocumentApi(billId, file) {
  const formData = new FormData();
  formData.append('file', file);

  const url = `${API_BASE_URL}/billing/bills/${billId}/upload-document/`;
  const headers = {};
  const token = getAccessToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: formData
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Document upload failed.');
  }

  return await res.json();
}

export async function fetchBillingSummaryApi(facilityId = 'all', dateRange = '30d') {
  let url = `/billing/summary/?range=${dateRange}`;
  if (facilityId && facilityId !== 'all') url += `&facility=${facilityId}`;
  return await apiRequest(url);
}

export async function fetchBillingCostTimeseriesApi(facilityId = 'all') {
  let url = '/billing/cost-timeseries/';
  if (facilityId && facilityId !== 'all') url += `?facility=${facilityId}`;
  return await apiRequest(url);
}

export async function fetchBillingCostByFacilityApi() {
  return await apiRequest('/billing/cost-by-facility/');
}

export async function fetchBillingCostByMeterApi(facilityId = 'all') {
  let url = '/billing/cost-by-meter/';
  if (facilityId && facilityId !== 'all') url += `?facility=${facilityId}`;
  return await apiRequest(url);
}

export async function fetchBillingTouBreakdownApi(facilityId = 'all') {
  let url = '/billing/tou-breakdown/';
  if (facilityId && facilityId !== 'all') url += `?facility=${facilityId}`;
  return await apiRequest(url);
}

export async function fetchBillingDemandCostApi(facilityId = 'all') {
  let url = '/billing/demand-cost/';
  if (facilityId && facilityId !== 'all') url += `?facility=${facilityId}`;
  return await apiRequest(url);
}

export async function fetchBillingVarianceApi() {
  return await apiRequest('/billing/variance/');
}

export async function runTariffScenarioApi(payload) {
  return await apiRequest('/billing/tariff-scenario/', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function getBillingExportUrl() {
  return `${API_BASE_URL}/billing/export/`;
}

// Phase 5 Predictive Analytics & Optimization API Client Methods
export async function fetchForecastTimeseriesApi(facilityId = 'all', horizon = '24h', targetType = 'consumption') {
  let url = `/forecast/timeseries/?horizon=${horizon}&target_type=${targetType}`;
  if (facilityId && facilityId !== 'all') url += `&facility=${facilityId}`;
  return await apiRequest(url);
}

export async function fetchForecastAccuracyApi(facilityId = 'all') {
  let url = '/forecast/accuracy/';
  if (facilityId && facilityId !== 'all') url += `?facility=${facilityId}`;
  return await apiRequest(url);
}

export async function fetchPredictPeakDemandApi(facilityId = 'all') {
  let url = '/forecast/peak-demand/';
  if (facilityId && facilityId !== 'all') url += `?facility=${facilityId}`;
  return await apiRequest(url);
}

export async function fetchDemandResponseEventsApi(facilityId = 'all', status = '') {
  let url = '/demand-response/';
  const params = [];
  if (facilityId && facilityId !== 'all') params.push(`facility=${facilityId}`);
  if (status) params.push(`status=${status}`);
  if (params.length > 0) url += `?${params.join('&')}`;
  const data = await apiRequest(url);
  return data.results || data;
}

export async function createDemandResponseEventApi(payload) {
  return await apiRequest('/demand-response/', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function approveDemandResponseEventApi(id) {
  return await apiRequest(`/demand-response/${id}/approve/`, { method: 'POST' });
}

export async function cancelDemandResponseEventApi(id) {
  return await apiRequest(`/demand-response/${id}/cancel/`, { method: 'POST' });
}

export async function fetchDevicesApi(facilityId = 'all', protocol = '') {
  let url = '/devices/';
  const params = [];
  if (facilityId && facilityId !== 'all') params.push(`facility=${facilityId}`);
  if (protocol) params.push(`protocol=${protocol}`);
  if (params.length > 0) url += `?${params.join('&')}`;
  const data = await apiRequest(url);
  return data.results || data;
}

export async function createDeviceApi(payload) {
  return await apiRequest('/devices/', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function checkDeviceHealthApi(id) {
  return await apiRequest(`/devices/${id}/health/`);
}

export async function fetchStorageAssetsApi() {
  const data = await apiRequest('/storage-assets/');
  return data.results || data;
}

export async function fetchOptimizationRecommendationsApi(facilityId = 'all') {
  let url = '/optimization/recommendations/generate/';
  if (facilityId && facilityId !== 'all') url += `?facility=${facilityId}`;
  return await apiRequest(url);
}

export async function approveOptimizationRecommendationApi(id) {
  return await apiRequest(`/optimization/recommendations/${id}/approve/`, { method: 'POST' });
}

export async function fetchScenariosApi() {
  const data = await apiRequest('/scenarios/');
  return data.results || data;
}

export async function createScenarioApi(payload) {
  return await apiRequest('/scenarios/', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function globalSearchApi(query) {
  return apiRequest(`/search/?q=${encodeURIComponent(query)}`);
}

export async function healthCheckApi() {
  return apiRequest('/health/');
}

// Phase 6 Carbon, ML, Automation, System Health & Reports API Methods
export async function fetchCarbonSummaryApi(facilityId = 'all', days = 30) {
  let url = `/carbon/summary/?days=${days}`;
  if (facilityId && facilityId !== 'all') url += `&facility=${facilityId}`;
  return await apiRequest(url);
}

export async function fetchRenewableIntelligenceApi(facilityId = 'all', days = 30) {
  let url = `/carbon/renewable-intelligence/?days=${days}`;
  if (facilityId && facilityId !== 'all') url += `&facility=${facilityId}`;
  return await apiRequest(url);
}

export async function fetchEmissionFactorsApi() {
  const data = await apiRequest('/emission-factors/');
  return data.results || data;
}

export async function createEmissionFactorApi(payload) {
  return await apiRequest('/emission-factors/', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function fetchMlModelsApi() {
  const data = await apiRequest('/ml-models/');
  return data.results || data;
}

export async function fetchForecastExplainabilityApi(facilityId = 'all') {
  let url = '/forecast/explainability/';
  if (facilityId && facilityId !== 'all') url += `?facility=${facilityId}`;
  return await apiRequest(url);
}

export async function fetchForecastDriftCheckApi(facilityId = 'all') {
  let url = '/forecast/drift-check/';
  if (facilityId && facilityId !== 'all') url += `?facility=${facilityId}`;
  return await apiRequest(url);
}

export async function trainMlModelApi(facilityId = 'all', algorithm = 'random_forest') {
  const payload = { algorithm };
  if (facilityId && facilityId !== 'all') payload.facility = facilityId;
  return await apiRequest('/ml-models/train/', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function fetchAutomationConfigApi() {
  return await apiRequest('/automation/config/');
}

export async function fetchSafetyPoliciesApi() {
  const data = await apiRequest('/safety-policies/');
  return data.results || data;
}

export async function fetchControlCommandsApi() {
  const data = await apiRequest('/commands/');
  return data.results || data;
}

export async function emergencyStopApi(reason = 'User Manual Emergency Stop') {
  return await apiRequest('/automation/emergency-stop/', {
    method: 'POST',
    body: JSON.stringify({ reason })
  });
}

export async function createControlCommandApi(payload) {
  return await apiRequest('/commands/', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function approveControlCommandApi(cmdId) {
  return await apiRequest(`/commands/${cmdId}/approve/`, { method: 'POST' });
}

export async function cancelControlCommandApi(cmdId) {
  return await apiRequest(`/commands/${cmdId}/cancel/`, { method: 'POST' });
}

export async function fetchSystemHealthApi() {
  return await apiRequest('/system-health/');
}

export async function generateReportApi(reportType = 'energy', days = 30, facilityId = 'all') {
  let url = `/reports/generate/?report_type=${reportType}&days=${days}`;
  if (facilityId && facilityId !== 'all') url += `&facility=${facilityId}`;
  return await apiRequest(url);
}

export async function fetchScheduledReportsApi() {
  const data = await apiRequest('/scheduled-reports/');
  return data.results || data;
}

export async function createScheduledReportApi(payload) {
  return await apiRequest('/scheduled-reports/', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function fetchEnergyBenchmarkingApi(metric = 'kwh_per_sqft') {
  return await apiRequest(`/energy/benchmarking/?metric=${metric}`);
}



export const DEMO_FALLBACK_DATA = {
  kpis: {
    consumption: { value: "248,520", unit: "kWh", change_percent: -4.2, trend: "down", comparison_period: "vs prior 7 days", label: "Total Consumption" },
    cost: { value: "₹34,792.80", unit: "INR", change_percent: -3.8, trend: "down", comparison_period: "vs prior 7 days", label: "Energy Cost" },
    peak_demand: { value: "1,420", unit: "kW", change_percent: 1.5, trend: "up", comparison_period: "vs peak limit (1,500 kW)", label: "Peak Demand" },
    renewable_generation: { value: "82,400", unit: "kWh", change_percent: 12.4, trend: "up", comparison_period: "vs prior 7 days (33.1% solar offset)", label: "Renewable Generation" }
  },
  charts: {
    consumption_series: [
      { time: "00:00", grid: 140, solar: 0, battery: 25, total: 165, cost: 19.80 },
      { time: "06:00", grid: 210, solar: 10, battery: 0, total: 220, cost: 28.60 },
      { time: "12:00", grid: 410, solar: 320, battery: 0, total: 730, cost: 102.20 },
      { time: "18:00", grid: 390, solar: 30, battery: 80, total: 500, cost: 80.00 }
    ],
    facility_breakdown: [
      { id: 1, name: "Innovation Tech Center", kwh: 84200, cost: 11788, type: "Commercial Building", intensity: 14.0, status: "Optimal" },
      { id: 2, name: "Eastside Manufacturing Hub", kwh: 102400, cost: 14336, type: "Manufacturing Facility", intensity: 22.8, status: "High Demand" }
    ],
    peak_demand_profile: [
      { time: "Mon", actual_peak: 1280, limit: 1500 },
      { time: "Wed", actual_peak: 1420, limit: 1500 },
      { time: "Fri", actual_peak: 1360, limit: 1500 }
    ]
  },
  recent_alerts: [
    { id: 101, severity: "warning", title: "Peak Demand Threshold Warning", description: "Eastside Manufacturing Hub approached 98.6% of maximum contract demand limit.", facility_name: "Eastside Manufacturing Hub", timestamp: "2026-09-29T14:30:00Z", is_resolved: false }
  ]
};
