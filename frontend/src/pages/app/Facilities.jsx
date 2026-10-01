import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Building2, ArrowUpRight, Zap, RefreshCw, BarChart2, Award, Search, Filter } from 'lucide-react';

import LoadingState from '../../components/common/LoadingState';
import EmptyState from '../../components/common/EmptyState';
import { fetchEnergyByFacility, fetchEnergyBenchmarkingApi } from '../../services/api';

export default function Facilities() {
  const [facilities, setFacilities] = useState([]);
  const [benchmarkingData, setBenchmarkingData] = useState(null);
  const [selectedMetric, setSelectedMetric] = useState('kwh_per_sqft');
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const loadFacilities = () => {
    setLoading(true);
    Promise.all([
      fetchEnergyByFacility('7d'),
      fetchEnergyBenchmarkingApi(selectedMetric).catch(() => null)
    ])
      .then(([facData, benchData]) => {
        setFacilities(Array.isArray(facData) ? facData : []);
        setBenchmarkingData(benchData);
      })
      .catch((err) => console.error('Error fetching facilities:', err))
      .finally(() => setLoading(false));
  };


  useEffect(() => {
    loadFacilities();
  }, [selectedMetric]);

  const filteredFacilities = facilities.filter((f) => {
    const matchesSearch = (f.facility_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (f.city || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (f.state || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || f.facility_type === typeFilter;
    const matchesStatus = statusFilter === 'all' || (f.status || 'active').toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesType && matchesStatus;
  });

  if (loading && !facilities.length) {
    return <LoadingState message="Calculating facility operational analytics and benchmarking..." />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Page Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.625rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            Facility Portfolio & Operational Benchmarking
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            Inspect individual facility performance, multi-metric energy intensity, peak demand limits, and comparative portfolio rankings.
          </p>
        </div>

        <button onClick={loadFacilities} className="btn btn-secondary btn-sm">
          <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
        </button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="card" style={{ padding: '1rem 1.25rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '260px' }}>
          <Search size={16} color="var(--color-text-muted)" />
          <input
            type="text"
            placeholder="Search by facility name, city, state..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.875rem', color: 'var(--color-text-primary)' }}
          />
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <label style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>Type:</label>
            <select
              className="input-select"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              style={{ padding: '0.25rem 0.5rem', fontSize: '0.8125rem', width: '140px' }}
            >
              <option value="all">All Types</option>
              <option value="commercial">Commercial</option>
              <option value="manufacturing">Manufacturing</option>
              <option value="campus">Campus</option>
              <option value="retail">Retail</option>
              <option value="renewable_site">Renewable Site</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <label style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>Status:</label>
            <select
              className="input-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: '0.25rem 0.5rem', fontSize: '0.8125rem', width: '120px' }}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="maintenance">Maintenance</option>
              <option value="offline">Offline</option>
            </select>
          </div>
        </div>
      </div>

      {/* Facilities Cards Grid */}
      {filteredFacilities.length === 0 ? (
        <EmptyState title="No facilities found" message="No facilities match the specified search or filter criteria." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {filteredFacilities.map((fac) => (
            <div key={fac.facility_id} className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                      {fac.facility_name}
                    </h3>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                      {fac.city}, {fac.state} • {fac.facility_type}
                    </div>
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'var(--color-bg-subtle)' }}>
                    {fac.status}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', margin: '1rem 0', background: 'var(--color-bg-subtle)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Consumption (7d)</div>
                    <div style={{ fontSize: '1rem', fontWeight: 700 }}>{fac.total_consumption_kwh ? fac.total_consumption_kwh.toLocaleString() : 0} kWh</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Peak Demand</div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-danger-red)' }}>{fac.peak_demand_kw} kW</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Energy Intensity</div>
                    <div style={{ fontSize: '0.9375rem', fontWeight: 600 }}>
                      {fac.energy_intensity ? `${fac.energy_intensity} kWh/sq ft` : 'Intensity unavailable'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Cost (7d)</div>
                    <div style={{ fontSize: '1rem', fontWeight: 700 }}>₹{fac.total_cost ? fac.total_cost.toLocaleString() : 0}</div>
                  </div>
                </div>
              </div>

              <Link to={`/app/facilities/${fac.facility_id}`} className="btn btn-secondary btn-sm" style={{ width: '100%', marginTop: '0.5rem' }}>
                Open Facility Dashboard <ArrowUpRight size={14} />
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Energy Benchmarking Section */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BarChart2 size={20} style={{ color: 'var(--color-brand-primary, #00C853)' }} /> Portfolio Benchmarking & Internal Ranking
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', margin: '0.25rem 0 0 0' }}>
              Compare relative energy performance across portfolio facilities using normalized operational metrics.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Benchmark Metric:</label>
            <select
              className="input-select"
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              style={{ width: '220px' }}
            >
              <option value="kwh_per_sqft">kWh / facility area (sq ft)</option>
              <option value="kwh_per_unit">kWh / production unit</option>
              <option value="kwh_per_hour">kWh / operating hour</option>
              <option value="cost_per_sqft">₹ cost / sq ft</option>
            </select>
          </div>
        </div>

        {benchmarkingData?.facilities && benchmarkingData.facilities.length > 0 ? (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Facility Name</th>
                  <th>Type</th>
                  <th>Square Footage</th>
                  <th>Total Consumption</th>
                  <th>Peak Demand</th>
                  <th>Benchmark Value</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {benchmarkingData.facilities.map((b) => (
                  <tr key={b.facility_id}>
                    <td>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        background: b.rank === 1 ? '#FEF08A' : (b.rank === 2 ? '#E2E8F0' : (b.rank === 3 ? '#FFEDD5' : 'var(--color-bg-subtle)')),
                        color: b.rank === 1 ? '#854D0E' : (b.rank === 2 ? '#475569' : (b.rank === 3 ? '#9A3412' : 'var(--color-text-main)'))
                      }}>
                        {b.rank || '-'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{b.facility_name}</td>
                    <td>{b.facility_type}</td>
                    <td>{b.square_footage ? `${b.square_footage.toLocaleString()} sq ft` : 'N/A'}</td>
                    <td>{b.total_consumption_kwh.toLocaleString()} kWh</td>
                    <td>{b.peak_demand_kw} kW</td>
                    <td style={{ fontWeight: 700, color: 'var(--color-brand-primary, #00C853)' }}>
                      {b.formatted_value}
                    </td>
                    <td>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: b.data_available ? '#059669' : '#d97706' }}>
                        {b.data_available ? 'Calculated' : 'Data Unavailable'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            No benchmarking metrics available for selected filter.
          </div>
        )}
      </div>

    </div>
  );
}
