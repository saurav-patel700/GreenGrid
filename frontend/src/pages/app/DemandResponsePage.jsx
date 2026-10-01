import React, { useState, useEffect } from 'react';
import { ShieldAlert, Plus, CheckCircle2, XCircle, Clock, AlertTriangle, RefreshCw } from 'lucide-react';
import Breadcrumbs from '../../components/common/Breadcrumbs';
import StatusBadge from '../../components/common/StatusBadge';
import {
  fetchDemandResponseEventsApi, createDemandResponseEventApi, approveDemandResponseEventApi, cancelDemandResponseEventApi, fetchFacilities
} from '../../services/api';

export default function DemandResponsePage() {
  const [events, setEvents] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [selectedFacility, setSelectedFacility] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [form, setForm] = useState({
    facility: '',
    event_name: '',
    start_time: '',
    end_time: '',
    target_reduction_kw: '',
    priority: 'medium',
    notes: ''
  });

  useEffect(() => {
    fetchFacilities().then(res => {
      setFacilities(res || []);
      if (res && res.length > 0) setForm(prev => ({ ...prev, facility: res[0].id }));
    });
  }, []);

  useEffect(() => {
    loadEvents();
  }, [selectedFacility]);

  async function loadEvents() {
    setLoading(true);
    try {
      const res = await fetchDemandResponseEventsApi(selectedFacility);
      setEvents(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    try {
      const created = await createDemandResponseEventApi(form);
      setEvents(prev => [created, ...prev]);
      setShowCreateModal(false);
      setForm({
        facility: facilities[0]?.id || '',
        event_name: '',
        start_time: '',
        end_time: '',
        target_reduction_kw: '',
        priority: 'medium',
        notes: ''
      });
    } catch (err) {
      alert(`Failed to create DR event: ${err.message}`);
    }
  }

  async function handleApprove(id) {
    try {
      const updated = await approveDemandResponseEventApi(id);
      setEvents(prev => prev.map(ev => ev.id === id ? updated : ev));
    } catch (err) {
      alert(`Approval failed: ${err.message}`);
    }
  }

  async function handleCancel(id) {
    try {
      const updated = await cancelDemandResponseEventApi(id);
      setEvents(prev => prev.map(ev => ev.id === id ? updated : ev));
    } catch (err) {
      alert(`Cancellation failed: ${err.message}`);
    }
  }

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Demand Response Management' }]} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldAlert size={24} style={{ color: '#f59e0b' }} />
            Demand Response (DR) Management & Peak Shaving
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
            Manage target kW load reductions, peak shaving events, and authorized approval workflows.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <select className="input-select" value={selectedFacility} onChange={e => setSelectedFacility(e.target.value)} style={{ width: '200px' }}>
            <option value="all">All Facilities</option>
            {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>

          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={16} /> Schedule DR Event
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          <RefreshCw size={24} className="spin" style={{ marginBottom: '0.5rem' }} />
          <p>Loading demand response events...</p>
        </div>
      ) : events.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          <ShieldAlert size={36} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
          <p style={{ fontWeight: 600 }}>No demand response events scheduled.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Event Name</th>
                <th>Facility</th>
                <th>Priority</th>
                <th>Start Time</th>
                <th>End Time</th>
                <th>Target Reduction (kW)</th>
                <th>Status</th>
                <th>Approved By</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.map(ev => (
                <tr key={ev.id}>
                  <td style={{ fontWeight: 600 }}>{ev.event_name}</td>
                  <td>{ev.facility_name}</td>
                  <td><span style={{ textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 600, color: ev.priority === 'high' ? '#ef4444' : '#f59e0b' }}>{ev.priority}</span></td>
                  <td style={{ fontSize: '0.75rem' }}>{new Date(ev.start_time).toLocaleString()}</td>
                  <td style={{ fontSize: '0.75rem' }}>{new Date(ev.end_time).toLocaleString()}</td>
                  <td style={{ fontWeight: 700, color: 'var(--color-brand-primary, #00C853)' }}>{ev.target_reduction_kw} kW</td>
                  <td><StatusBadge status={ev.status} /></td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{ev.approved_by_username || 'Pending'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {ev.status === 'DRAFT' && (
                        <button className="btn btn-primary btn-sm" onClick={() => handleApprove(ev.id)} title="Approve & Schedule">
                          <CheckCircle2 size={14} /> Approve
                        </button>
                      )}
                      {['DRAFT', 'SCHEDULED'].includes(ev.status) && (
                        <button className="btn btn-secondary btn-sm" onClick={() => handleCancel(ev.id)} title="Cancel Event">
                          <XCircle size={14} /> Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ width: '480px', padding: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Schedule Demand Response Event</h3>
            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Event Name</label>
                <input type="text" className="input" value={form.event_name} onChange={e => setForm({ ...form, event_name: e.target.value })} required />
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Facility</label>
                <select className="input-select" value={form.facility} onChange={e => setForm({ ...form, facility: e.target.value })} required>
                  {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Start Time</label>
                  <input type="datetime-local" className="input" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} required />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>End Time</label>
                  <input type="datetime-local" className="input" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} required />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Target Reduction (kW)</label>
                  <input type="number" step="0.01" className="input" value={form.target_reduction_kw} onChange={e => setForm({ ...form, target_reduction_kw: e.target.value })} required />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Priority</label>
                  <select className="input-select" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High / Critical Peak</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Event</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
