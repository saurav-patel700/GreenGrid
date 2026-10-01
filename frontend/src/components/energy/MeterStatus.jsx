import React from 'react';

export default function MeterStatus({ status = 'online' }) {
  const statusConfig = {
    online: { label: 'ONLINE', dotColor: '#059669', textColor: '#065f46', bgColor: '#ecfdf5', borderColor: '#a7f3d0' },
    warning: { label: 'WARNING', dotColor: '#d97706', textColor: '#92400e', bgColor: '#fffbeb', borderColor: '#fde68a' },
    offline: { label: 'OFFLINE', dotColor: '#dc2626', textColor: '#991b1b', bgColor: '#fef2f2', borderColor: '#fecaca' },
    nodata: { label: 'NO DATA', dotColor: '#64748b', textColor: '#334155', bgColor: '#f1f5f9', borderColor: '#cbd5e1' }
  };

  const key = (status || '').toLowerCase().replace(' ', '');
  const config = statusConfig[key] || statusConfig.nodata;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.375rem',
        padding: '0.1875rem 0.5rem',
        borderRadius: 'var(--radius-sm)',
        backgroundColor: config.bgColor,
        border: `1px solid ${config.borderColor}`,
        color: config.textColor,
        fontSize: '0.75rem',
        fontWeight: 600,
        letterSpacing: '0.025em'
      }}
      aria-label={`Meter status: ${config.label}`}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: config.dotColor,
          display: 'inline-block'
        }}
      />
      {config.label}
    </span>
  );
}
