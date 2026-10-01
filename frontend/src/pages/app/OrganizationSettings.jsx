import React, { useState, useEffect } from 'react';
import { Building2, Save, Globe, DollarSign, CheckCircle2, AlertCircle } from 'lucide-react';
import Breadcrumbs from '../../components/common/Breadcrumbs';
import LoadingState from '../../components/common/LoadingState';
import { fetchOrganizationApi, updateOrganizationApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function OrganizationSettings() {
  const { refreshOrg } = useAuth();
  const [org, setOrg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [currency, setCurrency] = useState('INR');
  const [energyUnit, setEnergyUnit] = useState('kWh');
  const [powerUnit, setPowerUnit] = useState('kW');

  useEffect(() => {
    fetchOrganizationApi()
      .then(data => {
        setOrg(data);
        setName(data.name || '');
        setDescription(data.description || '');
        setTimezone(data.timezone || 'Asia/Kolkata');
        setCurrency(data.currency || 'INR');
        setEnergyUnit(data.energy_unit || 'kWh');
        setPowerUnit(data.power_unit || 'kW');
      })
      .catch(e => setErr('Failed to load organization settings.'))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    setErr('');

    try {
      const updated = await updateOrganizationApi({
        name,
        description,
        timezone,
        currency,
        energy_unit: energyUnit,
        power_unit: powerUnit
      });
      setOrg(updated);
      setMsg('Organization settings updated successfully.');
      refreshOrg();
    } catch (error) {
      setErr(error.message || 'Failed to update organization configuration.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading organization configuration..." />;
  }

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Settings', path: '/app/settings' }, { label: 'Organization Settings' }]} />

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
          Organization Configuration & Localization Units
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
          Configure tenant metadata, global timezone for timestamp parsing, preferred currency, and energy measurement units.
        </p>
      </div>

      <div className="card" style={{ maxWidth: '640px', padding: '1.75rem' }}>
        {msg && (
          <div style={{ background: 'var(--color-energy-green-bg)', border: '1px solid rgba(5,150,105,0.2)', padding: '0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.8125rem', color: 'var(--color-energy-green)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle2 size={16} /> {msg}
          </div>
        )}

        {err && (
          <div style={{ background: 'var(--color-danger-red-bg)', border: '1px solid #fecaca', padding: '0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.8125rem', color: 'var(--color-danger-red)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={16} /> {err}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>Organization Name *</label>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} style={{ width: '100%', padding: '0.625rem 0.875rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>Organization Code (Immutable)</label>
            <input type="text" readOnly value={org?.code || ''} style={{ width: '100%', padding: '0.625rem 0.875rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', background: 'var(--color-bg-subtle)', fontFamily: 'monospace' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>Description / Scope</label>
            <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Corporate entity description..." style={{ width: '100%', padding: '0.625rem 0.875rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', fontFamily: 'inherit' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>Primary Timezone</label>
              <select value={timezone} onChange={(e) => setTimezone(e.target.value)} style={{ width: '100%', padding: '0.625rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', background: '#ffffff' }}>
                <option value="America/Chicago">America/Chicago (Central)</option>
                <option value="America/New_York">America/New_York (Eastern)</option>
                <option value="America/Los_Angeles">America/Los_Angeles (Pacific)</option>
                <option value="Europe/London">Europe/London (GMT/BST)</option>
                <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                <option value="UTC">UTC (Universal Coordinated Time)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>Utility Currency</label>
              <select value={currency} onChange={(e) => setCurrency(e.target.value)} style={{ width: '100%', padding: '0.625rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', background: '#ffffff' }}>
                <option value="INR">INR (₹ Indian Rupee)</option>
                <option value="USD">USD (US Dollar)</option>
                <option value="EUR">EUR (€ Euro)</option>
                <option value="GBP">GBP (£ British Pound)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>Energy Unit</label>
              <select value={energyUnit} onChange={(e) => setEnergyUnit(e.target.value)} style={{ width: '100%', padding: '0.625rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', background: '#ffffff' }}>
                <option value="kWh">kWh (Kilowatt-hours)</option>
                <option value="MWh">MWh (Megawatt-hours)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>Power Demand Unit</label>
              <select value={powerUnit} onChange={(e) => setPowerUnit(e.target.value)} style={{ width: '100%', padding: '0.625rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', background: '#ffffff' }}>
                <option value="kW">kW (Kilowatts)</option>
                <option value="MW">MW (Megawatts)</option>
              </select>
            </div>
          </div>

          <button type="submit" disabled={saving} className="btn btn-primary" style={{ padding: '0.75rem', width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}>
            <Save size={16} />
            {saving ? 'Saving Configuration...' : 'Save Organization Settings'}
          </button>
        </form>
      </div>
    </div>
  );
}
