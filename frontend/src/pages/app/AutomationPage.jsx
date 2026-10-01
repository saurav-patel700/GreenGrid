import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { ShieldCheck, AlertTriangle, Play, XCircle, Plus, CheckCircle } from 'lucide-react';
import StatusBadge from '../../components/common/StatusBadge';
import {
  fetchAutomationConfigApi,
  fetchSafetyPoliciesApi,
  fetchControlCommandsApi,
  fetchDevicesApi,
  emergencyStopApi,
  createControlCommandApi,
  approveControlCommandApi,
  cancelControlCommandApi
} from '../../services/api';

export default function AutomationPage() {
  const { selectedFacility } = useOutletContext() || {};
  const [autoConfig, setAutoConfig] = useState(null);
  const [policies, setPolicies] = useState([]);
  const [commands, setCommands] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showCmdModal, setShowCmdModal] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState('');
  const [cmdType, setCmdType] = useState('set_bess_soc_limit');
  const [reqValue, setReqValue] = useState('80.0');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [cfgData, pData, cData, devList] = await Promise.all([
        fetchAutomationConfigApi(),
        fetchSafetyPoliciesApi(),
        fetchControlCommandsApi(),
        fetchDevicesApi(selectedFacility || 'all')
      ]);

      setAutoConfig(cfgData);
      setPolicies(Array.isArray(pData) ? pData : (pData.results || []));
      setCommands(Array.isArray(cData) ? cData : (cData.results || []));
      setDevices(devList);
      if (devList.length > 0 && !selectedDevice) {
        setSelectedDevice(devList[0].id);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedFacility]);

  const handleEmergencyStop = async () => {
    if (!window.confirm('EMERGENCY STOP WARNING: Are you sure you want to trigger global organization emergency stop? All pending commands will be cancelled and automated directives disabled.')) {
      return;
    }
    try {
      await emergencyStopApi('User Manual Emergency Stop Button');
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRequestCommand = async (e) => {
    e.preventDefault();
    try {
      await createControlCommandApi({
        device: selectedDevice,
        command_type: cmdType,
        requested_value: reqValue
      });
      setShowCmdModal(false);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleApproveCommand = async (cmdId) => {
    try {
      await approveControlCommandApi(cmdId);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCancelCommand = async (cmdId) => {
    try {
      await cancelControlCommandApi(cmdId);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };


  if (loading) {
    return (
      <div style={{ padding: '2rem', color: '#94a3b8' }}>
        <ShieldCheck size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: '0.5rem' }} />
        <div>Loading Automation & Safe Device Directives...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius-md)', color: '#991b1b' }}>
        <strong>Automation Error:</strong> {error}
      </div>
    );
  }

  const isEnabled = autoConfig?.automation_enabled;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-bg-card)', padding: '1.25rem 1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <ShieldCheck size={26} color="var(--color-primary)" /> Safe Automation & Device Control Directives
          </h1>
          <p style={{ margin: '0.25rem 0 0 0', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
            Read-only by default control commands, safety policy limits, approval queue, and global emergency stop.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => setShowCmdModal(true)}
            disabled={!isEnabled}
            style={{ background: 'var(--color-primary)', color: '#ffffff', border: 'none', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', fontWeight: 600, cursor: isEnabled ? 'pointer' : 'not-allowed', opacity: isEnabled ? 1 : 0.6, display: 'flex', alignItems: 'center', gap: '0.375rem' }}
          >
            <Plus size={16} /> Request Control Command
          </button>
          <button
            onClick={handleEmergencyStop}
            style={{ background: '#b91c1c', color: '#ffffff', border: 'none', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem' }}
          >
            <AlertTriangle size={16} /> EMERGENCY STOP
          </button>
        </div>
      </div>

      {/* Safety Policy Boundaries Table */}
      <div style={{ background: 'var(--color-bg-card)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-text-main)', marginBottom: '1rem' }}>
          Active Safety Boundary Limits
        </h2>

        {policies.length === 0 ? (
          <div style={{ padding: '1rem', color: '#64748b', fontSize: '0.875rem' }}>Default organization safety boundaries active (BESS SOC 10% - 95%, Max 250 kW Power).</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', textAlign: 'left', color: 'var(--color-text-muted)' }}>
                <th style={{ padding: '0.75rem' }}>Scope</th>
                <th style={{ padding: '0.75rem' }}>BESS SOC Limits</th>
                <th style={{ padding: '0.75rem' }}>Max Power Limits</th>
                <th style={{ padding: '0.75rem' }}>Max HVAC Delta</th>
                <th style={{ padding: '0.75rem' }}>Max Duration</th>
              </tr>
            </thead>
            <tbody>
              {policies.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '0.75rem', fontWeight: 600 }}>{p.device_name || p.facility_name || 'Organization Global'}</td>
                  <td style={{ padding: '0.75rem' }}>{p.min_battery_soc_percent}% - {p.max_battery_soc_percent}%</td>
                  <td style={{ padding: '0.75rem' }}>Charge: {p.max_charge_power_kw} kW / Dis: {p.max_discharge_power_kw} kW</td>
                  <td style={{ padding: '0.75rem' }}>±{p.max_hvac_setpoint_change_deg}°C</td>
                  <td style={{ padding: '0.75rem' }}>{p.max_command_duration_minutes} mins</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Control Commands Lifecycle Queue */}
      <div style={{ background: 'var(--color-bg-card)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-text-main)', marginBottom: '1rem' }}>
          Control Commands Directive Queue
        </h2>

        {commands.length === 0 ? (
          <div style={{ padding: '1rem', color: '#64748b', fontSize: '0.875rem' }}>No control commands in queue.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', textAlign: 'left', color: 'var(--color-text-muted)' }}>
                <th style={{ padding: '0.75rem' }}>Command Directive</th>
                <th style={{ padding: '0.75rem' }}>Target Device</th>
                <th style={{ padding: '0.75rem' }}>Requested Value</th>
                <th style={{ padding: '0.75rem' }}>Requested By</th>
                <th style={{ padding: '0.75rem' }}>Validation Status</th>
                <th style={{ padding: '0.75rem' }}>Execution Status</th>
                <th style={{ padding: '0.75rem' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {commands.map((cmd) => (
                <tr key={cmd.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '0.75rem', fontWeight: 600, textTransform: 'capitalize' }}>{cmd.command_type.replace(/_/g, ' ')}</td>
                  <td style={{ padding: '0.75rem' }}>{cmd.device_name} ({cmd.device_serial})</td>
                  <td style={{ padding: '0.75rem', fontWeight: 700 }}>{cmd.requested_value}</td>
                  <td style={{ padding: '0.75rem' }}>{cmd.requested_by_username}</td>
                  <td style={{ padding: '0.75rem' }}>
                    <StatusBadge status={cmd.validation_status === 'PASSED' ? 'online' : 'offline'} text={cmd.validation_status} />
                  </td>
                  <td style={{ padding: '0.75rem', fontWeight: 600 }}>{cmd.execution_status}</td>
                  <td style={{ padding: '0.75rem' }}>
                    {cmd.execution_status === 'PENDING_APPROVAL' && (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => handleApproveCommand(cmd.id)} style={{ background: '#059669', color: '#ffffff', border: 'none', padding: '0.25rem 0.5rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>Approve</button>
                        <button onClick={() => handleCancelCommand(cmd.id)} style={{ background: '#cbd5e1', color: '#0f172a', border: 'none', padding: '0.25rem 0.5rem', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Command Modal */}
      {showCmdModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#ffffff', padding: '1.5rem', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '440px' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem', fontWeight: 700 }}>Request Device Control Directive</h3>
            <form onSubmit={handleRequestCommand} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>Target Device</label>
                <select value={selectedDevice} onChange={(e) => setSelectedDevice(e.target.value)} required style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid #cbd5e1' }}>
                  {devices.map((d) => (
                    <option key={d.id} value={d.id}>{d.name} ({d.serial_number})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>Command Type</label>

                <select value={cmdType} onChange={(e) => setCmdType(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid #cbd5e1' }}>
                  <option value="set_bess_soc_limit">Set BESS SOC Threshold</option>
                  <option value="bess_charge">BESS Charge Directive (kW)</option>
                  <option value="bess_discharge">BESS Discharge Directive (kW)</option>
                  <option value="hvac_setpoint">HVAC Setpoint Adjust (°C)</option>
                  <option value="emergency_stop">Emergency Safety Shutdown</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>Requested Value</label>
                <input type="text" value={reqValue} onChange={(e) => setReqValue(e.target.value)} required style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid #cbd5e1' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowCmdModal(false)} style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid #cbd5e1', background: '#ffffff' }}>Cancel</button>
                <button type="submit" style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', border: 'none', background: 'var(--color-primary)', color: '#ffffff', fontWeight: 600 }}>Submit Command</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
