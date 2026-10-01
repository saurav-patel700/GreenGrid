import React from 'react';
import { Calendar } from 'lucide-react';

export default function DateRangePicker({ selectedRange, onChange }) {
  const ranges = [
    { id: '24h', label: '24 Hours' },
    { id: '7d', label: '7 Days' },
    { id: '30d', label: '30 Days' },
    { id: 'ytd', label: 'Year to Date' },
  ];

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', background: 'var(--color-bg-subtle)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '0.25rem' }}>
      <Calendar size={15} color="var(--color-text-muted)" style={{ marginLeft: '0.375rem' }} />
      {ranges.map((r) => (
        <button
          key={r.id}
          onClick={() => onChange(r.id)}
          style={{
            border: 'none',
            background: selectedRange === r.id ? '#ffffff' : 'transparent',
            color: selectedRange === r.id ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
            fontWeight: selectedRange === r.id ? 600 : 500,
            fontSize: '0.75rem',
            padding: '0.25rem 0.625rem',
            borderRadius: 'var(--radius-sm)',
            boxShadow: selectedRange === r.id ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
            transition: 'all 0.15s ease'
          }}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
