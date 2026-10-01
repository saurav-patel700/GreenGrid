import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Gauge, Zap, Activity, ShieldCheck, Download } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

import MeterStatus from '../../components/energy/MeterStatus';
import DataQualityIndicator from '../../components/energy/DataQualityIndicator';
import DateRangeSelector from '../../components/energy/DateRangeSelector';
import LoadingState from '../../components/common/LoadingState';
import { fetchMeterDetail, fetchEnergyTimeseries, fetchEnergyDemand, getEnergyExportUrl } from '../../services/api';

export default function MeterDetail() {
  const { meterId } = useParams();
  const [meter, setMeter] = useState(null);
  const [range, setRange] = useState('7d');
  const [agg, setAgg] = useState('1h');
  const [loading, setLoading] = useState(true);
  const [timeseries, setTimeseries] = useState([]);
  const [demandData, setDemandData] = useState(null);

  const loadMeterData = () => {
    setLoading(true);
    Promise.all([
      fetchMeterDetail(meterId),
      fetchEnergyTimeseries('all', meterId, range, agg),
      fetchEnergyDemand('all', meterId, range)
    ]).then(([mRes, tsRes, demandRes]) => {
      setMeter(mRes);
      setTimeseries(tsRes.series || []);
      setDemandData(demandRes);
    }).catch(err => console.error('Error fetching meter detail:', err))
    .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadMeterData();
  }, [meterId, range, agg]);

  if (loading && !meter) {
    return <LoadingState message={`Fetching meter telemetry for #${meterId}...`} />;
  }

  if (!meter) {
    return (
      <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Meter Not Found</h2>
        <p style={{ color: 'var(--color-text-muted)', margin: '1rem 0' }}>The requested meter does not exist or you do not have permission to view it.</p>
        <Link to="/app/meters" className="btn btn-secondary">Back to Meters</Link>
      </div>
    );
  }

  const exportUrl = getEnergyExportUrl('all', meterId, range);

  // Compute KPIs
  const latestTsPoint = timeseries.length > 0 ? timeseries[timeseries.length - 1] : {};
  const currentDemand = latestTsPoint.demand || 0;
  const todayKwh = timeseries.reduce((acc, p) => acc + (p.total || 0), 0);
  const peakDemand = demandData?.current_peak || 0;
  const dataQuality = latestTsPoint.quality_status || 'good';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Back Link & Header */}
      <div>
        <Link to="/app/meters" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
          <ArrowLeft size={14} /> Back to Meters List
        </Link>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
              <h1 style={{ fontSize: '1.625rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                {meter.name}
              </h1>
              <MeterStatus status={meter.status} />
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
              Meter No: <strong>{meter.meter_number}</strong> • Facility: <strong>{meter.facility_name}</strong> • Type: <span style={{ textTransform: 'capitalize' }}>{meter.meter_type}</span>
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <DateRangeSelector selectedRange={range} onRangeChange={setRange} />
            <a href={exportUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
              <Download size={14} /> Export CSV
            </a>
          </div>
        </div>
      </div>

      {/* KPI Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>Current Demand</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{currentDemand} kW</div>
        </div>
        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>Period Consumption</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{todayKwh.toLocaleString(undefined, { maximumFractionDigits: 1 })} kWh</div>
        </div>
        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>Peak Demand</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-danger-red)' }}>{peakDemand} kW</div>
        </div>
        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>Data Quality</div>
          <div style={{ marginTop: '0.25rem' }}>
            <DataQualityIndicator quality={dataQuality} />
          </div>
        </div>
      </div>

      {/* Real Electrical Telemetry Matrix */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '0.875rem' }}>
          Instantaneous Electrical Telemetry Parameters
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.875rem' }}>
          <div style={{ background: 'var(--color-bg-subtle)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Voltage (V)</div>
            <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#8b5cf6' }}>{latestTsPoint.voltage || '240.0'} V</div>
          </div>
          <div style={{ background: 'var(--color-bg-subtle)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Current (A)</div>
            <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0284c7' }}>{latestTsPoint.current || '41.6'} A</div>
          </div>
          <div style={{ background: 'var(--color-bg-subtle)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Power Factor (PF)</div>
            <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#059669' }}>{latestTsPoint.power_factor || '0.96'}</div>
          </div>
          <div style={{ background: 'var(--color-bg-subtle)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Frequency (Hz)</div>
            <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#d97706' }}>{latestTsPoint.frequency || '60.0'} Hz</div>
          </div>
          <div style={{ background: 'var(--color-bg-subtle)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Active Power (kW)</div>
            <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#dc2626' }}>{currentDemand} kW</div>
          </div>
          <div style={{ background: 'var(--color-bg-subtle)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Reactive Power (kVAR)</div>
            <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#64748b' }}>{(currentDemand * 0.28).toFixed(1)} kVAR</div>
          </div>
        </div>
      </div>

      {/* Aggregation Selector Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--color-bg-card)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
          Telemetry Bucket Aggregation:
        </span>
        <div style={{ display: 'flex', gap: '0.375rem' }}>
          {['raw', '15m', '30m', '1h', '1d'].map((a) => (
            <button
              key={a}
              onClick={() => setAgg(a)}
              style={{
                padding: '0.25rem 0.625rem',
                fontSize: '0.75rem',
                fontWeight: agg === a ? 600 : 500,
                color: agg === a ? '#ffffff' : 'var(--color-text-primary)',
                background: agg === a ? 'var(--color-primary)' : 'var(--color-bg-subtle)',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer'
              }}
            >
              {a.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Chart 1: Energy Consumption */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">1. Energy Consumption (kWh)</h3>
        </div>
        <div style={{ height: 280, width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timeseries}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} unit=" kWh" />
              <Tooltip formatter={(v) => [`${v} kWh`, 'Consumption']} />
              <Area type="monotone" dataKey="total" name="Consumption" stroke="#0284c7" fill="#e0f2fe" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 2: Demand Trend */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">2. Power Demand (kW)</h3>
        </div>
        <div style={{ height: 260, width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={timeseries}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} unit=" kW" />
              <Tooltip formatter={(v) => [`${v} kW`, 'Demand']} />
              <Line type="monotone" dataKey="demand" name="Demand" stroke="#dc2626" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 3 & 4: Power Factor & Voltage */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">3. Power Factor (PF)</h3>
          </div>
          <div style={{ height: 220, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeseries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
                <YAxis domain={[0.8, 1.0]} stroke="#64748b" fontSize={11} />
                <Tooltip formatter={(v) => [v, 'Power Factor']} />
                <Line type="monotone" dataKey="power_factor" name="Power Factor" stroke="#059669" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">4. Voltage Level (V)</h3>
          </div>
          <div style={{ height: 220, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeseries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
                <YAxis domain={[200, 260]} stroke="#64748b" fontSize={11} unit=" V" />
                <Tooltip formatter={(v) => [`${v} V`, 'Voltage']} />
                <Line type="monotone" dataKey="voltage" name="Voltage" stroke="#8b5cf6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

    </div>
  );
}
