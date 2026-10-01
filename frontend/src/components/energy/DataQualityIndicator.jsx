import React from 'react';

export default function DataQualityIndicator({ quality = 'good', showLabel = true }) {
  const configs = {
    good: { label: 'GOOD', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
    delayed: { label: 'DELAYED', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
    missing: { label: 'MISSING', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
    suspect: { label: 'SUSPECT', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' }
  };

  const key = (quality || '').toLowerCase();
  const cfg = configs[key] || configs.good;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
        padding: '0.125rem 0.4rem',
        borderRadius: 'var(--radius-sm)',
        backgroundColor: cfg.bg,
        border: `1px solid ${cfg.border}`,
        color: cfg.color,
        fontSize: '0.6875rem',
        fontWeight: 600,
        textTransform: 'uppercase'
      }}
      title={`Data Quality Status: ${cfg.label}`}
    >
      <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: cfg.color }} />
      {showLabel && cfg.label}
    </span>
  );
}
