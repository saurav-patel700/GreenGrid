import React, { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import {
  Activity, AlertTriangle, ShieldCheck, Zap, Server, BatteryCharging,
  TrendingUp, CheckCircle, Sliders, ArrowUpRight, Cpu, Filter, RefreshCw, Sun, Check
} from 'lucide-react';
import StatusBadge from '../../components/common/StatusBadge';
import EmptyState from '../../components/common/EmptyState';
import LoadingState from '../../components/common/LoadingState';
import { apiRequest } from '../../services/api';

export default function OperationsCenterPage() {
  const { selectedFacility } = useOutletContext() || {};
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Operational Filters
  const [severityFilter, setSeverityFilter] = useState('all');
  const [deviceStatusFilter, setDeviceStatusFilter] = useState('all');

  const loadOperationsData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedFacility && selectedFacility !== 'all') params.append('facility', selectedFacility);
      if (severityFilter && severityFilter !== 'all') params.append('severity', severityFilter);
      if (deviceStatusFilter && deviceStatusFilter !== 'all') params.append('device_status', deviceStatusFilter);

      const result = await apiRequest(`/operations/summary/?${params.toString()}`);
      setData(result);
    } catch (err) {
      setError(err.message || 'Unable to load operations center telemetry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOperationsData();
  }, [selectedFacility, severityFilter, deviceStatusFilter]);

  if (loading && !data) {
    return <LoadingState message="Connecting to Operational Telemetry Pipeline & Fleet Sensors..." />;
  }

  if (error && !data) {
    return (
      <div className="card" style={{ padding: '2rem', borderLeft: '4px solid var(--color-danger-red)' }}>
        <h3 style={{ color: 'var(--color-danger-red)', margin: 0 }}>Operations Center Connectivity Failure</h3>
        <p style={{ color: 'var(--color-text-muted)', margin: '0.5rem 0 1rem 0' }}>{error}</p>
        <button onClick={loadOperationsData} className="btn btn-primary btn-sm">
          <RefreshCw size={14} /> Retry Connection
        </button>
      </div>
    );
  }

  const ops = data?.operations_matrix || {};
  const fleet = data?.fleet_health || {};
  const energy = data?.energy_summary_24h || {};
  const isEmergencyStop = data?.system_status === 'EMERGENCY_STOP';

  const alertsList = data?.active_alerts_list || [];
  const recsList = data?.recommended_actions_list || [];
  const devicesList = data?.device_health_list || [];
  const facilityList = data?.facility_status_list || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header & Controls Banner */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-bg-card)', padding: '1.25rem 1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <Activity size={26} color="var(--color-primary)" /> Operations Command Center
          </h1>
          <p style={{ margin: '0.25rem 0 0 0', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
            Real-time energy intelligence, telemetry pipeline status, device fleet matrix, and automation directives.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button onClick={loadOperationsData} className="btn btn-secondary btn-sm">
            <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh Telemetry
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#64748b' }}>Automation Status:</span>
            {isEmergencyStop ? (
              <span style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', padding: '0.375rem 0.75rem', borderRadius: '20px', fontWeight: 700, fontSize: '0.8125rem', display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                <AlertTriangle size={14} /> EMERGENCY STOP ACTIVE
              </span>
            ) : (
              <span style={{ background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', padding: '0.375rem 0.75rem', borderRadius: '20px', fontWeight: 700, fontSize: '0.8125rem', display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                <CheckCircle size={14} /> OPERATIONAL ({data?.automation_mode?.toUpperCase()})
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Operational Filtering Toolbar */}
      <div className="card" style={{ padding: '0.875rem 1.25rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-text-primary)' }}>
          <Filter size={16} color="var(--color-primary)" /> Operational Filters:
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <label style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>Alert Severity:</label>
            <select
              className="input-select"
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              style={{ padding: '0.25rem 0.5rem', fontSize: '0.8125rem', width: '130px' }}
            >
              <option value="all">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="WARNING">Warning</option>
              <option value="INFO">Info</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <label style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>Device Status:</label>
            <select
              className="input-select"
              value={deviceStatusFilter}
              onChange={(e) => setDeviceStatusFilter(e.target.value)}
              style={{ padding: '0.25rem 0.5rem', fontSize: '0.8125rem', width: '130px' }}
            >
              <option value="all">All Statuses</option>
              <option value="online">Online</option>
              <option value="offline">Offline</option>
              <option value="degraded">Degraded</option>
            </select>
          </div>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        {/* Device Fleet Status */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--color-text-muted)', fontSize: '0.8125rem', fontWeight: 600 }}>
            <span>IoT Fleet Telemetry</span>
            <Server size={18} color="var(--color-primary)" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-text-main)', margin: '0.5rem 0 0.25rem 0' }}>
            {fleet.online_devices} / {fleet.total_devices} Online
          </div>
          <div style={{ fontSize: '0.8125rem', color: fleet.offline_devices > 0 ? '#b91c1c' : '#047857', fontWeight: 600 }}>
            {fleet.offline_devices > 0 ? `${fleet.offline_devices} offline / comm warning` : '100% telemetry pipeline active'}
          </div>
        </div>

        {/* 24h Peak Load */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--color-text-muted)', fontSize: '0.8125rem', fontWeight: 600 }}>
            <span>24h Peak Demand</span>
            <Zap size={18} color="#f59e0b" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-text-main)', margin: '0.5rem 0 0.25rem 0' }}>
            {energy.peak_demand_kw} kW
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
            Predicted Peak Horizon: <strong style={{ color: '#0369a1' }}>{energy.forecast_peak_kw} kW</strong>
          </div>
        </div>

        {/* Renewable Output */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--color-text-muted)', fontSize: '0.8125rem', fontWeight: 600 }}>
            <span>24h Renewable Output</span>
            <Sun size={18} color="#10b981" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-energy-green)', margin: '0.5rem 0 0.25rem 0' }}>
            {energy.renewable_generation_kwh?.toLocaleString() || 0} kWh
          </div>
          <div style={{ fontSize: '0.8125rem', color: '#047857', fontWeight: 600 }}>
            Solar PV & Wind clean generation
          </div>
        </div>

        {/* BESS Storage SOC */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--color-text-muted)', fontSize: '0.8125rem', fontWeight: 600 }}>
            <span>BESS Battery SOC</span>
            <BatteryCharging size={18} color="#10b981" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-text-main)', margin: '0.5rem 0 0.25rem 0' }}>
            {ops.bess_avg_soc_pct}%
          </div>
          <div style={{ fontSize: '0.8125rem', color: '#047857', fontWeight: 600 }}>
            Average battery storage state of charge
          </div>
        </div>

        {/* Active Directives */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--color-text-muted)', fontSize: '0.8125rem', fontWeight: 600 }}>
            <span>Active Directives</span>
            <Sliders size={18} color="#8b5cf6" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-text-main)', margin: '0.5rem 0 0.25rem 0' }}>
            {ops.pending_optimization_approvals + ops.active_demand_response_events} Active
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
            {ops.pending_optimization_approvals} Optimization actions pending
          </div>
        </div>
      </div>

      {/* Main Grid: Active Alerts & Recommended Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '1.5rem' }}>
        
        {/* Active Alerts Panel */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={18} color="var(--color-danger-red)" /> Active Telemetry & Threshold Alerts ({alertsList.length})
            </h3>
            <Link to="/app/alerts" className="btn btn-secondary btn-sm">View All Alerts</Link>
          </div>

          {alertsList.length === 0 ? (
            <EmptyState title="No active alerts" message="No unresolved operational alerts match your current filter parameters." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {alertsList.map((alert) => (
                <div key={alert.id} style={{ padding: '0.875rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-bg-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.375rem' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--color-text-primary)' }}>
                      {alert.title}
                    </div>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '0.15rem 0.5rem',
                      borderRadius: '4px',
                      background: alert.severity === 'CRITICAL' ? '#fef2f2' : alert.severity === 'WARNING' ? '#fffbe6' : '#eff6ff',
                      color: alert.severity === 'CRITICAL' ? '#991b1b' : alert.severity === 'WARNING' ? '#92400e' : '#1e40af'
                    }}>
                      {alert.severity}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginBottom: '0.375rem' }}>
                    {alert.facility_name || alert.facility} • {new Date(alert.created_at || Date.now()).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-primary)' }}>
                    {alert.description}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recommended Actions Panel */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sliders size={18} color="var(--color-primary)" /> Recommended Operational Directives
            </h3>
            <Link to="/app/optimization" className="btn btn-secondary btn-sm">Optimization Engine</Link>
          </div>

          {recsList.length === 0 ? (
            <EmptyState title="No pending directives" message="No pending load shifting or optimization recommendations." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {recsList.map((rec) => (
                <div key={rec.id} style={{ padding: '0.875rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-bg-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.375rem' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--color-text-primary)' }}>
                      {rec.title}
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.15rem 0.5rem', borderRadius: '4px', background: '#ecfdf5', color: '#047857' }}>
                      Potential: ₹{rec.potential_cost_savings?.toLocaleString() || 0}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginBottom: '0.375rem' }}>
                    Category: <strong>{rec.category}</strong> • Facility: <strong>{rec.facility_name || rec.facility}</strong>
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-primary)' }}>
                    {rec.reasoning || rec.action_summary}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Facility Operational Matrix Table */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem' }}>
          Facility Portfolio Status Matrix
        </h3>

        {facilityList.length === 0 ? (
          <EmptyState title="No facilities found" message="No data available for the selected facility filter." />
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Facility Name</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Meters Count</th>
                  <th>Square Footage</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {facilityList.map((f) => (
                  <tr key={f.id}>
                    <td style={{ fontWeight: 600 }}>{f.name}</td>
                    <td style={{ textTransform: 'capitalize' }}>{f.facility_type}</td>
                    <td>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: '4px', background: '#ecfdf5', color: '#065f46' }}>
                        {f.status ? f.status.toUpperCase() : 'ACTIVE'}
                      </span>
                    </td>
                    <td>{f.meters_count} meters</td>
                    <td>{f.square_footage ? `${f.square_footage.toLocaleString()} sq ft` : 'N/A'}</td>
                    <td>
                      <Link to={`/app/facilities/${f.id}`} className="btn btn-sm btn-secondary">Inspect</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
