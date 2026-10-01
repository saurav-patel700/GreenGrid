import React from 'react';
import { Shield, AlertCircle } from 'lucide-react';

export default function Privacy() {
  return (
    <div>
      <section style={{ background: '#ffffff', borderBottom: '1px solid var(--color-border)', padding: '3rem 0' }}>
        <div className="container" style={{ maxWidth: '800px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div style={{ padding: '0.4rem', background: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-sm)', color: 'var(--color-primary)' }}>
              <Shield size={20} />
            </div>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Legal Documentation
            </span>
          </div>

          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
            Privacy Policy
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            Effective Date: September 29, 2026 | Last Updated: Baseline Release
          </p>
        </div>
      </section>

      <section style={{ padding: '3.5rem 0', background: 'var(--color-bg-main)' }}>
        <div className="container" style={{ maxWidth: '800px' }}>
          
          {/* Legal Review Disclaimer Notice */}
          <div style={{ background: '#fffbebf', border: '1px solid #fde68a', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '2rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
            <AlertCircle size={20} color="var(--color-warning-amber)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '0.8125rem', color: '#92400e', lineHeight: 1.5 }}>
              <strong>Notice:</strong> This Privacy Policy is a baseline operational draft for the GreenGrid Energy Intelligence Platform and is subject to formal legal review prior to commercial production onboarding.
            </div>
          </div>

          <div className="card" style={{ padding: '2.5rem', lineHeight: 1.7, fontSize: '0.9375rem', color: 'var(--color-text-secondary)' }}>
            
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '0.75rem' }}>
              1. Overview of Data Collection
            </h2>
            <p style={{ marginBottom: '1.25rem' }}>
              GreenGrid ("the Platform") processes facility operational data, meter readings, utility billing records, and administrative user account credentials provided by subscribing organizations. We are committed to protecting the privacy and security of telemetry ingested through our REST API endpoints.
            </p>

            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '0.75rem' }}>
              2. Types of Telemetry Processed
            </h2>
            <ul style={{ paddingLeft: '1.25rem', marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li><strong>Meter Interval Data:</strong> Consumption (kWh), Peak Demand (kW), voltage levels, and timestamped submeter readings.</li>
              <li><strong>Facility Metadata:</strong> Building addresses, square footage, baseline targets, and tariff structures.</li>
              <li><strong>User Administrative Data:</strong> Names, work email addresses, role permissions, and system access logs.</li>
            </ul>

            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '0.75rem' }}>
              3. Data Usage & Confidentiality
            </h2>
            <p style={{ marginBottom: '1.25rem' }}>
              Customer telemetry is strictly used to render energy dashboards, generate peak load alerts, calculate cost estimates, and produce compliance export files. We do not sell or monetize customer energy dataset feeds to third-party ad networks.
            </p>

            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '0.75rem' }}>
              4. Data Retention & Security
            </h2>
            <p style={{ marginBottom: '1.25rem' }}>
              High-frequency interval data is encrypted in transit via TLS and stored using standards compliant with industrial IoT security guidelines. Access to customer facility data is constrained via role-based access control (RBAC).
            </p>

            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '0.75rem' }}>
              5. Contacting Privacy Administration
            </h2>
            <p>
              For questions concerning data privacy, telemetry retention schedules, or export requests, please contact privacy@greengrid.example.
            </p>

          </div>
        </div>
      </section>
    </div>
  );
}
