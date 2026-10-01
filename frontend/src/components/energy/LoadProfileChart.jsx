import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

export default function LoadProfileChart({ series = [], height = 320 }) {
  if (!series || series.length === 0) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', background: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-md)' }}>
        No telemetry load profile readings available for this period.
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={series} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gridGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0284c7" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="solarGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#059669" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="batteryGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#d97706" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#d97706" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} />
          <YAxis stroke="#64748b" fontSize={11} tickLine={false} unit=" kWh" />
          <Tooltip
            contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderRadius: '6px', fontSize: '0.8125rem' }}
            formatter={(val, name) => [`${val} kWh`, name]}
          />
          <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '0.8125rem' }} />
          <Area type="monotone" dataKey="grid" name="Utility Grid" stroke="#0284c7" fillOpacity={1} fill="url(#gridGrad)" strokeWidth={2} />
          <Area type="monotone" dataKey="solar" name="Solar PV" stroke="#059669" fillOpacity={1} fill="url(#solarGrad)" strokeWidth={2} />
          <Area type="monotone" dataKey="battery" name="Battery Discharge" stroke="#d97706" fillOpacity={1} fill="url(#batteryGrad)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
