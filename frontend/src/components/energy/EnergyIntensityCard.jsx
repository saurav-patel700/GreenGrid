import React from 'react';

export default function EnergyIntensityCard({ intensity, unit = 'kWh / sq ft', formattedValue }) {
  const isAvailable = intensity !== null && intensity !== undefined;

  return (
    <div className="card" style={{ padding: '1.25rem' }}>
      <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', fontWeight: 500, marginBottom: '0.5rem' }}>
        Building Energy Intensity (EUI)
      </div>
      {isAvailable ? (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            {formattedValue || intensity}
          </span>
          <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            {unit}
          </span>
        </div>
      ) : (
        <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text-muted)', background: 'var(--color-bg-subtle)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
          Energy intensity unavailable
        </div>
      )}
      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
        Calculated as total energy consumption divided by total building floor area.
      </div>
    </div>
  );
}
