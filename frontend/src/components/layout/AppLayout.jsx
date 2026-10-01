import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import AppSidebar from './AppSidebar';
import AppTopbar from './AppTopbar';
import { fetchFacilities } from '../../services/api';

export default function AppLayout() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [facilities, setFacilities] = useState([]);
  const [selectedFacility, setSelectedFacility] = useState('all');
  const [selectedRange, setSelectedRange] = useState('7d');

  useEffect(() => {
    fetchFacilities().then(data => {
      if (Array.isArray(data)) setFacilities(data);
    });
  }, []);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-bg-main)' }}>
      {/* Sidebar */}
      <AppSidebar
        mobileOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
      />

      {/* Main Container */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }} className="main-content-wrapper">
        <AppTopbar
          facilities={facilities}
          selectedFacility={selectedFacility}
          onFacilityChange={setSelectedFacility}
          selectedRange={selectedRange}
          onRangeChange={setSelectedRange}
          onToggleMobileSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        />

        <main style={{ flex: 1, padding: '1.5rem 1.75rem', overflowY: 'auto' }}>
          {/* Demo Data Banner Warning - Required by Prompt: Clearly mark demo data */}
          <div style={{
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            borderRadius: 'var(--radius-md)',
            padding: '0.625rem 1rem',
            marginBottom: '1.25rem',
            fontSize: '0.8125rem',
            color: '#065f46',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <strong>System Active:</strong> Telemetry Analytics Engine, Quality Engine, Anomaly Detection & IoT Ingestion Active.
            </div>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600, background: '#d1fae5', padding: '0.125rem 0.5rem', borderRadius: '4px' }}>
              Analytics Engine
            </span>
          </div>

          <Outlet context={{ selectedFacility, selectedRange, facilities }} />
        </main>
      </div>

      <style>{`
        @media (min-width: 768px) {
          .main-content-wrapper {
            margin-left: 240px;
          }
        }
      `}</style>
    </div>
  );
}
