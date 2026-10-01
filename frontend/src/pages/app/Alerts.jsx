import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle2, Filter } from 'lucide-react';
import StatusBadge from '../../components/common/StatusBadge';
import Breadcrumbs from '../../components/common/Breadcrumbs';
import { fetchAlerts } from '../../services/api';

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    fetchAlerts().then(data => {
      if (Array.isArray(data)) setAlerts(data);
    });
  }, []);

  const handleResolve = (id) => {
    setAlerts(alerts.map(a => a.id === id ? { ...a, is_resolved: true } : a));
  };

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Alerts & Anomalies' }]} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            System Alerts & Threshold Anomaly Log
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            Active warnings, demand threshold alerts, and submeter telemetry disconnects requiring operational attention.
          </p>
        </div>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Severity</th>
              <th>Alert Event Title</th>
              <th>Facility Affected</th>
              <th>Timestamp</th>
              <th>Description Detail</th>
              <th>Status / Action</th>
            </tr>
          </thead>
          <tbody>
            {alerts.map((alt) => (
              <tr key={alt.id} style={{ opacity: alt.is_resolved ? 0.6 : 1 }}>
                <td><StatusBadge status={alt.severity} /></td>
                <td style={{ fontWeight: 600 }}>{alt.title}</td>
                <td>{alt.facility_name}</td>
                <td style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  {new Date(alt.timestamp).toLocaleString()}
                </td>
                <td style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>{alt.description}</td>
                <td>
                  {alt.is_resolved ? (
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-energy-green)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      <CheckCircle2 size={14} /> Resolved
                    </span>
                  ) : (
                    <button onClick={() => handleResolve(alt.id)} className="btn btn-secondary btn-sm">
                      Mark Resolved
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
