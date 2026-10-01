import React from 'react';
import { Sun, BatteryCharging, Zap, ArrowUpRight } from 'lucide-react';
import StatusBadge from '../../components/common/StatusBadge';
import Breadcrumbs from '../../components/common/Breadcrumbs';

export default function Renewables() {
  const assets = [
    { name: 'Rooftop Solar Array Alpha', type: 'Rooftop Solar PV', capacity: '450 kW', output: '320.5 kW', facility: 'Innovation Tech Center', status: 'Optimal' },
    { name: 'Tech Center Battery Storage (BESS-1)', type: 'BESS Battery Storage', capacity: '250 kW / 500 kWh', output: '40 kW (Discharging)', soc: '82.5%', facility: 'Innovation Tech Center', status: 'Active' },
    { name: 'Manufacturing Canopy Solar', type: 'Ground/Canopy Solar PV', capacity: '600 kW', output: '410.0 kW', facility: 'Eastside Manufacturing Hub', status: 'Optimal' }
  ];

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Renewables & Storage' }]} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            Solar PV & Battery Energy Storage (BESS)
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            Real-time generation output, battery state-of-charge (SOC %), and peak-shaving dispatch status.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ background: 'var(--color-energy-green-bg)', borderColor: 'rgba(5, 150, 105, 0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-energy-green)', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.5rem' }}>
            <Sun size={18} /> Instantaneous Solar Output
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-energy-green)' }}>
            730.5 kW
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
            Across 2 active solar installations (33.1% facility offset)
          </div>
        </div>

        <div className="card" style={{ background: 'var(--color-warning-amber-bg)', borderColor: 'rgba(217, 119, 6, 0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-warning-amber)', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.5rem' }}>
            <BatteryCharging size={18} /> Battery State of Charge (SOC)
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-warning-amber)' }}>
            82.5%
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
            BESS-1 Discharging 40 kW for peak shaving dispatch
          </div>
        </div>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Asset Name</th>
              <th>Asset Type</th>
              <th>Facility</th>
              <th>Rated Capacity</th>
              <th>Live Output / Status</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((a, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 600 }}>{a.name}</td>
                <td style={{ color: 'var(--color-text-muted)' }}>{a.type}</td>
                <td>{a.facility}</td>
                <td>{a.capacity}</td>
                <td style={{ fontWeight: 600, color: 'var(--color-energy-green)' }}>
                  {a.output} {a.soc ? `(SOC: ${a.soc})` : ''}
                </td>
                <td><StatusBadge status={a.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
