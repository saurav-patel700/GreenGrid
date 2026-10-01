import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  LayoutDashboard, Building2, Gauge, Activity,
  CreditCard, Sun, AlertTriangle, FileText, Cpu, Settings, ExternalLink, X, Users, ShieldCheck,
  TrendingUp, Sliders, Lightbulb, Server, Layers
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import BrandLogo from '../common/BrandLogo';

export default function AppSidebar({ mobileOpen, onClose }) {
  const { user, organization, role } = useAuth();

  const navItems = [
    { name: 'Overview', path: '/app', icon: LayoutDashboard, roles: ['admin', 'facility_manager', 'analyst', 'viewer'] },
    { name: 'Operations Center', path: '/app/operations', icon: Activity, roles: ['admin', 'facility_manager', 'analyst', 'viewer'] },
    { name: 'Facilities', path: '/app/facilities', icon: Building2, roles: ['admin', 'facility_manager', 'analyst', 'viewer'] },
    { name: 'Meters', path: '/app/meters', icon: Gauge, roles: ['admin', 'facility_manager', 'analyst', 'viewer'] },
    { name: 'Energy', path: '/app/energy', icon: Activity, roles: ['admin', 'facility_manager', 'analyst', 'viewer'] },
    { name: 'Costs & Billing', path: '/app/billing', icon: CreditCard, roles: ['admin', 'facility_manager', 'analyst', 'viewer'] },
    { name: 'Renewables', path: '/app/renewables', icon: Sun, roles: ['admin', 'facility_manager', 'analyst', 'viewer'] },
    { name: 'Carbon Intelligence', path: '/app/carbon', icon: Layers, roles: ['admin', 'facility_manager', 'analyst', 'viewer'] },
    { name: 'Forecasting', path: '/app/forecasting', icon: TrendingUp, roles: ['admin', 'facility_manager', 'analyst', 'viewer'] },
    { name: 'ML Performance', path: '/app/model-performance', icon: Cpu, roles: ['admin', 'facility_manager', 'analyst', 'viewer'] },
    { name: 'Demand Response', path: '/app/demand-response', icon: Sliders, roles: ['admin', 'facility_manager', 'analyst', 'viewer'] },
    { name: 'Optimization', path: '/app/optimization', icon: Lightbulb, roles: ['admin', 'facility_manager', 'analyst', 'viewer'] },
    { name: 'Devices & Control', path: '/app/devices', icon: Server, roles: ['admin', 'facility_manager', 'analyst', 'viewer'] },
    { name: 'Automation', path: '/app/automation', icon: ShieldCheck, roles: ['admin', 'facility_manager', 'analyst', 'viewer'] },
    { name: 'Scenario Simulator', path: '/app/scenarios', icon: Layers, roles: ['admin', 'facility_manager', 'analyst', 'viewer'] },
    { name: 'Alerts', path: '/app/alerts', icon: AlertTriangle, badge: 3, roles: ['admin', 'facility_manager', 'analyst', 'viewer'] },
    { name: 'Reports', path: '/app/reports', icon: FileText, roles: ['admin', 'facility_manager', 'analyst', 'viewer'] },
    { name: 'System Health', path: '/app/system-health', icon: Cpu, roles: ['admin'] },
    { name: 'Integrations', path: '/app/integrations', icon: Cpu, roles: ['admin', 'facility_manager'] },
    { name: 'User Management', path: '/app/settings/users', icon: Users, roles: ['admin'] },
    { name: 'Audit Log', path: '/app/settings/audit-log', icon: ShieldCheck, roles: ['admin'] },
    { name: 'Settings', path: '/app/settings/profile', icon: Settings, roles: ['admin', 'facility_manager', 'analyst', 'viewer'] },
  ];


  const permittedNavItems = navItems.filter(item => item.roles.includes(role));

  const sidebarContent = (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'var(--color-bg-sidebar)',
      color: '#94a3b8',
      width: '240px',
      borderRight: '1px solid #1e293b'
    }}>
      {/* Brand Header */}
      <div style={{
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1.25rem',
        borderBottom: '1px solid #1e293b'
      }}>
        <Link to="/app" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }} aria-label="GreenGrid Dashboard">
          <BrandLogo height="34px" showText={true} textColor="#ffffff" textSize="1.25rem" textWeight={800} />
        </Link>
        {onClose && (
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }} className="mobile-only">
            <X size={20} />
          </button>
        )}
      </div>

      {/* Navigation List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 0.75rem' }}>
        <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 0.5rem 0.5rem 0.5rem' }}>
          EMIS Modules
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {permittedNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/app'}
                onClick={onClose}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.625rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.875rem',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#ffffff' : '#94a3b8',
                  backgroundColor: isActive ? 'var(--color-bg-sidebar-hover)' : 'transparent',
                  borderLeft: isActive ? '3px solid var(--color-energy-green)' : '3px solid transparent',
                  transition: 'all 0.15s ease'
                })}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Icon size={18} />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span style={{
                    background: 'var(--color-warning-amber)',
                    color: '#ffffff',
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    padding: '0.125rem 0.4rem',
                    borderRadius: '10px'
                  }}>
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Bottom Organization Info */}
      <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid #1e293b', background: '#0b1120', fontSize: '0.75rem' }}>
        <div style={{ color: '#ffffff', fontWeight: 600, marginBottom: '0.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {organization?.name || 'Apex Global Enterprise'}
        </div>
        <div style={{ color: '#64748b', marginBottom: '0.625rem', textTransform: 'capitalize' }}>
          Role: {role.replace('_', ' ')}
        </div>
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', color: 'var(--color-primary)', fontWeight: 500 }}>
          Public Website <ExternalLink size={12} />
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="desktop-sidebar" style={{ position: 'fixed', top: 0, bottom: 0, left: 0, zIndex: 40 }}>
        {sidebarContent}
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex' }}>
          <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(2px)' }} />
          <div style={{ position: 'relative', zIndex: 101, height: '100%' }}>
            {sidebarContent}
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 767px) {
          .desktop-sidebar { display: none !important; }
        }
      `}</style>
    </>
  );
}
