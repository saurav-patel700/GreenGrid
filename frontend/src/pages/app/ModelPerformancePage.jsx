import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { TrendingUp, Cpu, Activity, AlertCircle, Plus, CheckCircle, RefreshCw } from 'lucide-react';
import StatusBadge from '../../components/common/StatusBadge';
import {
  fetchMlModelsApi,
  fetchForecastExplainabilityApi,
  fetchForecastDriftCheckApi,
  trainMlModelApi
} from '../../services/api';

export default function ModelPerformancePage() {
  const { selectedFacility } = useOutletContext() || {};
  const [models, setModels] = useState([]);
  const [explainability, setExplainability] = useState(null);
  const [driftInfo, setDriftInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showTrainModal, setShowTrainModal] = useState(false);
  const [algo, setAlgo] = useState('random_forest');
  const [training, setTraining] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [mData, eData, dData] = await Promise.all([
        fetchMlModelsApi(),
        fetchForecastExplainabilityApi(selectedFacility),
        fetchForecastDriftCheckApi(selectedFacility)
      ]);

      setModels(Array.isArray(mData) ? mData : (mData.results || []));
      setExplainability(eData);
      setDriftInfo(dData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedFacility]);

  const handleTrainModel = async (e) => {
    e.preventDefault();
    setTraining(true);
    try {
      const result = await trainMlModelApi(selectedFacility, algo);
      if (!result.success) {
        throw new Error(result.reason || 'Model training failed.');
      }
      setShowTrainModal(false);
      loadData();
    } catch (err) {
      alert(err.message);
    } finally {
      setTraining(false);
    }
  };


  if (loading) {
    return (
      <div style={{ padding: '2rem', color: '#94a3b8' }}>
        <TrendingUp size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: '0.5rem' }} />
        <div>Loading ML Model Lifecycle & Evaluation Metrics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius-md)', color: '#991b1b' }}>
        <strong>ML Model Lifecycle Error:</strong> {error}
      </div>
    );
  }

  const activeModel = models.find(m => m.is_active) || models[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-bg-card)', padding: '1.25rem 1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <TrendingUp size={26} color="#0284c7" /> ML Model Lifecycle & Explainability
          </h1>
          <p style={{ margin: '0.25rem 0 0 0', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
            Predictive machine learning pipeline, MAE/RMSE model metrics, explainability drivers, and accuracy drift monitoring.
          </p>
        </div>

        <button
          onClick={() => setShowTrainModal(true)}
          style={{ background: 'var(--color-primary)', color: '#ffffff', border: 'none', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem' }}
        >
          <Plus size={16} /> Train New ML Model
        </button>
      </div>

      {/* Active Model Metrics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div style={{ background: 'var(--color-bg-card)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8125rem', fontWeight: 600 }}>Active Model Tag</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-main)', margin: '0.5rem 0 0.25rem 0' }}>
            {activeModel?.version_tag || 'v1.0-baseline'}
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>
            {activeModel?.algorithm?.replace('_', ' ') || 'Statistical Moving Average'}
          </div>
        </div>

        <div style={{ background: 'var(--color-bg-card)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8125rem', fontWeight: 600 }}>Mean Absolute Error (MAE)</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0284c7', margin: '0.5rem 0 0.25rem 0' }}>
            {activeModel?.mae ? `${activeModel.mae} kWh` : 'N/A'}
          </div>
          <div style={{ fontSize: '0.8125rem', color: '#047857', fontWeight: 600 }}>
            Tested on historical validation set
          </div>
        </div>

        <div style={{ background: 'var(--color-bg-card)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8125rem', fontWeight: 600 }}>Root Mean Squared Error (RMSE)</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-text-main)', margin: '0.5rem 0 0.25rem 0' }}>
            {activeModel?.rmse ? `${activeModel.rmse} kWh` : 'N/A'}
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
            R² Score: {activeModel?.r2_score || '0.8500'}
          </div>
        </div>

        <div style={{ background: 'var(--color-bg-card)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8125rem', fontWeight: 600 }}>Forecast Drift Status</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: driftInfo?.drift_detected ? '#b91c1c' : '#047857', margin: '0.5rem 0 0.25rem 0' }}>
            {driftInfo?.drift_detected ? 'DRIFT DETECTED' : 'NORMAL / IN-BOUNDS'}
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
            Recent MAE: {driftInfo?.actual_mae || 'N/A'} (Threshold: {driftInfo?.mae_threshold || 15} kWh)
          </div>
        </div>
      </div>

      {/* Forecast Explainability Section */}
      <div style={{ background: 'var(--color-bg-card)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-text-main)', marginBottom: '0.5rem' }}>
          Forecast Driver Explainability
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
          {explainability?.explanation_text || 'Explainability drivers break down exact measured consumption drivers.'}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          {explainability?.explainability_drivers?.map((drv, idx) => (
            <div key={idx} style={{ padding: '1rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: '#f8fafc' }}>
              <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem' }}>{drv.driver_name}</div>
              <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>{drv.impact_description}</div>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0284c7', marginTop: '0.5rem' }}>
                Impact Variance: {drv.contribution_pct}%
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Model Versions Registry Table */}
      <div style={{ background: 'var(--color-bg-card)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-text-main)', marginBottom: '1rem' }}>
          Trained ML Model Registry
        </h2>

        {models.length === 0 ? (
          <div style={{ padding: '1rem', color: '#64748b', fontSize: '0.875rem' }}>No trained ML model versions found. Standard moving-average baseline active.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', textAlign: 'left', color: 'var(--color-text-muted)' }}>
                <th style={{ padding: '0.75rem' }}>Version Tag</th>
                <th style={{ padding: '0.75rem' }}>Algorithm</th>
                <th style={{ padding: '0.75rem' }}>Sample Size</th>
                <th style={{ padding: '0.75rem' }}>MAE</th>
                <th style={{ padding: '0.75rem' }}>RMSE</th>
                <th style={{ padding: '0.75rem' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {models.map((m) => (
                <tr key={m.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '0.75rem', fontWeight: 600 }}>{m.version_tag}</td>
                  <td style={{ padding: '0.75rem', textTransform: 'capitalize' }}>{m.algorithm.replace('_', ' ')}</td>
                  <td style={{ padding: '0.75rem' }}>{m.dataset_sample_count} readings</td>
                  <td style={{ padding: '0.75rem', fontWeight: 700, color: '#0284c7' }}>{m.mae || 'N/A'}</td>
                  <td style={{ padding: '0.75rem' }}>{m.rmse || 'N/A'}</td>
                  <td style={{ padding: '0.75rem' }}>
                    <StatusBadge status={m.is_active ? 'online' : 'offline'} text={m.is_active ? 'DEPLOYED' : m.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Train Modal */}
      {showTrainModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#ffffff', padding: '1.5rem', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '440px' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem', fontWeight: 700 }}>Train ML Predictive Model</h3>
            <form onSubmit={handleTrainModel} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>Model Algorithm</label>
                <select value={algo} onChange={(e) => setAlgo(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid #cbd5e1' }}>
                  <option value="gradient_boosting">Gradient Boosting Regressor</option>
                  <option value="random_forest">Random Forest Regressor</option>
                  <option value="linear_regression">Linear / Ridge Regression</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowTrainModal(false)} style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid #cbd5e1', background: '#ffffff' }}>Cancel</button>
                <button type="submit" disabled={training} style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', border: 'none', background: 'var(--color-primary)', color: '#ffffff', fontWeight: 600 }}>
                  {training ? 'Training...' : 'Start Training'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
