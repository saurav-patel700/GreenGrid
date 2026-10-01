import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Building2, MapPin, Zap, Sun, AlertTriangle, Download } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

import LoadProfileChart from '../../components/energy/LoadProfileChart';
import DemandChart from '../../components/energy/DemandChart';
import EnergySourceBreakdown from '../../components/energy/EnergySourceBreakdown';
import MeterStatus from '../../components/energy/MeterStatus';
import AnomalyFeed from '../../components/energy/AnomalyFeed';
import DateRangeSelector from '../../components/energy/DateRangeSelector';
import LoadingState from '../../components/common/LoadingState';
import {
  fetchFacilityDetail, fetchEnergySummary, fetchEnergyTimeseries,
  fetchEnergyDemand, fetchEnergyBySource, fetchEnergyByMeter,
  fetchAlerts, getEnergyExportUrl
} from '../../services/api';

export default function FacilityDetail() {
  const { facilityId } = useParams();
  const [facility, setFacility] = useState(null);
  const [activeTab, setActiveTab] = useState('ENERGY');
  const [range, setRange] = useState('7d');
  const [loading, setLoading] = useState(true);

  const [summary, setSummary] = useState(null);
  const [timeseries, setTimeseries] = useState([]);
  const [demandData, setDemandData] = useState(null);
  const [sourceData, setSourceData] = useState(null);
  const [meters, setMeters] = useState([]);
  const [alerts, setAlerts] = useState([]);

  const loadFacilityData = () => {
    setLoading(true);
    Promise.all([
      fetchFacilityDetail(facilityId),
      fetchEnergySummary(facilityId, range),
      fetchEnergyTimeseries(facilityId, 'all', range),
      fetchEnergyDemand(facilityId, 'all', range),
      fetchEnergyBySource(facilityId, range),
      fetchEnergyByMeter(facilityId),
      fetchAlerts()
    ]).then(([facRes, sumRes, tsRes, demRes, srcRes, mtrRes, alrtRes]) => {
      setFacility(facRes);
      setSummary(sumRes);
      setTimeseries(tsRes.series || []);
      setDemandData(demRes);
      setSourceData(srcRes);
      setMeters(Array.isArray(mtrRes) ? mtrRes : []);
      const facAlerts = Array.isArray(alrtRes) ? alrtRes.filter(a => a.facility === parseInt(facilityId) || a.facility_id === parseInt(facilityId)) : [];
      setAlerts(facAlerts);
    }).catch(err => console.error('Error fetching facility detail:', err))
    .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadFacilityData();
  }, [facilityId, range]);

  if (loading && !facility) {
    return <LoadingState message={`Loading facility operational analytics...`} />;
  }

  if (!facility) {
    return (
      <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Facility Not Found</h2>
        <p style={{ color: 'var(--color-text-muted)', margin: '1rem 0' }}>The requested facility does not exist or access is restricted.</p>
        <Link to="/app/facilities" className="btn btn-secondary">Back to Facilities</Link>
      </div>
    );
  }

  const kpis = summary?.kpis || {};
  const exportUrl = getEnergyExportUrl(facilityId, 'all', range);

  const tabs = [
    { key: 'ENERGY', label: 'ENERGY ANALYTICS' },
    { key: 'METERS', label: `METERS (${meters.length})` },
    { key: 'COST', label: 'COST & BILLING' },
    { key: 'RENEWABLES', label: 'RENEWABLES' },
    { key: 'ALERTS', label: `ALERTS (${alerts.length})` },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Back Link & Header */}
      <div>
        <Link to="/app/facilities" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
          <ArrowLeft size={14} /> Back to Facilities Portfolio
        </Link>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
              <h1 style={{ fontSize: '1.625rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                {facility.name}
              </h1>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: '4px', background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0' }}>
                {facility.status ? facility.status.toUpperCase() : 'ACTIVE'}
              </span>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MapPin size={14} /> {facility.address}, {facility.city}, {facility.state} • Area: <strong>{facility.square_footage ? facility.square_footage.toLocaleString() : 'N/A'} sq ft</strong>
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

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Total Consumption</div>
          <div style={{ fontSize: '1.375rem', fontWeight: 700 }}>{kpis.consumption?.formatted_value || 0} kWh</div>
        </div>
        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Energy Cost</div>
          <div style={{ fontSize: '1.375rem', fontWeight: 700 }}>₹{kpis.cost?.formatted_value || 0}</div>
        </div>
        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Peak Demand</div>
          <div style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--color-danger-red)' }}>{kpis.peak_demand?.formatted_value || 0} kW</div>
        </div>
        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Energy Intensity</div>
          <div style={{ fontSize: '1.125rem', fontWeight: 600 }}>{kpis.energy_intensity?.formatted_value || 'N/A'}</div>
        </div>
        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Renewable Generation</div>
          <div style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--color-energy-green)' }}>{kpis.renewable_generation?.formatted_value || 0} kWh</div>
        </div>
        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Active Alerts</div>
          <div style={{ fontSize: '1.375rem', fontWeight: 700, color: alerts.length > 0 ? 'var(--color-warning-amber)' : 'var(--color-energy-green)' }}>
            {alerts.length}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', gap: '1.5rem' }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              padding: '0.75rem 0.25rem',
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: activeTab === t.key ? 'var(--color-primary)' : 'var(--color-text-muted)',
              borderBottom: activeTab === t.key ? '2px solid var(--color-primary)' : '2px solid transparent',
              background: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              borderTop: 'none',
              cursor: 'pointer'
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'ENERGY' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Facility Load Profile</h3>
            </div>
            <LoadProfileChart series={timeseries} height={300} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Peak Demand Profile</h3>
              </div>
              <DemandChart profile={demandData?.profile || []} limit={1200} height={260} />
            </div>

            <EnergySourceBreakdown breakdown={sourceData || {}} />
          </div>
        </div>
      )}

      {activeTab === 'METERS' && (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Meter Name</th>
                <th>Meter Number</th>
                <th>Type</th>
                <th>Status</th>
                <th>Current Demand</th>
                <th>Today Consumption</th>
                <th>Quality</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {meters.map((m) => (
                <tr key={m.id}>
                  <td style={{ fontWeight: 600 }}>{m.name}</td>
                  <td>{m.meter_number}</td>
                  <td style={{ textTransform: 'capitalize' }}>{m.meter_type}</td>
                  <td><MeterStatus status={m.status} /></td>
                  <td>{m.current_demand} kW</td>
                  <td>{m.today_consumption} kWh</td>
                  <td><span style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>{m.data_quality}</span></td>
                  <td>
                    <Link to={`/app/meters/${m.id}`} className="btn btn-sm btn-secondary">Inspect</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'COST' && (
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3>Estimated Cost Breakdown</h3>
          <p style={{ color: 'var(--color-text-muted)', margin: '0.5rem 0 1rem 0' }}>
            Calculated energy consumption cost based on facility tariff baselines.
          </p>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            ₹{kpis.cost?.formatted_value || '0.00'}
          </div>
        </div>
      )}

      {activeTab === 'RENEWABLES' && (
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3>Renewable Asset Output</h3>
          <p style={{ color: 'var(--color-text-muted)', margin: '0.5rem 0 1rem 0' }}>
            Solar PV generation offset and battery storage capacity for this facility.
          </p>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-energy-green)' }}>
            {kpis.renewable_generation?.formatted_value || 0} kWh
          </div>
        </div>
      )}

      {activeTab === 'ALERTS' && (
        <AnomalyFeed alerts={alerts} />
      )}

    </div>
  );
}
