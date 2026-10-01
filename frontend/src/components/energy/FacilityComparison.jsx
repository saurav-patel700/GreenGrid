import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

export default function FacilityComparison({ facilities = [] }) {
  if (!facilities || facilities.length === 0) {
    return (
      <div className="card" style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
        No facility data available for comparison.
      </div>
    );
  }

  const chartData = facilities.map((f) => ({
    name: f.facility_name || f.name,
    consumption: f.total_consumption_kwh || f.kwh || 0,
    peak_demand: f.peak_demand_kw || 0,
    cost: f.total_cost || f.cost || 0
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Facility Energy Consumption & Demand Comparison</h3>
        </div>
        <div style={{ height: 260, width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} unit=" kWh" />
              <Tooltip formatter={(val, name) => [`${val.toLocaleString()} kWh`, name]} />
              <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '0.8125rem' }} />
              <Bar dataKey="consumption" name="Total Consumption (kWh)" fill="#0284c7" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Facility Name</th>
              <th>Facility Type</th>
              <th>Area (sq ft)</th>
              <th>Total Consumption</th>
              <th>Peak Demand</th>
              <th>Energy Intensity</th>
              <th>Energy Cost</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {facilities.map((fac) => (
              <tr key={fac.facility_id || fac.id}>
                <td style={{ fontWeight: 600 }}>{fac.facility_name || fac.name}</td>
                <td>{fac.facility_type || fac.type}</td>
                <td>{fac.square_footage ? fac.square_footage.toLocaleString() : 'N/A'}</td>
                <td>{(fac.total_consumption_kwh || fac.kwh || 0).toLocaleString()} kWh</td>
                <td>{(fac.peak_demand_kw || 0).toLocaleString()} kW</td>
                <td>
                  {fac.energy_intensity !== undefined && fac.energy_intensity !== null
                    ? `${fac.energy_intensity} kWh/sq ft`
                    : (fac.intensity ? `${fac.intensity} kWh/sq ft` : 'Energy intensity unavailable')}
                </td>
                <td>₹{(fac.total_cost || fac.cost || 0).toLocaleString()}</td>
                <td>
                  <span style={{ fontSize: '0.75rem', padding: '0.125rem 0.5rem', borderRadius: '4px', background: 'var(--color-bg-subtle)', color: 'var(--color-text-primary)' }}>
                    {fac.status || 'Active'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
