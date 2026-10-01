import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Target, Award, Cpu, ArrowRight } from 'lucide-react';

import heroAbout from '../../assets/hero-about.jpg';

export default function About() {
  return (
    <div>
      <section style={{
        position: 'relative',
        backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.70), rgba(15, 23, 42, 0.82)), url(${heroAbout})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        padding: '4.5rem 0 4rem 0',
        color: '#ffffff',
        borderBottom: '1px solid var(--color-border)'
      }}>
        <div className="container" style={{ maxWidth: '800px', textAlign: 'center', position: 'relative', zIndex: 2 }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.03em', marginBottom: '1rem' }}>
            About GreenGrid
          </h1>
          <p style={{ fontSize: '1.125rem', color: '#e2e8f0', lineHeight: 1.6 }}>
            GreenGrid develops practical energy intelligence software engineered for facility managers, energy analysts, operations teams, and sustainability leaders.
          </p>
        </div>
      </section>

      <section style={{ padding: '4rem 0', background: 'var(--color-bg-main)' }}>
        <div className="container" style={{ maxWidth: '900px' }}>
          <div className="card" style={{ padding: '2.5rem', marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '1rem' }}>
              Our Product Positioning
            </h2>
            <p style={{ fontSize: '1rem', color: 'var(--color-text-secondary)', lineHeight: 1.7, marginBottom: '1.25rem' }}>
              Energy management in complex organizations often suffers from fragmented data: utility bills live in accounting, BMS submeters stay trapped in mechanical rooms, and solar inverters sit on isolated vendor portals.
            </p>
            <p style={{ fontSize: '1rem', color: 'var(--color-text-secondary)', lineHeight: 1.7 }}>
              GreenGrid bridges these siloes by providing an integrated Energy Management Information System (EMIS) shell that normalizes time-series telemetry into clear, high-density decision metrics.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
            <div className="card" style={{ padding: '1.5rem' }}>
              <Target size={24} color="var(--color-primary)" style={{ marginBottom: '0.75rem' }} />
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem' }}>Accuracy & Precision</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                Every metric is grounded in verifiable meter telemetry and standardized tariff rates without synthetic extrapolation.
              </p>
            </div>

            <div className="card" style={{ padding: '1.5rem' }}>
              <Cpu size={24} color="var(--color-energy-green)" style={{ marginBottom: '0.75rem' }} />
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem' }}>Open Architecture</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                Built on REST API specifications, allowing seamless integration with custom building hardware and IoT gateways.
              </p>
            </div>

            <div className="card" style={{ padding: '1.5rem' }}>
              <Shield size={24} color="var(--color-warning-amber)" style={{ marginBottom: '0.75rem' }} />
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem' }}>Enterprise Standards</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                Designed with role-based access control, data privacy, and security controls required for production deployment.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
