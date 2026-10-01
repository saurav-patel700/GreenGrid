import React, { useState, useEffect } from 'react';
import { Zap, CheckCircle2, AlertCircle, RefreshCw, Lightbulb, ArrowRight, DollarSign } from 'lucide-react';
import Breadcrumbs from '../../components/common/Breadcrumbs';
import {
  fetchOptimizationRecommendationsApi, approveOptimizationRecommendationApi, fetchFacilities
} from '../../services/api';

export default function OptimizationPage() {
  const [recommendations, setRecommendations] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [selectedFacility, setSelectedFacility] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFacilities().then(res => setFacilities(res || []));
  }, []);

  useEffect(() => {
    loadRecommendations();
  }, [selectedFacility]);

  async function loadRecommendations() {
    setLoading(true);
    try {
      const res = await fetchOptimizationRecommendationsApi(selectedFacility);
      setRecommendations(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(id) {
    try {
      const updated = await approveOptimizationRecommendationApi(id);
      setRecommendations(prev => prev.map(r => r.id === id ? updated : r));
    } catch (err) {
      alert(`Approval failed: ${err.message}`);
    }
  }

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Automated Load Optimization' }]} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Lightbulb size={24} style={{ color: 'var(--color-brand-primary, #00C853)' }} />
            Automated Energy & Load Optimization Recommendations
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
            Explainable energy recommendations for peak shaving, TOU load shifting, and BESS storage dispatch.
          </p>
        </div>

        <select className="input-select" value={selectedFacility} onChange={e => setSelectedFacility(e.target.value)} style={{ width: '200px' }}>
          <option value="all">All Facilities</option>
          {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          <RefreshCw size={24} className="spin" style={{ marginBottom: '0.5rem' }} />
          <p>Evaluating telemetry profiles and generating explainable optimization actions...</p>
        </div>
      ) : recommendations.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          <Lightbulb size={36} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
          <p style={{ fontWeight: 600 }}>No optimization recommendations currently generated.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {recommendations.map(r => (
            <div key={r.id} className="card" style={{ padding: '1.5rem', borderLeft: `4px solid ${r.is_approved ? '#10b981' : 'var(--color-brand-primary, #00C853)'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.75rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-brand-primary, #00C853)', fontWeight: 700 }}>
                    {r.recommendation_type.replace(/_/g, ' ')}
                  </span>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginTop: '0.25rem' }}>{r.facility_name}</h3>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Expected Cost Savings</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#10b981' }}>₹{r.expected_cost_impact}</div>
                  </div>
                  {r.is_approved ? (
                    <span style={{ padding: '0.25rem 0.75rem', background: '#064e3b', color: '#6ee7b7', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                      Approved by {r.approved_by_username || 'Admin'}
                    </span>
                  ) : (
                    <button className="btn btn-primary btn-sm" onClick={() => handleApprove(r.id)}>
                      <CheckCircle2 size={14} /> Approve Action
                    </button>
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', fontSize: '0.875rem' }}>
                  <strong style={{ color: 'var(--color-text-muted)' }}>Current Condition:</strong>
                  <p style={{ marginTop: '0.25rem' }}>{r.current_condition}</p>
                </div>
                <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', fontSize: '0.875rem' }}>
                  <strong style={{ color: 'var(--color-text-muted)' }}>Suggested Optimization Action:</strong>
                  <p style={{ marginTop: '0.25rem', color: 'var(--color-brand-primary, #00C853)', fontWeight: 600 }}>{r.suggested_action}</p>
                </div>
              </div>

              <div style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.3)', borderRadius: '4px', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                <strong>Reasoning & Explainability:</strong> {r.reason} (Confidence Score: {r.confidence_score * 100}%)
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
