import React, { useState, useEffect, useRef } from 'react';
import { Bell, Menu, User, ShieldAlert, LogOut, Settings, Wifi, Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import FacilitySelector from '../common/FacilitySelector';
import DateRangePicker from '../common/DateRangePicker';
import { useAuth } from '../../context/AuthContext';
import { useWebSocket } from '../../context/WebSocketContext';
import { globalSearchApi } from '../../services/api';

export default function AppTopbar({
  facilities,
  selectedFacility,
  onFacilityChange,
  selectedRange,
  onRangeChange,
  onToggleMobileSidebar
}) {
  const navigate = useNavigate();
  const { user, organization, logout } = useAuth();
  const { connectionStatus } = useWebSocket();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Global Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchContainerRef = useRef(null);

  const notificationsList = [
    { id: 1, title: "Eastside Manufacturing Demand Alert", time: "14 mins ago", unread: true },
    { id: 2, title: "Solar Inverter telemetry offline", time: "2 hours ago", unread: true }
  ];

  const getInitials = () => {
    if (!user) return 'AV';
    if (user.first_name && user.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    }
    return user.username ? user.username.substring(0, 2).toUpperCase() : 'US';
  };

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      setShowSearchResults(false);
      return;
    }

    const handler = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await globalSearchApi(searchQuery);
        setSearchResults(res);
        setShowSearchResults(true);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectResult = (path) => {
    setShowSearchResults(false);
    setSearchQuery('');
    navigate(path);
  };

  return (
    <header style={{
      height: '64px',
      background: '#ffffff',
      borderBottom: '1px solid var(--color-border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 1.5rem',
      position: 'sticky',
      top: 0,
      zIndex: 30
    }}>
      {/* Left controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button
          onClick={onToggleMobileSidebar}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-primary)' }}
          className="mobile-only-btn"
        >
          <Menu size={22} />
        </button>

        <FacilitySelector
          facilities={facilities}
          selectedFacility={selectedFacility}
          onChange={onFacilityChange}
        />

        <div className="desktop-topbar-controls" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <DateRangePicker
            selectedRange={selectedRange}
            onChange={onRangeChange}
          />
        </div>
      </div>

      {/* Center Global Search */}
      <div ref={searchContainerRef} style={{ position: 'relative', width: '280px', margin: '0 1rem' }} className="desktop-search-bar">
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: 'var(--color-bg-subtle)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: '0.375rem 0.75rem',
          fontSize: '0.8125rem'
        }}>
          <Search size={16} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search facilities, meters, devices..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => { if (searchResults) setShowSearchResults(true); }}
            style={{
              border: 'none',
              background: 'transparent',
              outline: 'none',
              width: '100%',
              fontSize: '0.8125rem',
              color: 'var(--color-text-primary)'
            }}
          />
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(''); setSearchResults(null); setShowSearchResults(false); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: 'var(--color-text-muted)' }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Floating Search Results Dropdown */}
        {showSearchResults && searchResults && (
          <div style={{
            position: 'absolute',
            top: '44px',
            left: 0,
            right: 0,
            width: '360px',
            background: '#ffffff',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 200,
            maxHeight: '400px',
            overflowY: 'auto',
            padding: '0.75rem'
          }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
              SEARCH RESULTS ({searchResults.total_results || 0})
            </div>

            {searchResults.total_results === 0 ? (
              <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', padding: '0.5rem 0', textAlign: 'center' }}>
                No matching records found.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {/* Facilities */}
                {searchResults.results.facilities?.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-primary)', marginBottom: '0.25rem' }}>Facilities</div>
                    {searchResults.results.facilities.map(f => (
                      <div
                        key={`fac-${f.id}`}
                        onClick={() => handleSelectResult(f.link)}
                        style={{ padding: '0.375rem 0.5rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8125rem', display: 'flex', justifyContent: 'space-between', transition: 'background 0.15s' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-bg-subtle)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{f.name}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{f.type}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Meters */}
                {searchResults.results.meters?.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-primary)', marginBottom: '0.25rem' }}>Meters</div>
                    {searchResults.results.meters.map(m => (
                      <div
                        key={`m-${m.id}`}
                        onClick={() => handleSelectResult(m.link)}
                        style={{ padding: '0.375rem 0.5rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8125rem', display: 'flex', justifyContent: 'space-between', transition: 'background 0.15s' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-bg-subtle)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{m.name} ({m.meter_id})</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{m.facility_name}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Devices */}
                {searchResults.results.devices?.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-primary)', marginBottom: '0.25rem' }}>Devices</div>
                    {searchResults.results.devices.map(d => (
                      <div
                        key={`d-${d.id}`}
                        onClick={() => handleSelectResult(d.link)}
                        style={{ padding: '0.375rem 0.5rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8125rem', display: 'flex', justifyContent: 'space-between', transition: 'background 0.15s' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-bg-subtle)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{d.name}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{d.protocol} ({d.status})</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Alerts */}
                {searchResults.results.alerts?.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-primary)', marginBottom: '0.25rem' }}>Alerts</div>
                    {searchResults.results.alerts.map(a => (
                      <div
                        key={`a-${a.id}`}
                        onClick={() => handleSelectResult(a.link)}
                        style={{ padding: '0.375rem 0.5rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8125rem', display: 'flex', justifyContent: 'space-between', transition: 'background 0.15s' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-bg-subtle)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{a.title}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-warning-amber)' }}>{a.severity}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Utility Bills */}
                {searchResults.results.utility_bills?.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-primary)', marginBottom: '0.25rem' }}>Utility Bills</div>
                    {searchResults.results.utility_bills.map(b => (
                      <div
                        key={`b-${b.id}`}
                        onClick={() => handleSelectResult(b.link)}
                        style={{ padding: '0.375rem 0.5rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8125rem', display: 'flex', justifyContent: 'space-between', transition: 'background 0.15s' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-bg-subtle)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>Invoice #{b.invoice_number}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>₹{b.total_amount.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
        
        {/* Real-time WebSocket connection indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', fontWeight: 600, color: connectionStatus === 'Connected' ? 'var(--color-energy-green)' : 'var(--color-warning-amber)', background: 'var(--color-bg-subtle)', padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-sm)' }}>
          <Wifi size={12} />
          <span>{connectionStatus}</span>
        </div>

        {/* Notification Bell */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => { setShowNotifications(!showNotifications); setShowUserMenu(false); }}
            style={{
              background: 'var(--color-bg-subtle)',
              border: '1px solid var(--color-border)',
              padding: '0.5rem',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-text-secondary)',
              cursor: 'pointer',
              position: 'relative',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <Bell size={18} />
            <span style={{
              position: 'absolute',
              top: '4px',
              right: '4px',
              width: '8px',
              height: '8px',
              background: 'var(--color-danger-red)',
              borderRadius: '50%'
            }} />
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div style={{
              position: 'absolute',
              right: 0,
              top: '48px',
              width: '320px',
              background: '#ffffff',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-lg)',
              zIndex: 100,
              padding: '0.75rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.5rem', marginBottom: '0.5rem', borderBottom: '1px solid var(--color-border)' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>System Notifications</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {notificationsList.map(n => (
                  <div key={n.id} style={{
                    padding: '0.5rem',
                    borderRadius: 'var(--radius-sm)',
                    background: n.unread ? 'var(--color-info-blue-bg)' : 'transparent',
                    fontSize: '0.8125rem'
                  }}>
                    <div style={{ fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.125rem' }}>{n.title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{n.time}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Badge */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifications(false); }}
            style={{
              background: '#ffffff',
              border: '1px solid var(--color-border)',
              padding: '0.375rem 0.75rem',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer'
            }}
          >
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'var(--color-bg-sidebar)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              fontWeight: 700
            }}>
              {getInitials()}
            </div>
            <div style={{ textAlign: 'left', display: 'none', mdDisplay: 'block' }} className="desktop-user-text">
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                {user?.full_name || user?.email}
              </div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>
                {user?.role ? user.role.replace('_', ' ') : 'Manager'}
              </div>
            </div>
          </button>

          {/* User Dropdown */}
          {showUserMenu && (
            <div style={{
              position: 'absolute',
              right: 0,
              top: '48px',
              width: '220px',
              background: '#ffffff',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-lg)',
              zIndex: 100,
              padding: '0.5rem'
            }}>
              <div style={{ padding: '0.5rem', borderBottom: '1px solid var(--color-border)', marginBottom: '0.25rem' }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{user?.full_name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{user?.email}</div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--color-primary)', fontWeight: 600, marginTop: '0.25rem' }}>
                  {organization?.name}
                </div>
              </div>
              <a href="/app/settings/profile" style={{ display: 'block', fontSize: '0.8125rem', color: 'var(--color-text-primary)', padding: '0.5rem', borderRadius: '4px' }}>
                Profile Settings
              </a>
              {user?.role === 'admin' && (
                <a href="/app/settings/users" style={{ display: 'block', fontSize: '0.8125rem', color: 'var(--color-text-primary)', padding: '0.5rem', borderRadius: '4px' }}>
                  Manage Users & Roles
                </a>
              )}
              <div
                onClick={() => logout()}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: 'var(--color-danger-red)', padding: '0.5rem', borderTop: '1px solid var(--color-border)', marginTop: '0.25rem', cursor: 'pointer', borderRadius: '4px' }}
              >
                <LogOut size={14} />
                Sign out
              </div>
            </div>
          )}
        </div>

      </div>

      <style>{`
        @media (min-width: 768px) {
          .mobile-only-btn { display: none !important; }
          .desktop-user-text { display: block !important; }
        }
      `}</style>
    </header>
  );
}
