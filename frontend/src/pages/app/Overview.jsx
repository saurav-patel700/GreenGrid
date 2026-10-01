import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Download, RefreshCw, Activity, DollarSign, Gauge, Sun, AlertTriangle } from 'lucide-react';

import EnergySummary from '../../components/energy/EnergySummary';
import LoadProfileChart from '../../components/energy/LoadProfileChart';
import DemandChart from '../../components/energy/DemandChart';
import FacilityComparison from '../../components/energy/FacilityComparison';
import AnomalyFeed from '../../components/energy/AnomalyFeed';
import LoadingState from '../../components/common/LoadingState';
import { useWebSocket } from '../../context/WebSocketContext';
import { fetchDashboardOverview, getEnergyExportUrl } from '../../services/api';

export default function Overview() {
  const { selectedFacility, selectedRange } = useOutletContext() || { selectedFacility: 'all', selectedRange: '7d' };
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const { lastEvent } = useWebSocket();

  const loadData = () => {
    setLoading(true);
    fetchDashboardOverview(selectedFacility, selectedRange)
      .then((res) => {
        setData(res);
        setLastUpdated(new Date());
      })
      .catch((err) => console.error('Dashboard fetch error:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [selectedFacility, selectedRange]);

  // Reactive real-time event handler
  useEffect(() => {
    if (lastEvent) {
      if (['energy.reading_created', 'energy.anomaly_detected', 'meter.status_changed', 'alert.new', 'alert.resolved'].includes(lastEvent.event)) {
        // Silently refresh metrics without tearing down full UI
        fetchDashboardOverview(selectedFacility, selectedRange).then((res) => {
          setData(res);
          setLastUpdated(new Date());
        });
      }
    }
  }, [lastEvent, selectedFacility, selectedRange]);

  if (loading && !data) {
    return <LoadingState message="Connecting to Energy Telemetry Engine & calculating KPIs..." />;
  }

  const kpis = data?.kpis || {};
  const charts = data?.charts || {};
  const recentAlerts = data?.recent_alerts || [];
  const exportUrl = getEnergyExportUrl(selectedFacility, 'all', selectedRange);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header & Controls */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.625rem', fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}>
            Energy Analytics & Operational Dashboard
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            Real-time telemetry, load profiles, demand peaks, and rule-based anomaly detection across facilities.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            Updated: {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
          
          <button onClick={loadData} className="btn btn-secondary btn-sm" title="Refresh Telemetry">
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            Refresh
          </button>

          <a href={exportUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm">
            <Download size={14} />
            Export CSV
          </a>
        </div>
      </div>

      {/* KPI Cards Row */}
      <EnergySummary kpis={kpis} comparisonPeriod={`vs prior period (${selectedRange})`} />

      {/* Main Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '1.5rem' }}>
        
        {/* Load Profile Chart */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Facility Load Profile (Energy Consumption)</h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Breakdown by Grid, Solar PV, and Battery storage</span>
            </div>
          </div>
          <LoadProfileChart series={charts.consumption_series || []} height={320} />
        </div>

        {/* Peak Demand Profile Chart */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Peak Demand & Threshold Profile</h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Peak demand (kW) vs configured capacity limit</span>
            </div>
          </div>
          <DemandChart profile={charts.peak_demand_profile || []} limit={1200} height={320} />
        </div>

      </div>

      {/* Facility Comparison & Anomaly Feed Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        <FacilityComparison facilities={charts.facility_breakdown || []} />
        <AnomalyFeed alerts={recentAlerts} />
      </div>

    </div>
  );
}
