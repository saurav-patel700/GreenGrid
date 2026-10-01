import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Sun, Leaf, Activity, Layers, Plus, CheckCircle, AlertCircle } from 'lucide-react';
import StatusBadge from '../../components/common/StatusBadge';
import {
  fetchCarbonSummaryApi,
  fetchRenewableIntelligenceApi,
  fetchEmissionFactorsApi,
  createEmissionFactorApi
} from '../../services/api';

export default function CarbonIntelligencePage() {
  const { selectedFacility } = useOutletContext() || {};
  const [carbonSummary, setCarbonSummary] = useState(null);
  const [renewableIntel, setRenewableIntel] = useState(null);
  const [emissionFactors, setEmissionFactors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showFactorModal, setShowFactorModal] = useState(false);
  const [newRegion, setNewRegion] = useState('US-TX');
  const [newFactor, setNewFactor] = useState('0.3850');
  const [newSource, setNewSource] = useState('EPA eGRID Regional Grid Factor');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [cData, rData, efData] = await Promise.all([
        fetchCarbonSummaryApi(selectedFacility, 30),
        fetchRenewableIntelligenceApi(selectedFacility, 30),
        fetchEmissionFactorsApi()
      ]);

      setCarbonSummary(cData);
      setRenewableIntel(rData);
      setEmissionFactors(Array.isArray(efData) ? efData : (efData.results || []));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedFacility]);

  const handleCreateEmissionFactor = async (e) => {
    e.preventDefault();
    try {
      await createEmissionFactorApi({
        region: newRegion,
        source_name: newSource,
        factor_kg_co2_per_kwh: newFactor,
        scope: 'scope_2'
      });
      setShowFactorModal(false);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };


  if (loading) {
    return (
      <div style={{ padding: '2rem', color: '#94a3b8' }}>
        <Leaf size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: '0.5rem' }} />
        <div>Loading Carbon & Emissions Intelligence...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius-md)', color: '#991b1b' }}>
        <strong>Carbon Intelligence Error:</strong> {error}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-bg-card)', padding: '1.25rem 1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <Leaf size={26} color="#059669" /> Carbon Accounting & Grid Intelligence
          </h1>
          <p style={{ margin: '0.25rem 0 0 0', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
            Calculated Scope 1 & 2 carbon emissions, regional emission factors, and renewable self-consumption metrics.
          </p>
        </div>

        <button
          onClick={() => setShowFactorModal(true)}
          style={{ background: 'var(--color-primary)', color: '#ffffff', border: 'none', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem' }}
        >
          <Plus size={16} /> Configure Emission Factor
        </button>
      </div>

      {/* Carbon KPI Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div style={{ background: 'var(--color-bg-card)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8125rem', fontWeight: 600 }}>Total Net Emissions</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#059669', margin: '0.5rem 0 0.25rem 0' }}>
            {carbonSummary?.total_emissions_tonnes_co2} tCO2
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
            ({carbonSummary?.total_emissions_kg_co2} kg CO2)
          </div>
        </div>

        <div style={{ background: 'var(--color-bg-card)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8125rem', fontWeight: 600 }}>Avoided Solar Emissions</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0369a1', margin: '0.5rem 0 0.25rem 0' }}>
            {carbonSummary?.avoided_emissions_kg_co2} kg CO2
          </div>
          <div style={{ fontSize: '0.8125rem', color: '#047857', fontWeight: 600 }}>
            Offset by renewable self-consumption
          </div>
        </div>

        <div style={{ background: 'var(--color-bg-card)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8125rem', fontWeight: 600 }}>Carbon Intensity</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-text-main)', margin: '0.5rem 0 0.25rem 0' }}>
            {carbonSummary?.carbon_intensity_kg_per_kwh} kg/kWh
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
            Emissions per kWh consumed
          </div>
        </div>

        <div style={{ background: 'var(--color-bg-card)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8125rem', fontWeight: 600 }}>Renewable Share</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#7c3aed', margin: '0.5rem 0 0.25rem 0' }}>
            {renewableIntel?.renewable_share_pct}%
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
            Self-consumption: {renewableIntel?.self_consumption_pct}%
          </div>
        </div>
      </div>

      {/* Emission Factor Configuration Table */}
      <div style={{ background: 'var(--color-bg-card)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-text-main)', marginBottom: '1rem' }}>
          Configured Regional Emission Factors
        </h2>

        {emissionFactors.length === 0 ? (
          <div style={{ padding: '1rem', background: '#fffbe0', border: '1px solid #ffe58f', borderRadius: 'var(--radius-md)', color: '#d48806' }}>
            <AlertCircle size={16} style={{ display: 'inline', marginRight: '0.375rem' }} />
            No custom emission factors configured. The system uses baseline regional eGRID factors.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', textAlign: 'left', color: 'var(--color-text-muted)' }}>
                <th style={{ padding: '0.75rem' }}>Region</th>
                <th style={{ padding: '0.75rem' }}>Source Reference</th>
                <th style={{ padding: '0.75rem' }}>Factor (kgCO2/kWh)</th>
                <th style={{ padding: '0.75rem' }}>Scope</th>
                <th style={{ padding: '0.75rem' }}>Effective Date</th>
                <th style={{ padding: '0.75rem' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {emissionFactors.map((ef) => (
                <tr key={ef.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '0.75rem', fontWeight: 600 }}>{ef.region}</td>
                  <td style={{ padding: '0.75rem' }}>{ef.source_name}</td>
                  <td style={{ padding: '0.75rem', fontWeight: 700, color: '#059669' }}>{ef.factor_kg_co2_per_kwh}</td>
                  <td style={{ padding: '0.75rem', textTransform: 'capitalize' }}>{ef.scope.replace('_', ' ')}</td>
                  <td style={{ padding: '0.75rem' }}>{ef.effective_from}</td>
                  <td style={{ padding: '0.75rem' }}>
                    <StatusBadge status={ef.is_active ? 'online' : 'offline'} text={ef.is_active ? 'Active' : 'Inactive'} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal for Emission Factor */}
      {showFactorModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#ffffff', padding: '1.5rem', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '480px' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem', fontWeight: 700 }}>Add Emission Factor</h3>
            <form onSubmit={handleCreateEmissionFactor} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>Region Code</label>
                <input type="text" value={newRegion} onChange={(e) => setNewRegion(e.target.value)} required style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid #cbd5e1' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>Factor (kg CO2 / kWh)</label>
                <input type="number" step="0.0001" value={newFactor} onChange={(e) => setNewFactor(e.target.value)} required style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid #cbd5e1' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>Source Reference</label>
                <input type="text" value={newSource} onChange={(e) => setNewSource(e.target.value)} required style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid #cbd5e1' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowFactorModal(false)} style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid #cbd5e1', background: '#ffffff' }}>Cancel</button>
                <button type="submit" style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', border: 'none', background: 'var(--color-primary)', color: '#ffffff', fontWeight: 600 }}>Save Factor</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
