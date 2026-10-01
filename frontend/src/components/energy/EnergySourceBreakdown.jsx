import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

export default function EnergySourceBreakdown({ breakdown = {} }) {
  const sources = breakdown.sources || [
    { source_display: 'Utility Grid', kwh: 140000, percentage: 65.0 },
    { source_display: 'Solar PV', kwh: 60000, percentage: 28.0 },
    { source_display: 'Battery Discharge', kwh: 15000, percentage: 7.0 }
  ];

  const totalKwh = breakdown.total_kwh || sources.reduce((acc, s) => acc + (s.kwh || 0), 0);

  const COLORS = ['#0284c7', '#059669', '#d97706', '#dc2626', '#8b5cf6'];

  const chartData = sources.map((s, idx) => ({
    name: s.source_display || s.source,
    value: s.kwh,
    percentage: s.percentage,
    color: COLORS[idx % COLORS.length]
  }));

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Energy Source Mix</h3>
        <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
          Total: {totalKwh ? totalKwh.toLocaleString() : 0} kWh
        </span>
      </div>

      {totalKwh === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          No energy consumption recorded for this period.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'center' }}>
          <div style={{ height: 200, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(val) => [`${val.toLocaleString()} kWh`, 'Consumption']} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {chartData.map((item) => (
              <div key={item.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.375rem', borderBottom: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: item.color }} />
                  <span style={{ fontSize: '0.8125rem', fontWeight: 500 }}>{item.name}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{item.value.toLocaleString()} kWh</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginLeft: '0.5rem' }}>
                    ({item.percentage}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
