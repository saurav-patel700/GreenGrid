import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

export default function ConsumptionChart({ data = [] }) {
  return (
    <div style={{ width: '100%', height: 320 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
          <defs>
            <linearGradient id="colorGrid" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0284c7" stopOpacity={0.4}/>
              <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0}/>
            </linearGradient>
            <linearGradient id="colorSolar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#059669" stopOpacity={0.4}/>
              <stop offset="95%" stopColor="#059669" stopOpacity={0.0}/>
            </linearGradient>
            <linearGradient id="colorBattery" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#d97706" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#d97706" stopOpacity={0.0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="time" stroke="#64748b" fontSize={12} tickLine={false} />
          <YAxis stroke="#64748b" fontSize={12} tickLine={false} unit=" kWh" />
          <Tooltip
            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '6px', color: '#f8fafc', fontSize: '12px' }}
            itemStyle={{ color: '#f8fafc' }}
          />
          <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
          <Area type="monotone" dataKey="grid" name="Utility Grid (kWh)" stroke="#0284c7" fillOpacity={1} fill="url(#colorGrid)" strokeWidth={2} />
          <Area type="monotone" dataKey="solar" name="Solar Generation (kWh)" stroke="#059669" fillOpacity={1} fill="url(#colorSolar)" strokeWidth={2} />
          <Area type="monotone" dataKey="battery" name="Battery Storage (kWh)" stroke="#d97706" fillOpacity={1} fill="url(#colorBattery)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
