import React from 'react';

export default function AnomalyFeed({ alerts = [] }) {
  if (!alerts || alerts.length === 0) {
    return (
      <div className="card" style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
        No active energy anomalies or threshold warnings detected.
      </div>
    );
  }

  const getSeverityBadge = (severity) => {
    const isCritical = severity === 'critical';
    return (
      <span style={{
        fontSize: '0.6875rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        padding: '0.125rem 0.375rem',
        borderRadius: '4px',
        backgroundColor: isCritical ? '#fef2f2' : '#fffbeb',
        color: isCritical ? '#dc2626' : '#d97706',
        border: `1px solid ${isCritical ? '#fecaca' : '#fde68a'}`
      }}>
        {severity}
      </span>
    );
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Live Anomaly & Alert Feed</h3>
        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{alerts.length} Active</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {alerts.map((alt) => (
          <div key={alt.id} style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'var(--color-bg-subtle)', border: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {getSeverityBadge(alt.severity)}
                <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{alt.title}</span>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                {alt.timestamp ? new Date(alt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
              </span>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: 0 }}>
              {alt.description}
            </p>
            {alt.facility_name && (
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.375rem' }}>
                Facility: {alt.facility_name} {alt.meter_name ? `• Meter: ${alt.meter_name}` : ''}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
