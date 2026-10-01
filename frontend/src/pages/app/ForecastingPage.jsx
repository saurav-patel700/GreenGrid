import React, { useState, useEffect } from 'react';
import { TrendingUp, AlertTriangle, ShieldCheck, Activity, RefreshCw, BarChart2, CheckCircle2 } from 'lucide-react';
import Breadcrumbs from '../../components/common/Breadcrumbs';
import {
  fetchFacilities, fetchForecastTimeseriesApi, fetchForecastAccuracyApi, fetchPredictPeakDemandApi
} from '../../services/api';

export default function ForecastingPage() {
  const [facilities, setFacilities] = useState([]);
  const [selectedFacility, setSelectedFacility] = useState('all');
  const [horizon, setHorizon] = useState('24h');
  const [targetType, setTargetType] = useState('consumption');

  const [forecastData, setForecastData] = useState(null);
  const [accuracyData, setAccuracyData] = useState(null);
  const [peakPrediction, setPeakPrediction] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchFacilities().then(res => {
      setFacilities(res || []);
    });
  }, []);

  useEffect(() => {
    loadForecastData();
  }, [selectedFacility, horizon, targetType]);

  async function loadForecastData() {
    setLoading(true);
    setError(null);
    try {
      const [fcRes, accRes, peakRes] = await Promise.all([
        fetchForecastTimeseriesApi(selectedFacility, horizon, targetType).catch(() => null),
        fetchForecastAccuracyApi(selectedFacility).catch(() => null),
        fetchPredictPeakDemandApi(selectedFacility).catch(() => null)
      ]);

      setForecastData(fcRes);
      setAccuracyData(accRes);
      setPeakPrediction(peakRes);
    } catch (err) {
      setError(err.message || 'Failed to load predictive forecasts.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Predictive Energy Forecasting' }]} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={24} style={{ color: 'var(--color-brand-primary, #00C853)' }} />
            Predictive Energy & Peak Demand Forecasting
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
            Statistical baseline engine predicting consumption, peak demand, and renewable generation with 95% confidence bounds.
          </p>
        </div>

        {/* Filter Controls */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <select className="input-select" value={selectedFacility} onChange={e => setSelectedFacility(e.target.value)} style={{ width: '180px' }}>
            <option value="all">All Facilities</option>
            {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>

          <select className="input-select" value={targetType} onChange={e => setTargetType(e.target.value)} style={{ width: '180px' }}>
            <option value="consumption">Energy Consumption (kWh)</option>
            <option value="demand">Peak Demand (kW)</option>
            <option value="solar">Solar Generation (kWh)</option>
          </select>

          <select className="input-select" value={horizon} onChange={e => setHorizon(e.target.value)} style={{ width: '140px' }}>
            <option value="24h">Next 24 Hours</option>
            <option value="7d">Next 7 Days</option>
            <option value="30d">Next 30 Days</option>
          </select>
        </div>
      </div>

      {/* Peak Demand Early Warning Alert */}
      {peakPrediction?.is_exceedance_projected && (
        <div style={{ padding: '1rem 1.25rem', background: '#3b1212', border: '1px solid #7f1d1d', borderRadius: '6px', color: '#fca5a5', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <AlertTriangle size={24} style={{ color: '#ef4444' }} />
            <div>
              <strong style={{ fontSize: '1rem' }}>Peak Demand Exceedance Early Warning</strong>
              <div style={{ fontSize: '0.875rem', marginTop: '0.125rem' }}>
                Projected peak demand of <strong>{peakPrediction.predicted_peak_kw} kW</strong> exceeds contract threshold ({peakPrediction.threshold_kw} kW). Estimated demand-charge exposure: <strong>₹{peakPrediction.estimated_demand_charge_exposure}</strong>.
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          <RefreshCw size={24} className="spin" style={{ marginBottom: '0.5rem' }} />
          <p>Generating forecast predictions and model confidence intervals...</p>
        </div>
      ) : forecastData?.status === 'INSUFFICIENT_DATA' ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          <AlertTriangle size={36} style={{ marginBottom: '0.5rem', color: '#f59e0b' }} />
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>Insufficient Historical Telemetry Data</h3>
          <p style={{ fontSize: '0.875rem', marginTop: '0.5rem', maxWidth: '600px', margin: '0.5rem auto' }}>
            {forecastData.message}
          </p>
          <span style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.05)', padding: '0.25rem 0.75rem', borderRadius: '4px' }}>
            Found: {forecastData.current_readings_count} / Required: {forecastData.minimum_required_readings} readings
          </span>
        </div>
      ) : (
        <>
          {/* Metrics Overview Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Forecast Horizon</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)', marginTop: '0.25rem' }}>{horizon}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>Model: {forecastData?.model_version || 'v1.0-baseline-moving-avg'}</div>
            </div>

            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>MAE (Mean Absolute Error)</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)', marginTop: '0.25rem' }}>
                {accuracyData?.mae ? `${accuracyData.mae} ${targetType === 'demand' ? 'kW' : 'kWh'}` : '--'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>Evaluated over {accuracyData?.evaluations_count || 0} intervals</div>
            </div>

            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>MAPE (Relative Error)</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)', marginTop: '0.25rem' }}>
                {accuracyData?.mape ? `${accuracyData.mape}%` : '--'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>Bias: {accuracyData?.bias_direction || 'Unbiased'}</div>
            </div>

            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Projected Peak Demand</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: peakPrediction?.is_exceedance_projected ? '#ef4444' : '#10b981', marginTop: '0.25rem' }}>
                {peakPrediction?.predicted_peak_kw || '--'} kW
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>Contract threshold: {peakPrediction?.threshold_kw || 100} kW</div>
            </div>
          </div>

          {/* Forecast Series Table */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>
              Predicted {targetType.toUpperCase()} Timetable ({horizon})
            </h3>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Target Timestamp</th>
                    <th>Forecast Value ({targetType === 'demand' ? 'kW' : 'kWh'})</th>
                    <th>Lower Bound (95%)</th>
                    <th>Upper Bound (95%)</th>
                    <th>Model Version</th>
                  </tr>
                </thead>
                <tbody>
                  {(forecastData?.forecast_series || []).map((s, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>{new Date(s.target_timestamp).toLocaleString()}</td>
                      <td style={{ fontWeight: 700, color: 'var(--color-brand-primary, #00C853)' }}>{s.forecast_value}</td>
                      <td style={{ color: 'var(--color-text-muted)' }}>{s.lower_bound}</td>
                      <td style={{ color: 'var(--color-text-muted)' }}>{s.upper_bound}</td>
                      <td style={{ fontSize: '0.75rem' }}>{forecastData.model_version}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
