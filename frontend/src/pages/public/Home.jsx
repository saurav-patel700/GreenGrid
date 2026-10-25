import React from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, ArrowRight, Building2, Gauge, BarChart3, Sun,
  ShieldAlert, Zap, CheckCircle2, Cpu, TrendingDown, Clock
} from 'lucide-react';
import ConsumptionChart from '../../components/charts/ConsumptionChart';
import KPICard from '../../components/common/KPICard';
import { DEMO_FALLBACK_DATA } from '../../services/api';
import heroFullHeight from '../../assets/hero-fullheight.jpg';

export default function Home() {
  const sampleChartData = DEMO_FALLBACK_DATA.charts.consumption_series;

  return (
    <div>
      {/* Hero Section */}
      <section style={{
        position: 'relative',
        backgroundImage: `linear-gradient(to bottom, rgba(255, 255, 255, 0.80) 0%, rgba(255, 255, 255, 0.88) 40%, rgba(255, 255, 255, 0.95) 100%), url(${heroFullHeight})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
        backgroundRepeat: 'no-repeat',
        borderBottom: '1px solid var(--color-border)',
        paddingTop: '4rem',
        paddingBottom: '4rem'
      }}>
        <div className="container">
          <div style={{ maxWidth: '820px', margin: '0 auto', textAlign: 'center', marginBottom: '3rem' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.35rem 0.875rem',
              borderRadius: '20px',
              background: 'var(--color-bg-subtle)',
              border: '1px solid var(--color-border)',
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: 'var(--color-text-secondary)',
              marginBottom: '1.25rem'
            }}>
              <Zap size={14} color="var(--color-energy-green)" />
              Smart Energy Management & Intelligence System (EMIS)
            </div>

            <h1 style={{ fontSize: '2.75rem', fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.03em', lineHeight: 1.15, marginBottom: '1.25rem' }}>
              Energy intelligence for every facility.
            </h1>

            <p style={{ fontSize: '1.125rem', color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: '2rem', maxWidth: '720px', margin: '0 auto 2rem auto' }}>
              GreenGrid gives operations, facility, and sustainability teams a single unified platform to monitor consumption, utility costs, peak demand, and renewable generation across all organization sites.
            </p>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/register" className="btn btn-primary" style={{ padding: '0.75rem 1.5rem', fontSize: '1rem' }}>
                Get Started
                <ArrowRight size={18} />
              </Link>
              <Link to="/platform" className="btn btn-secondary" style={{ padding: '0.75rem 1.5rem', fontSize: '1rem' }}>
                Explore the platform
              </Link>
            </div>
          </div>

          {/* Hero Product UI Mockup Preview */}
          <div style={{
            background: 'var(--color-bg-main)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)',
            overflow: 'hidden',
            padding: '1.25rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.875rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }} />
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }} />
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }} />
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-muted)', marginLeft: '0.5rem' }}>
                  GreenGrid Platform Preview - Live Facility Telemetry
                </span>
              </div>
              <Link to="/app" className="btn btn-dark btn-sm">
                Launch Dashboard
              </Link>
            </div>

            {/* Quick Mockup KPI Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
              <KPICard label="Total Energy" value="248,520" unit="kWh" changePercent={-4.2} trend="down" comparisonPeriod="vs prior 7 days" icon={Activity} />
              <KPICard label="Utility Cost" value="₹34,792.80" unit="INR" changePercent={-3.8} trend="down" comparisonPeriod="vs prior 7 days" icon={TrendingDown} />
              <KPICard label="Peak Demand" value="1,420" unit="kW" changePercent={1.5} trend="up" comparisonPeriod="vs 1,500 kW limit" icon={Gauge} />
              <KPICard label="Solar PV Output" value="82,400" unit="kWh" changePercent={12.4} trend="up" comparisonPeriod="33.1% solar offset" icon={Sun} />
            </div>

            {/* Mockup Main Chart */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">Real-Time Facility Energy Profile (kWh)</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Multi-source Load Balance</span>
              </div>
              <ConsumptionChart data={sampleChartData} />
            </div>
          </div>
        </div>
      </section>

      {/* 4 Core Capabilities Section */}
      <section style={{ padding: '5rem 0', background: 'var(--color-bg-main)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 3.5rem auto' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>
              Built for practical energy intelligence
            </h2>
            <p style={{ fontSize: '1rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
              A complete EMIS framework designed to give operational teams actionable insight into consumption, peak demand, and utility expenditure.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.75rem' }}>
            
            {/* Capability 1: Monitor */}
            <div className="card" style={{ padding: '1.75rem' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: 'var(--radius-md)', background: 'var(--color-info-blue-bg)', color: 'var(--color-info-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
                <Gauge size={22} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.625rem' }}>
                1. Monitor
              </h3>
              <p style={{ fontSize: '0.9375rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                Track electricity, natural gas, water, fuel, and submeter consumption in real time across commercial buildings, campuses, and industrial sites.
              </p>
            </div>

            {/* Capability 2: Understand */}
            <div className="card" style={{ padding: '1.75rem' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: 'var(--radius-md)', background: 'var(--color-energy-green-bg)', color: 'var(--color-energy-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
                <BarChart3 size={22} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.625rem' }}>
                2. Understand
              </h3>
              <p style={{ fontSize: '0.9375rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                Analyze building performance baselines, Energy Use Intensity (EUI), utility rate structures, and historical demand profiles to pinpoint inefficiencies.
              </p>
            </div>

            {/* Capability 3: Optimize */}
            <div className="card" style={{ padding: '1.75rem' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: 'var(--radius-md)', background: 'var(--color-warning-amber-bg)', color: 'var(--color-warning-amber)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
                <TrendingDown size={22} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.625rem' }}>
                3. Optimize
              </h3>
              <p style={{ fontSize: '0.9375rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                Identify consumption anomalies, automate peak-demand warning thresholds, and coordinate battery storage dispatches to prevent costly penalty charges.
              </p>
            </div>

            {/* Capability 4: Integrate */}
            <div className="card" style={{ padding: '1.75rem' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: 'var(--radius-md)', background: 'var(--color-bg-subtle)', color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
                <Cpu size={22} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.625rem' }}>
                4. Integrate
              </h3>
              <p style={{ fontSize: '0.9375rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                Connect utility smart meters, solar inverters, battery storage systems, BMS controllers, and time-of-use tariff data through standard REST APIs.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* Product Feature Deep-Dive Grid */}
      <section style={{ padding: '5rem 0', background: '#ffffff', borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '3rem', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Multi-Facility Management
              </span>
              <h2 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: '0.5rem 0 1rem 0', letterSpacing: '-0.02em' }}>
                Centralized visibility for distributed operational sites.
              </h2>
              <p style={{ fontSize: '1rem', color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                Managing energy across multiple locations requires consistent metrics and normalized data. GreenGrid aggregates disparate facility feeds into unified management dashboards.
              </p>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: '0.9375rem', color: 'var(--color-text-primary)' }}>
                  <CheckCircle2 size={18} color="var(--color-energy-green)" />
                  Normalized Energy Use Intensity (kWh/sqft) comparison
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: '0.9375rem', color: 'var(--color-text-primary)' }}>
                  <CheckCircle2 size={18} color="var(--color-energy-green)" />
                  Automated peak demand alert notifications across all buildings
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: '0.9375rem', color: 'var(--color-text-primary)' }}>
                  <CheckCircle2 size={18} color="var(--color-energy-green)" />
                  Utility bill auditing and tariff structure reconciliation
                </li>
              </ul>
            </div>

            <div className="card" style={{ padding: '1.5rem', background: 'var(--color-bg-main)' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
                Facility Load Comparison (Monthly kWh)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {[
                  { name: 'Eastside Manufacturing Hub', kwh: '102,400 kWh', cost: '₹14,336', bar: '85%', status: 'High Demand' },
                  { name: 'Innovation Tech Center', kwh: '84,200 kWh', cost: '₹11,788', bar: '68%', status: 'Optimal' },
                  { name: 'North Campus Operations', kwh: '41,920 kWh', cost: '₹5,868', bar: '38%', status: 'Optimal' },
                  { name: 'South Distribution Depot', kwh: '20,000 kWh', cost: '₹2,800', bar: '20%', status: 'Optimal' }
                ].map((f, i) => (
                  <div key={i} style={{ background: '#ffffff', padding: '0.875rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem', fontSize: '0.875rem', fontWeight: 600 }}>
                      <span>{f.name}</span>
                      <span>{f.cost}</span>
                    </div>
                    <div style={{ height: '6px', background: 'var(--color-bg-subtle)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: f.bar, height: '100%', background: i === 0 ? 'var(--color-warning-amber)' : 'var(--color-primary)' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={{ padding: '4.5rem 0', background: 'var(--color-bg-sidebar)', color: '#ffffff', textAlign: 'center' }}>
        <div className="container" style={{ maxWidth: '700px' }}>
          <h2 style={{ fontSize: '2.25rem', fontWeight: 700, marginBottom: '1rem', letterSpacing: '-0.02em' }}>
            Ready to evaluate GreenGrid for your facilities?
          </h2>
          <p style={{ fontSize: '1.0625rem', color: '#94a3b8', lineHeight: 1.6, marginBottom: '2rem' }}>
            Schedule an operational walk-through with our energy engineering team or explore the interactive dashboard shell directly.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/register" className="btn btn-primary" style={{ padding: '0.75rem 1.75rem', fontSize: '1rem' }}>
              Get Started
            </Link>
            <Link to="/app" className="btn btn-secondary" style={{ padding: '0.75rem 1.75rem', fontSize: '1rem' }}>
              Open Dashboard
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
