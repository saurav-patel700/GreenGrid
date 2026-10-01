import React, { useState, useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { Gauge, RefreshCw, Activity, AlertCircle, ArrowUpRight, Cpu } from 'lucide-react';

import MeterStatus from '../../components/energy/MeterStatus';
import DataQualityIndicator from '../../components/energy/DataQualityIndicator';
import LoadingState from '../../components/common/LoadingState';
import { fetchEnergyByMeter } from '../../services/api';

export default function Meters() {
  const { selectedFacility } = useOutletContext() || { selectedFacility: 'all' };
  const [meters, setMeters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadMeters = () => {
    setLoading(true);
    fetchEnergyByMeter(selectedFacility)
      .then((data) => {
        setMeters(Array.isArray(data) ? data : []);
      })
      .catch((err) => console.error('Error fetching meters:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadMeters();
  }, [selectedFacility]);

  const filteredMeters = meters.filter((m) => {
    const q = search.toLowerCase();
    return (
      (m.name || '').toLowerCase().includes(q) ||
      (m.meter_number || '').toLowerCase().includes(q) ||
      (m.facility_name || '').toLowerCase().includes(q)
    );
  });

  if (loading) {
    return <LoadingState message="Fetching live meter telemetry metrics..." />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Page Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.625rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            Meter Telemetry Management
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            Monitor real-time demand, today's kWh consumption, connection status, and data quality across facility meters.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <input
            type="text"
            placeholder="Search meter number, name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: '0.375rem 0.75rem',
              fontSize: '0.8125rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              width: '220px'
            }}
          />
          <button onClick={loadMeters} className="btn btn-secondary btn-sm">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Meter List Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Meter Name & ID</th>
              <th>Facility</th>
              <th>Type</th>
              <th>Status</th>
              <th>Current Demand</th>
              <th>Today Consumption</th>
              <th>Data Quality</th>
              <th>Last Reading</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredMeters.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '2rem' }}>
                  No meters found matching current selection.
                </td>
              </tr>
            ) : (
              filteredMeters.map((m) => (
                <tr key={m.id}>
                  <td>
                    <Link to={`/app/meters/${m.id}`} style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
                      {m.name}
                    </Link>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{m.meter_number}</div>
                  </td>
                  <td>{m.facility_name}</td>
                  <td style={{ textTransform: 'capitalize' }}>{m.meter_type_display || m.meter_type}</td>
                  <td>
                    <MeterStatus status={m.status} />
                  </td>
                  <td style={{ fontWeight: 600 }}>{m.current_demand ? `${m.current_demand} kW` : '0.0 kW'}</td>
                  <td>{m.today_consumption ? `${m.today_consumption.toLocaleString()} kWh` : '0.0 kWh'}</td>
                  <td>
                    <DataQualityIndicator quality={m.data_quality} />
                  </td>
                  <td style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                    {m.last_reading_at ? new Date(m.last_reading_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Never'}
                  </td>
                  <td>
                    <Link to={`/app/meters/${m.id}`} className="btn btn-sm btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}>
                      Inspect <ArrowUpRight size={12} />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
