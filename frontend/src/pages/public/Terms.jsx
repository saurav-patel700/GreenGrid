import React from 'react';
import { FileText, AlertCircle } from 'lucide-react';

export default function Terms() {
  return (
    <div>
      <section style={{ background: '#ffffff', borderBottom: '1px solid var(--color-border)', padding: '3rem 0' }}>
        <div className="container" style={{ maxWidth: '800px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div style={{ padding: '0.4rem', background: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-sm)', color: 'var(--color-primary)' }}>
              <FileText size={20} />
            </div>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Legal Documentation
            </span>
          </div>

          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
            Terms and Conditions
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            Effective Date: September 29, 2026 | Platform Baseline
          </p>
        </div>
      </section>

      <section style={{ padding: '3.5rem 0', background: 'var(--color-bg-main)' }}>
        <div className="container" style={{ maxWidth: '800px' }}>

          {/* Legal Review Disclaimer Notice */}
          <div style={{ background: '#fffbebf', border: '1px solid #fde68a', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '2rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
            <AlertCircle size={20} color="var(--color-warning-amber)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '0.8125rem', color: '#92400e', lineHeight: 1.5 }}>
              <strong>Notice:</strong> These Terms and Conditions govern access to the GreenGrid Energy Management Platform and are subject to formal legal review before commercial contract execution.
            </div>
          </div>

          <div className="card" style={{ padding: '2.5rem', lineHeight: 1.7, fontSize: '0.9375rem', color: 'var(--color-text-secondary)' }}>
            
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '0.75rem' }}>
              1. Platform Purpose & Scope
            </h2>
            <p style={{ marginBottom: '1.25rem' }}>
              GreenGrid provides software tools for monitoring building energy consumption, peak demand tracking, utility invoice logging, and renewable generation analysis. The platform serves as an information system for operational awareness.
            </p>

            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '0.75rem' }}>
              2. User Obligations & Meter Connections
            </h2>
            <p style={{ marginBottom: '1.25rem' }}>
              Subscribing organizations are responsible for ensuring that all hardware meters, gateways, and API keys integrated into the platform comply with local electrical codes, utility regulations, and network access policies.
            </p>

            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '0.75rem' }}>
              3. Service Availability & Telemetry Accuracy
            </h2>
            <p style={{ marginBottom: '1.25rem' }}>
              While GreenGrid strives for continuous REST API uptime and accurate data parsing, telemetry from third-party utility meters or local hardware may experience occasional carrier or network disruptions. Peak demand alerts serve as informational decision support.
            </p>

            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '0.75rem' }}>
              4. Intellectual Property
            </h2>
            <p style={{ marginBottom: '1.25rem' }}>
              All software components, visual layouts, API schemas, and documentation related to GreenGrid remain the intellectual property of GreenGrid Energy Intelligence Systems Inc. Subscribing entities retain full ownership of raw energy readings and facility metadata.
            </p>

            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '0.75rem' }}>
              5. Governing Law
            </h2>
            <p>
              These preliminary terms are governed by the laws of Uttar Pradesh, India, without regard to conflict of law principles.
            </p>

          </div>
        </div>
      </section>
    </div>
  );
}
