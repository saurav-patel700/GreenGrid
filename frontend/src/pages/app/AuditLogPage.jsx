import React, { useState, useEffect } from 'react';
import { ShieldCheck, RefreshCw } from 'lucide-react';
import Breadcrumbs from '../../components/common/Breadcrumbs';
import LoadingState from '../../components/common/LoadingState';
import { fetchAuditLogsApi } from '../../services/api';

export default function AuditLogPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadLogs = () => {
    setLoading(true);
    fetchAuditLogsApi()
      .then(data => {
        if (Array.isArray(data)) setLogs(data);
      })
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadLogs();
  }, []);

  if (loading) {
    return <LoadingState message="Loading security audit log entries..." />;
  }

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Settings', path: '/app/settings' }, { label: 'Security Audit Log' }]} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            Organization Security Audit Log
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            Immutable record of security-sensitive administrative events, user invitations, role changes, and settings updates.
          </p>
        </div>

        <button onClick={loadLogs} className="btn btn-secondary btn-sm">
          <RefreshCw size={14} />
          Refresh Log Feed
        </button>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Timestamp (UTC)</th>
              <th>Action Event</th>
              <th>Triggered By User</th>
              <th>Target Resource Type</th>
              <th>Resource ID</th>
              <th>IP Address</th>
            </tr>
          </thead>
          <tbody>
            {logs.length > 0 ? (
              logs.map((log) => (
                <tr key={log.id}>
                  <td style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    <span className="badge badge-gray">{log.action}</span>
                  </td>
                  <td style={{ fontWeight: 500 }}>{log.user_name}</td>
                  <td style={{ color: 'var(--color-text-muted)' }}>{log.resource_type}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>{log.resource_id || '-'}</td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{log.ip_address || 'Internal'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '2rem' }}>
                  No audit log entries recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
