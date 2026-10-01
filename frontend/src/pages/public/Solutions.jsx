import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, Factory, GraduationCap, Store, Sun, Users, CheckCircle2, ArrowRight } from 'lucide-react';
import heroSolutions from '../../assets/hero-solutions.jpg';

export default function Solutions() {
  const solutions = [
    {
      icon: Building2,
      title: 'Commercial Buildings & Office Towers',
      subtitle: 'HVAC optimization, submetering, and occupancy load alignment.',
      useCases: [
        'Submetering tenant spaces and central HVAC chiller loops',
        'Identifying off-hours baseload leakage and vampire energy draws',
        'Reconciling building management system (BMS) setpoints against power draw'
      ]
    },
    {
      icon: Factory,
      title: 'Manufacturing & Industrial Facilities',
      subtitle: 'Peak demand capping, heavy motor loads, and continuous line telemetry.',
      useCases: [
        'Monitoring high-voltage switchgear and heavy equipment power quality',
        'Preventing peak demand ratchet charges during facility start-up cycles',
        'Tracking process energy intensity per production batch'
      ]
    },
    {
      icon: GraduationCap,
      title: 'University & Corporate Campuses',
      subtitle: 'Multi-building benchmarking, central plant monitoring, and microgrids.',
      useCases: [
        'Central district heating/cooling and thermal storage tracking',
        'Building Energy Use Intensity (EUI) benchmarking across campus structures',
        'Coordinating campus solar PV generation with building baseloads'
      ]
    },
    {
      icon: Store,
      title: 'Retail & Multi-Site Logistics Networks',
      subtitle: 'Portfolio-wide energy auditing and normalized site performance.',
      useCases: [
        'Automated utility bill scraping and multi-provider tariff comparison',
        'Comparing site energy performance across different climate zones',
        'Refrigeration and lighting schedule compliance verification'
      ]
    },
    {
      icon: Sun,
      title: 'Renewable Energy & BESS Storage Operators',
      subtitle: 'Generation forecasting, battery state-of-charge, and peak-shaving dispatch.',
      useCases: [
        'Monitoring solar PV inverter performance and degradation factors',
        'Automating battery storage (BESS) charge/discharge schedules',
        'Tracking self-consumption ratio and grid feed-in metrics'
      ]
    },
    {
      icon: Users,
      title: 'Facility & Operations Teams',
      subtitle: 'Role-based visibility, automated reporting, and anomaly alerts.',
      useCases: [
        'Configurable alert notifications for peak demand and telemetry offline states',
        'Standardized monthly executive utility summaries and export files',
        'Cross-departmental collaboration between sustainability and engineering'
      ]
    }
  ];

  return (
    <div>
      <section style={{
        position: 'relative',
        backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.70), rgba(15, 23, 42, 0.82)), url(${heroSolutions})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        padding: '4.5rem 0 4rem 0',
        color: '#ffffff',
        borderBottom: '1px solid var(--color-border)'
      }}>
        <div className="container" style={{ maxWidth: '800px', textAlign: 'center', position: 'relative', zIndex: 2 }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.03em', marginBottom: '1rem' }}>
            Tailored Energy Solutions by Sector
          </h1>
          <p style={{ fontSize: '1.125rem', color: '#e2e8f0', lineHeight: 1.6 }}>
            GreenGrid delivers practical operational workflows designed for the specific metering, billing, and equipment challenges of your facility type.
          </p>
        </div>
      </section>

      <section style={{ padding: '4rem 0', background: 'var(--color-bg-main)' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '2rem' }}>
            {solutions.map((sol, i) => {
              const Icon = sol.icon;
              return (
                <div key={i} className="card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                      <div style={{ padding: '0.625rem', borderRadius: 'var(--radius-md)', background: 'var(--color-bg-subtle)', color: 'var(--color-primary)' }}>
                        <Icon size={24} />
                      </div>
                      <div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                          {sol.title}
                        </h3>
                      </div>
                    </div>
                    <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '1.25rem', fontWeight: 500 }}>
                      {sol.subtitle}
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', marginBottom: '1.5rem' }}>
                      {sol.useCases.map((uc, uidx) => (
                        <div key={uidx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                          <CheckCircle2 size={16} color="var(--color-energy-green)" style={{ marginTop: '2px', flexShrink: 0 }} />
                          <span>{uc}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Link to="/contact" className="btn btn-secondary btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
                      Discuss your operational use case
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ background: '#ffffff', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '2.5rem', marginTop: '4rem', textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem' }}>
              Have a custom facility or microgrid setup?
            </h3>
            <p style={{ fontSize: '0.9375rem', color: 'var(--color-text-secondary)', maxWidth: '600px', margin: '0 auto 1.5rem auto' }}>
              GreenGrid architecture supports custom Modbus/BACnet telemetry mappings and API ingestion endpoints for proprietary building infrastructure.
            </p>
            <Link to="/contact" className="btn btn-primary">
              Contact Engineering Team
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
