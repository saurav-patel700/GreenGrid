import React from 'react';
import { Database } from 'lucide-react';

export default function EmptyState({ title = "No Data Recorded", description = "No active meter telemetry found for the selected parameters.", actionText, onAction }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '3.5rem 1.5rem', background: '#ffffff', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
      <div style={{ padding: '0.875rem', borderRadius: '50%', background: 'var(--color-bg-subtle)', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
        <Database size={28} />
      </div>
      <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.375rem' }}>
        {title}
      </h3>
      <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', maxWidth: '400px', marginBottom: actionText ? '1.25rem' : 0 }}>
        {description}
      </p>
      {actionText && (
        <button onClick={onAction} className="btn btn-secondary">
          {actionText}
        </button>
      )}
    </div>
  );
}
