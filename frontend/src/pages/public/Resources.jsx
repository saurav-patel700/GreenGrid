import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, Download, BookOpen, Layers } from 'lucide-react';

import heroResources from '../../assets/hero-resources.jpg';

export default function Resources() {
  const guides = [
    { title: 'EMIS Implementation Framework Guide', category: 'Operational Playbook', readTime: '12 min read', desc: 'Standard operating procedure for deploying submetering, telemetry gateways, and baselining across commercial portfolios.' },
    { title: 'Peak Demand Reduction Strategy', category: 'Energy Engineering', readTime: '15 min read', desc: 'Technical tactics for identifying load spikes, configuring ratchet limits, and scheduling battery storage dispatch.' },
    { title: 'Solar PV & BESS Storage Integration Protocol', category: 'Clean Energy', readTime: '10 min read', desc: 'Best practices for monitoring on-site inverter performance, self-consumption ratio, and state-of-charge degradation.' },
    { title: 'Energy Use Intensity (EUI) Benchmarking Method', category: 'Analytics Framework', readTime: '8 min read', desc: 'Weather-normalized kWh per square foot calculations for multi-building corporate campuses.' }
  ];

  return (
    <div>
      <section style={{
        position: 'relative',
        backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.70), rgba(15, 23, 42, 0.82)), url(${heroResources})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        padding: '4.5rem 0 4rem 0',
        color: '#ffffff',
        borderBottom: '1px solid var(--color-border)'
      }}>
        <div className="container" style={{ maxWidth: '800px', textAlign: 'center', position: 'relative', zIndex: 2 }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.03em', marginBottom: '1rem' }}>
            Energy Intelligence Resources & Technical Playbooks
          </h1>
          <p style={{ fontSize: '1.125rem', color: '#e2e8f0', lineHeight: 1.6 }}>
            Practical engineering guides, benchmarking frameworks, and implementation documentation for facility managers and sustainability teams.
          </p>
        </div>
      </section>

      <section style={{ padding: '4rem 0', background: 'var(--color-bg-main)' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.75rem' }}>
            {guides.map((g, i) => (
              <div key={i} className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
                    <span className="badge badge-blue">{g.category}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{g.readTime}</span>
                  </div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '0.625rem' }}>
                    {g.title}
                  </h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: 1.5, marginBottom: '1.5rem' }}>
                    {g.desc}
                  </p>
                </div>
                <div>
                  <button className="btn btn-secondary btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
                    <FileText size={14} />
                    Read Framework Documentation
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
