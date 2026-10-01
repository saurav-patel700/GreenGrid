import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Download, RefreshCw, Activity, ShieldCheck, BarChart2 } from 'lucide-react';

import EnergySummary from '../../components/energy/EnergySummary';
import LoadProfileChart from '../../components/energy/LoadProfileChart';
import DemandChart from '../../components/energy/DemandChart';
import FacilityComparison from '../../components/energy/FacilityComparison';
import EnergySourceBreakdown from '../../components/energy/EnergySourceBreakdown';
import EnergyIntensityCard from '../../components/energy/EnergyIntensityCard';
import DataQualityIndicator from '../../components/energy/DataQualityIndicator';
import DateRangeSelector from '../../components/energy/DateRangeSelector';
import LoadingState from '../../components/common/LoadingState';
import {
  fetchEnergySummary, fetchEnergyTimeseries, fetchEnergyDemand,
  fetchEnergyByFacility, fetchEnergyBySource, fetchEnergyIntensity,
  fetchEnergyDataQuality, getEnergyExportUrl
} from '../../services/api';

export default function Energy() {
  const { selectedFacility, selectedRange } = useOutletContext() || { selectedFacility: 'all', selectedRange: '7d' };
  const [range, setRange] = useState(selectedRange);
  const [loading, setLoading] = useState(true);

  const [summary, setSummary] = useState(null);
  const [timeseries, setTimeseries] = useState([]);
  const [demand, setDemand] = useState(null);
  const [facilitiesCmp, setFacilitiesCmp] = useState([]);
  const [sourceMix, setSourceMix] = useState(null);
  const [intensity, setIntensity] = useState(null);
  const [qualityReport, setQualityReport] = useState(null);

  const loadAllAnalytics = () => {
    setLoading(true);
    Promise.all([
      fetchEnergySummary(selectedFacility, range),
      fetchEnergyTimeseries(selectedFacility, 'all', range),
      fetchEnergyDemand(selectedFacility, 'all', range),
      fetchEnergyByFacility(range),
      fetchEnergyBySource(selectedFacility, range),
      fetchEnergyIntensity(range),
      fetchEnergyDataQuality(selectedFacility, range)
    ]).then(([sum, ts, dem, facs, src, intns, qual]) => {
      setSummary(sum);
      setTimeseries(ts.series || []);
      setDemand(dem);
      setFacilitiesCmp(facs);
      setSourceMix(src);
      setIntensity(intns);
      setQualityReport(qual);
    }).catch(err => console.error('Energy analytics error:', err))
    .finally(() => setLoading(false));
  };

  useEffect(() => {
    setRange(selectedRange);
  }, [selectedRange]);

  useEffect(() => {
    loadAllAnalytics();
  }, [selectedFacility, range]);

  if (loading && !summary) {
    return <LoadingState message="Processing multi-facility energy telemetry analytics..." />;
  }

  const exportUrl = getEnergyExportUrl(selectedFacility, 'all', range);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.625rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            EMIS Energy Analytics Engine
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            Historical consumption analytics, peak demand profiling, energy intensity, source breakdown, and data quality scores.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <DateRangeSelector selectedRange={range} onRangeChange={setRange} />
          <button onClick={loadAllAnalytics} className="btn btn-secondary btn-sm">
            <RefreshCw size={14} /> Refresh
          </button>
          <a href={exportUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm">
            <Download size={14} /> Export CSV
          </a>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <EnergySummary kpis={summary?.kpis || {}} comparisonPeriod={`vs prior period (${range})`} />

      {/* Top Grid: Intensity & Data Quality Score */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        <EnergyIntensityCard
          intensity={intensity?.organization_average_intensity}
          formattedValue={intensity?.formatted_organization_intensity}
        />

        <div className="card" style={{ padding: '1.25rem' }}>
          <div className="card-header" style={{ marginBottom: '0.5rem', paddingBottom: '0.5rem' }}>
            <h3 className="card-title">Telemetry Data Quality Index</h3>
            <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-energy-green)' }}>
              {qualityReport?.quality_score_percent || 100}%
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.5rem', marginTop: '0.5rem', textAlign: 'center' }}>
            <div style={{ background: '#ecfdf5', padding: '0.5rem', borderRadius: '4px' }}>
              <div style={{ fontSize: '0.75rem', color: '#065f46', fontWeight: 600 }}>GOOD</div>
              <div style={{ fontSize: '1.125rem', fontWeight: 700 }}>{qualityReport?.good_readings || 0}</div>
            </div>
            <div style={{ background: '#fffbeb', padding: '0.5rem', borderRadius: '4px' }}>
              <div style={{ fontSize: '0.75rem', color: '#92400e', fontWeight: 600 }}>DELAYED</div>
              <div style={{ fontSize: '1.125rem', fontWeight: 700 }}>{qualityReport?.delayed_readings || 0}</div>
            </div>
            <div style={{ background: '#fef2f2', padding: '0.5rem', borderRadius: '4px' }}>
              <div style={{ fontSize: '0.75rem', color: '#991b1b', fontWeight: 600 }}>MISSING</div>
              <div style={{ fontSize: '1.125rem', fontWeight: 700 }}>{qualityReport?.missing_readings || 0}</div>
            </div>
            <div style={{ background: '#f5f3ff', padding: '0.5rem', borderRadius: '4px' }}>
              <div style={{ fontSize: '0.75rem', color: '#5b21b6', fontWeight: 600 }}>SUSPECT</div>
              <div style={{ fontSize: '1.125rem', fontWeight: 700 }}>{qualityReport?.suspect_readings_count || 0}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Load Profile (Grid, Solar PV, Battery)</h3>
        </div>
        <LoadProfileChart series={timeseries} height={320} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Demand Analytics (Peak & Thresholds)</h3>
          </div>
          <DemandChart profile={demand?.profile || []} limit={1200} height={280} />
        </div>

        <EnergySourceBreakdown breakdown={sourceMix || {}} />
      </div>

      {/* Facility Comparison */}
      <FacilityComparison facilities={facilitiesCmp} />

    </div>
  );
}
