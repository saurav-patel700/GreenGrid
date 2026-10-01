import React from 'react';
import { FileText, Download, Calendar } from 'lucide-react';
import Breadcrumbs from '../../components/common/Breadcrumbs';

export default function Reports() {
  const reports = [
    { title: 'Monthly Executive Energy & Utility Summary (August 2026)', date: '2026-09-01', size: '2.4 MB', type: 'PDF Summary' },
    { title: 'Peak Demand & Tariff Ratchet Analysis (Q2 2026)', date: '2026-07-05', size: '4.8 MB', type: 'Excel / CSV' },
    { title: 'Facility Energy Use Intensity (EUI) Benchmarking Report', date: '2026-08-15', size: '1.8 MB', type: 'PDF Report' },
    { title: 'On-site Solar PV Generation & Offset Audit', date: '2026-09-10', size: '3.1 MB', type: 'PDF Report' }
  ];

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Reports & Exports' }]} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            Energy Reports & Data Exports
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            Standard monthly performance reports, peak demand audits, and interval CSV dataset files.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
        {reports.map((r, i) => (
          <div key={i} className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span className="badge badge-gray">{r.type}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{r.date}</span>
              </div>
              <h3 style={{ fontSize: '1.0625rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.5rem' }}>
                {r.title}
              </h3>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '1.25rem' }}>
                File Size: {r.size}
              </div>
            </div>

            <button className="btn btn-secondary btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
              <Download size={14} />
              Download Report File
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
