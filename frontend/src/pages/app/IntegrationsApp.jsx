import React, { useState, useEffect } from 'react';
import { Key, Plus, Trash2, Cpu, ShieldCheck, Copy, Check } from 'lucide-react';
import LoadingState from '../../components/common/LoadingState';
import { fetchIngestionCredentials, createIngestionCredential, revokeIngestionCredential } from '../../services/api';

export default function IntegrationsApp() {
  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState('');
  const [generatedCred, setGeneratedCred] = useState(null);
  const [copied, setCopied] = useState(false);
  const [creating, setCreating] = useState(false);

  const loadCredentials = () => {
    setLoading(true);
    fetchIngestionCredentials()
      .then((data) => setCredentials(Array.isArray(data) ? data : []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadCredentials();
  }, []);

  const handleCreate = (e) => {
    e.preventDefault();
    if (!newKeyName) return;
    setCreating(true);
    createIngestionCredential(newKeyName)
      .then((res) => {
        setGeneratedCred(res);
        setNewKeyName('');
        loadCredentials();
      })
      .catch((err) => alert(err.message))
      .finally(() => setCreating(false));
  };

  const handleRevoke = (id) => {
    if (window.confirm('Are you sure you want to revoke this API credential? Connected IoT devices will be blocked.')) {
      revokeIngestionCredential(id)
        .then(() => loadCredentials())
        .catch((err) => alert(err.message));
    }
  };

  const copyHeader = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading && credentials.length === 0) {
    return <LoadingState message="Loading IoT Device Integration Credentials..." />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.625rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
          IoT Ingestion & API Credentials
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
          Provision Machine-to-Machine (M2M) API keys for edge gateways, Modbus/BACnet adapters, and industrial telemetry ingestion.
        </p>
      </div>

      {/* Generated Secret Modal / Notice */}
      {generatedCred && (
        <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#065f46', fontWeight: 700, fontSize: '1rem', marginBottom: '0.5rem' }}>
            <ShieldCheck size={18} /> M2M API Key Generated Successfully!
          </div>
          <p style={{ fontSize: '0.8125rem', color: '#065f46', marginBottom: '0.75rem' }}>
            Copy your connection header secret now. For security, the secret key cannot be recovered or shown again.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#ffffff', padding: '0.625rem 0.875rem', borderRadius: 'var(--radius-sm)', border: '1px solid #a7f3d0' }}>
            <code style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a', flex: 1, fontFamily: 'monospace' }}>
              {generatedCred.connection_header}
            </code>
            <button onClick={() => copyHeader(generatedCred.connection_header)} className="btn btn-sm btn-secondary">
              {copied ? <Check size={14} color="#059669" /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <button onClick={() => setGeneratedCred(null)} className="btn btn-sm btn-dark" style={{ marginTop: '0.75rem' }}>
            I Have Saved This Secret
          </button>
        </div>
      )}

      {/* Provision New Key */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Provision New Device Credential</h3>
        </div>
        <form onSubmit={handleCreate} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="e.g. Austin Tech Gateway #1 (Modbus TCP)"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            required
            style={{ flex: 1, padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: '0.875rem' }}
          />
          <button type="submit" className="btn btn-primary" disabled={creating}>
            <Plus size={16} /> {creating ? 'Generating...' : 'Generate M2M API Key'}
          </button>
        </form>
      </div>

      {/* Active Credentials Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Active Organization IoT Credentials</h3>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Credential Name</th>
                <th>Key ID</th>
                <th>Status</th>
                <th>Created At</th>
                <th>Last Telemetry Transmission</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {credentials.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                    No machine-to-machine integration credentials provisioned yet.
                  </td>
                </tr>
              ) : (
                credentials.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td><code style={{ fontSize: '0.8125rem', background: 'var(--color-bg-subtle)', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>{c.key_id}</code></td>
                    <td>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.125rem 0.5rem', borderRadius: '4px', background: c.status === 'active' ? '#ecfdf5' : '#fef2f2', color: c.status === 'active' ? '#065f46' : '#991b1b' }}>
                        {c.status.toUpperCase()}
                      </span>
                    </td>
                    <td>{new Date(c.created_at).toLocaleDateString()}</td>
                    <td>{c.last_used_at ? new Date(c.last_used_at).toLocaleString() : 'Never'}</td>
                    <td>
                      {c.status === 'active' && (
                        <button onClick={() => handleRevoke(c.id)} className="btn btn-sm btn-secondary" style={{ color: 'var(--color-danger-red)' }}>
                          <Trash2 size={14} /> Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Protocol Extension Architecture Docs */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Industrial Protocol Extension Architecture</h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          <div style={{ background: 'var(--color-bg-subtle)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '0.25rem' }}>MODBUS RTU / TCP</h4>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
              Registers (30001 kWh, 30005 kW, 30009 Volts) transformed via <code>ModbusRTUAdapter</code> into standard ingestion format.
            </p>
          </div>

          <div style={{ background: 'var(--color-bg-subtle)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '0.25rem' }}>BACnet IP</h4>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
              Analog Input objects (AI_1 kWh, AI_2 kW) parsed through <code>BACnetIPAdapter</code> for building automation.
            </p>
          </div>

          <div style={{ background: 'var(--color-bg-subtle)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '0.25rem' }}>MQTT Edge Gateway</h4>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
              JSON topic payloads dispatched directly to <code>POST /api/ingestion/readings/</code> with <code>X-API-Key</code>.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
