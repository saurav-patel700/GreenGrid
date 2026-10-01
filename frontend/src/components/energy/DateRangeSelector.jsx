import React, { useState } from 'react';

export default function DateRangeSelector({ selectedRange, onRangeChange, onCustomChange }) {
  const [showCustom, setShowCustom] = useState(selectedRange === 'custom');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');

  const ranges = [
    { key: '24h', label: '24 Hours' },
    { key: '7d', label: '7 Days' },
    { key: '30d', label: '30 Days' },
    { key: '90d', label: '90 Days' },
    { key: 'YTD', label: 'Year to Date' },
    { key: 'custom', label: 'Custom Range' },
  ];

  const handleSelect = (key) => {
    if (key === 'custom') {
      setShowCustom(true);
    } else {
      setShowCustom(false);
      onRangeChange(key);
    }
  };

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    if (start && end && onCustomChange) {
      onCustomChange(start, end);
    }
  };

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div style={{ display: 'inline-flex', background: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-md)', padding: '0.25rem', border: '1px solid var(--color-border)' }}>
        {ranges.map((r) => {
          const isActive = selectedRange === r.key;
          return (
            <button
              key={r.key}
              type="button"
              onClick={() => handleSelect(r.key)}
              style={{
                padding: '0.375rem 0.75rem',
                fontSize: '0.8125rem',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                background: isActive ? 'var(--color-bg-card)' : 'transparent',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              {r.label}
            </button>
          );
        })}
      </div>

      {showCustom && (
        <form onSubmit={handleCustomSubmit} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--color-bg-card)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
          <input
            type="datetime-local"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            required
            style={{ padding: '0.25rem 0.5rem', fontSize: '0.8125rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}
          />
          <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>to</span>
          <input
            type="datetime-local"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            required
            style={{ padding: '0.25rem 0.5rem', fontSize: '0.8125rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}
          />
          <button type="submit" className="btn btn-sm btn-primary">Apply</button>
        </form>
      )}
    </div>
  );
}
