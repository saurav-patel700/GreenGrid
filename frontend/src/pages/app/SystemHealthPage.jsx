import React, { useState, useEffect } from 'react';
import { Cpu, Server, Database, Activity, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import StatusBadge from '../../components/common/StatusBadge';
import { fetchSystemHealthApi } from '../../services/api';

export default function SystemHealthPage() {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSystemHealthApi();
      setHealthData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchHealth();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '2rem', color: '#94a3b8' }}>
        <Cpu size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: '0.5rem' }} />
        <div>Executing System Health Diagnostics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius-md)', color: '#991b1b' }}>
        <strong>System Health Diagnostic Error:</strong> {error}
      </div>
    );
  }

  const isHealthy = healthData?.overall_status === 'healthy';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-bg-card)', padding: '1.25rem 1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <Cpu size={26} color="#6366f1" /> Enterprise System Health & Observability
          </h1>
          <p style={{ margin: '0.25rem 0 0 0', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
            Real-time infrastructure health, database connection latency, IoT ingestion throughput, and device fleet score.
          </p>
        </div>

        <button
          onClick={fetchHealth}
          style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem' }}
        >
          <RefreshCw size={16} /> Re-run Diagnostics
        </button>
      </div>

      {/* Overall Health Status Banner */}
      <div style={{
        background: isHealthy ? '#ecfdf5' : '#fffbe0',
        border: `1px solid ${isHealthy ? '#a7f3d0' : '#ffe58f'}`,
        borderRadius: 'var(--radius-lg)',
        padding: '1.25rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {isHealthy ? <CheckCircle size={28} color="#059669" /> : <AlertTriangle size={28} color="#d48806" />}
          <div>
            <div style={{ fontSize: '1.125rem', fontWeight: 700, color: isHealthy ? '#065f46' : '#873800' }}>
              System Status: {isHealthy ? 'ALL SYSTEMS OPERATIONAL' : 'SYSTEM DEGRADED / ATTENTION REQUIRED'}
            </div>
            <div style={{ fontSize: '0.8125rem', color: isHealthy ? '#047857' : '#d48806' }}>
              {isHealthy ? 'Database, WebSockets, ASGI application server, and telemetry ingestion pipeline running normally.' : 'One or more subsystem components reported degraded health scores.'}
            </div>
          </div>
        </div>
        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#64748b' }}>
          Checked at: {new Date(healthData?.backend?.timestamp).toLocaleTimeString()}
        </span>
      </div>

      {/* Subsystem Health Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
        {/* Backend & Application Server */}
        <div style={{ background: 'var(--color-bg-card)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontWeight: 700, fontSize: '0.9375rem' }}>Application Stack</span>
            <Server size={18} color="var(--color-primary)" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', fontSize: '0.8125rem' }}>
            <div><strong>Framework:</strong> {healthData?.backend?.framework}</div>
            <div><strong>Python Runtime:</strong> v{healthData?.backend?.python_version}</div>
            <div><strong>Status:</strong> <StatusBadge status="online" text="Online / Normal" /></div>
          </div>
        </div>

        {/* Database Health */}
        <div style={{ background: 'var(--color-bg-card)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontWeight: 700, fontSize: '0.9375rem' }}>Database Engine</span>
            <Database size={18} color="#0284c7" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', fontSize: '0.8125rem' }}>
            <div><strong>Engine Vendor:</strong> {healthData?.database?.engine?.toUpperCase()}</div>
            <div><strong>Query Latency:</strong> {healthData?.database?.latency_ms} ms</div>
            <div><strong>Status:</strong> <StatusBadge status={healthData?.database?.status === 'healthy' ? 'online' : 'offline'} text={healthData?.database?.status?.toUpperCase()} /></div>
          </div>
        </div>

        {/* Telemetry Ingestion Pipeline */}
        <div style={{ background: 'var(--color-bg-card)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontWeight: 700, fontSize: '0.9375rem' }}>IoT Telemetry Ingestion</span>
            <Activity size={18} color="#059669" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', fontSize: '0.8125rem' }}>
            <div><strong>Readings (Last Hour):</strong> {healthData?.telemetry_ingestion?.readings_last_hour}</div>
            <div><strong>Throughput:</strong> {healthData?.telemetry_ingestion?.throughput_per_min} readings/min</div>
            <div><strong>Status:</strong> <StatusBadge status={healthData?.telemetry_ingestion?.status === 'healthy' ? 'online' : 'warning'} text={healthData?.telemetry_ingestion?.status?.toUpperCase()} /></div>
          </div>
        </div>

        {/* Device Fleet Score */}
        <div style={{ background: 'var(--color-bg-card)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontWeight: 700, fontSize: '0.9375rem' }}>Device Fleet Score</span>
            <Cpu size={18} color="#8b5cf6" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', fontSize: '0.8125rem' }}>
            <div><strong>Health Score:</strong> <strong style={{ color: '#059669' }}>{healthData?.device_fleet?.health_score_pct}%</strong></div>
            <div><strong>Online / Total:</strong> {healthData?.device_fleet?.online} / {healthData?.device_fleet?.total_devices}</div>
            <div><strong>Offline Count:</strong> {healthData?.device_fleet?.offline}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
