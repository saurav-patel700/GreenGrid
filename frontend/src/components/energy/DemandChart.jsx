import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine } from 'recharts';

export default function DemandChart({ profile = [], limit = 1200, height = 300 }) {
  if (!profile || profile.length === 0) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', background: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-md)' }}>
        No demand telemetry available.
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={profile} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} />
          <YAxis stroke="#64748b" fontSize={11} tickLine={false} unit=" kW" />
          <Tooltip
            contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderRadius: '6px', fontSize: '0.8125rem' }}
            formatter={(val, name) => [`${val} kW`, name]}
          />
          <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '0.8125rem' }} />
          {limit && (
            <ReferenceLine y={limit} label={{ value: `Demand Threshold (${limit} kW)`, fill: '#dc2626', fontSize: 11, position: 'insideTopRight' }} stroke="#dc2626" strokeDasharray="4 4" />
          )}
          <Line type="monotone" dataKey="actual_peak" name="Peak Demand (kW)" stroke="#dc2626" strokeWidth={2} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="average_demand" name="Average Demand (kW)" stroke="#0284c7" strokeWidth={2} strokeDasharray="3 3" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
