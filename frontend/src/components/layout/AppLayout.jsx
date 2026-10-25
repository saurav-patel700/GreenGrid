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
