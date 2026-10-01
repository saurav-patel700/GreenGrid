import React from 'react';

export default function EnergySummary({ kpis = {}, comparisonPeriod = 'vs prior 7 days' }) {
  if (!kpis || Object.keys(kpis).length === 0) {
    return (
      <div className="card" style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
        No energy telemetry readings available for selected period.
      </div>
    );
  }

  const renderBadge = (changePercent, trend) => {
    if (changePercent === undefined || changePercent === null) return null;
    const isUp = changePercent > 0;
    const color = isUp ? (trend === 'down' ? 'var(--color-danger-red)' : 'var(--color-energy-green)') : 'var(--color-energy-green)';
    const bg = isUp ? (trend === 'down' ? '#fef2f2' : '#ecfdf5') : '#ecfdf5';

    return (
      <span style={{ fontSize: '0.75rem', fontWeight: 600, color, backgroundColor: bg, padding: '0.125rem 0.375rem', borderRadius: '4px' }}>
        {isUp ? '↑ +' : '↓ '}{changePercent}%
      </span>
    );
  };

  const cards = [
    { key: 'consumption', title: 'Total Energy Consumption', data: kpis.consumption },
    { key: 'cost', title: 'Energy Cost', data: kpis.cost },
    { key: 'peak_demand', title: 'Peak Demand', data: kpis.peak_demand },
    { key: 'renewable_generation', title: 'Renewable Contribution', data: kpis.renewable_generation },
    { key: 'emissions', title: 'Est. Scope 2 Emissions', data: kpis.emissions },
    { key: 'energy_intensity', title: 'Energy Intensity', data: kpis.energy_intensity },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
      {cards.map(({ key, title, data }) => {
        if (!data) return null;
        return (
          <div key={key} className="card" style={{ padding: '1.25rem' }}>
            <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', fontWeight: 500, marginBottom: '0.5rem' }}>
              {title}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.375rem' }}>
              <span style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                {data.formatted_value || data.value}
              </span>
              <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-text-muted)' }}>
                {data.unit}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {renderBadge(data.change_percent, data.trend)}
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                {data.comparison_period || comparisonPeriod}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
