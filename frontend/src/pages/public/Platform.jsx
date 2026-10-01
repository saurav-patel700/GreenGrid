import React from 'react';
import { Link } from 'react-router-dom';
import {
  Gauge, Building2, BarChart3, CreditCard, Zap, Sun, ShieldAlert,
  FileText, Cpu, CheckCircle2, ArrowRight
} from 'lucide-react';
import ConsumptionChart from '../../components/charts/ConsumptionChart';
import PeakDemandChart from '../../components/charts/PeakDemandChart';
import FacilityBarChart from '../../components/charts/FacilityBarChart';
import { DEMO_FALLBACK_DATA } from '../../services/api';

import heroPlatform from '../../assets/hero-platform.jpg';

export default function Platform() {
  const chartData = DEMO_FALLBACK_DATA.charts.consumption_series;
  const peakData = DEMO_FALLBACK_DATA.charts.peak_demand_profile;
  const facilityData = DEMO_FALLBACK_DATA.charts.facility_breakdown;

  const modules = [
    { icon: Gauge, title: 'Energy Monitoring', desc: 'Real-time telemetry ingestion for grid electricity, submeter feeds, natural gas, and water.' },
    { icon: Building2, title: 'Facility Management', desc: 'Normalized Building Energy Intensity (EUI) tracking by square footage and facility operational profiles.' },
    { icon: BarChart3, title: 'Energy KPIs & Analytics', desc: 'Automated peak load calculation, Baselining, weather-normalized load profiles, and variance detection.' },
    { icon: CreditCard, title: 'Utility Billing & Cost Tracking', desc: 'Interval data reconciliation against utility tariffs, peak demand charges, and invoice discrepancy auditing.' },
    { icon: Zap, title: 'Demand Management', desc: 'Automated threshold alerts when demand approaches peak contract limits, supporting targeted load shedding.' },
    { icon: Sun, title: 'Renewable & Solar Generation', desc: 'On-site PV inverter monitoring, generation curve tracking, and self-consumption ratio analytics.' },
    { icon: Cpu, title: 'Battery Storage (BESS)', desc: 'Storage state-of-charge (SOC %) visibility, charge/discharge cycle tracking, and peak-shaving dispatch coordination.' },
    { icon: ShieldAlert, title: 'Alerts & Anomaly Detection', desc: 'Configurable anomaly rules for telemetry dropouts, over-demand conditions, and equipment phase imbalance.' },
    { icon: FileText, title: 'Reporting & Exports', desc: 'Standard energy performance reporting, carbon scope accounting support, and CSV/PDF export.' }
  ];

  return (
    <div>
      {/* Page Banner */}
      <section style={{
        position: 'relative',
        backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.70), rgba(15, 23, 42, 0.82)), url(${heroPlatform})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        padding: '4.5rem 0 4rem 0',
        color: '#ffffff',
        borderBottom: '1px solid var(--color-border)'
      }}>
        <div className="container" style={{ maxWidth: '800px', textAlign: 'center', position: 'relative', zIndex: 2 }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.03em', marginBottom: '1rem' }}>
            The GreenGrid EMIS Platform Architecture
          </h1>
          <p style={{ fontSize: '1.125rem', color: '#e2e8f0', lineHeight: 1.6 }}>
            A modular energy information system designed to ingest high-frequency meter feeds, normalize multi-building energy metrics, and deliver operational awareness.
          </p>
        </div>
      </section>

      {/* Module Overview Cards */}
      <section style={{ padding: '4rem 0', background: 'var(--color-bg-main)' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '4rem' }}>
            {modules.map((m, idx) => {
              const Icon = m.icon;
              return (
                <div key={idx} className="card" style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.875rem' }}>
                    <div style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', background: 'var(--color-bg-subtle)', color: 'var(--color-primary)' }}>
                      <Icon size={20} />
                    </div>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      {m.title}
                    </h3>
                  </div>
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                    {m.desc}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Interactive UI Previews */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
            
            {/* Feature 1: Time Series & Load Balancing */}
            <div className="card" style={{ padding: '1.75rem' }}>
              <div style={{ marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase' }}>
                  Component Preview - Live Module Shell
                </span>
                <h3 style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: '0.25rem 0' }}>
                  Multi-Source Energy Consumption & Solar PV Generation
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                  Visualizing grid power draw, rooftop solar generation, and battery discharge curves over a 24-hour interval.
                </p>
              </div>
              <ConsumptionChart data={chartData} />
            </div>

            {/* Feature 2: Peak Demand Monitoring */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '2rem' }}>
              <div className="card" style={{ padding: '1.75rem' }}>
                <div style={{ marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                    Peak Demand Profile vs Contract Threshold
                  </h3>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                    Monitors peak kW spikes against utility ratchet limits to prevent demand charges.
                  </p>
                </div>
                <PeakDemandChart data={peakData} />
              </div>

              <div className="card" style={{ padding: '1.75rem' }}>
                <div style={{ marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                    Facility Energy Use Intensity Comparison
                  </h3>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                    Comparing aggregate consumption across commercial, campus, and industrial sites.
                  </p>
                </div>
                <FacilityBarChart data={facilityData} />
              </div>
            </div>

          </div>

          <div style={{ textAlign: 'center', marginTop: '3.5rem' }}>
            <Link to="/app" className="btn btn-primary" style={{ padding: '0.75rem 2rem', fontSize: '1rem' }}>
              Launch Full Application Shell
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
