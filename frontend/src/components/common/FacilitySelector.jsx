import React from 'react';
import { Building2 } from 'lucide-react';

export default function FacilitySelector({ facilities = [], selectedFacility, onChange }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#ffffff', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '0.375rem 0.75rem' }}>
      <Building2 size={16} color="var(--color-text-muted)" />
      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
        Facility:
      </span>
      <select
        value={selectedFacility}
        onChange={(e) => onChange(e.target.value)}
        style={{
          border: 'none',
          outline: 'none',
          background: 'transparent',
          fontSize: '0.875rem',
          fontWeight: 500,
          color: 'var(--color-text-primary)',
          cursor: 'pointer'
        }}
      >
        <option value="all">All Facilities (4 Active)</option>
        {facilities.map((fac) => (
          <option key={fac.id} value={fac.id}>
            {fac.name}
          </option>
        ))}
      </select>
    </div>
  );
}
