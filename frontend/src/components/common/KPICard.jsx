import React from 'react';
import { ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';

export default function KPICard({ label, value, unit, changePercent, trend, comparisonPeriod, icon: Icon = Activity }) {
  const isPositiveTrend = (trend === 'down' && label.toLowerCase().includes('cost')) ||
                          (trend === 'down' && label.toLowerCase().includes('consumption')) ||
                          (trend === 'up' && label.toLowerCase().includes('renewable'));

  const isWarning = (trend === 'up' && label.toLowerCase().includes('peak'));

  const getTrendBadgeClass = () => {
    if (isWarning) return 'badge-amber';
    return isPositiveTrend ? 'badge-green' : 'badge-amber';
  };

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {label}
        </span>
        <div style={{ padding: '0.375rem', borderRadius: 'var(--radius-sm)', background: 'var(--color-bg-subtle)', color: 'var(--color-text-secondary)' }}>
          <Icon size={18} />
        </div>
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.375rem', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}>
            {value}
          </span>
          <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-muted)' }}>
            {unit}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem' }}>
          <span className={`badge ${getTrendBadgeClass()}`}>
            {trend === 'up' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {changePercent > 0 ? `+${changePercent}%` : `${changePercent}%`}
          </span>
          <span style={{ color: 'var(--color-text-muted)' }}>
            {comparisonPeriod}
          </span>
        </div>
      </div>
    </div>
  );
}
