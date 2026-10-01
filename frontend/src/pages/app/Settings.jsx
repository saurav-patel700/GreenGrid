import React from 'react';
import { Settings, Users, Shield, Save } from 'lucide-react';
import Breadcrumbs from '../../components/common/Breadcrumbs';

export default function SettingsPage() {
  return (
    <div>
      <Breadcrumbs items={[{ label: 'Organization Settings' }]} />

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
          Organization & Alert Settings
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
          Manage corporate organization preferences, peak demand notification thresholds, and user roles.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        
        {/* Org Settings */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--color-text-primary)' }}>
            Organization Profile
          </h3>
          <form style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }} onSubmit={(e) => e.preventDefault()}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>Organization Name</label>
              <input type="text" defaultValue="Apex Global Enterprise" style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>Organization Code</label>
              <input type="text" defaultValue="APEX-ENERGY-ORG" readOnly style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', background: 'var(--color-bg-subtle)' }} />
            </div>

            <button className="btn btn-primary" style={{ alignSelf: 'flex-start', marginTop: '0.5rem' }}>
              <Save size={16} />
              Save Organization Settings
            </button>
          </form>
        </div>

        {/* Peak Demand Alert Thresholds */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--color-text-primary)' }}>
            Peak Demand Warning Thresholds
          </h3>
          <form style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }} onSubmit={(e) => e.preventDefault()}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>Contract Demand Limit (kW)</label>
              <input type="number" defaultValue={1500} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>Warning Trigger Percentage (%)</label>
              <input type="number" defaultValue={95} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }} />
            </div>

            <button className="btn btn-primary" style={{ alignSelf: 'flex-start', marginTop: '0.5rem' }}>
              <Save size={16} />
              Save Demand Thresholds
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
