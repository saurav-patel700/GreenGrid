import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Zap, Menu, X, ArrowRight } from 'lucide-react';

import BrandLogo from '../common/BrandLogo';

export default function PublicHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { name: 'Platform', path: '/platform' },
    { name: 'Solutions', path: '/solutions' },
    { name: 'Integrations', path: '/integrations' },
    { name: 'Resources', path: '/resources' },
    { name: 'About', path: '/about' },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <header style={{
      background: '#ffffff',
      borderBottom: '1px solid var(--color-border)',
      position: 'sticky',
      top: 0,
      zIndex: 50
    }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '70px' }}>
        {/* Brand Logo & Title */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }} aria-label="GreenGrid Home">
          <BrandLogo height="38px" showText={true} textColor="var(--color-text-primary)" textSize="1.5rem" textWeight={800} />
        </Link>

        {/* Desktop Nav */}
        <nav style={{ display: 'none', gap: '1.75rem', alignItems: 'center', mdDisplay: 'flex' }} className="desktop-nav">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              style={{
                fontSize: '0.9375rem',
                fontWeight: isActive(link.path) ? 600 : 500,
                color: isActive(link.path) ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                transition: 'color 0.15s ease'
              }}
            >
              {link.name}
            </Link>
          ))}
        </nav>

        {/* Action Buttons */}
        <div style={{ display: 'none', alignItems: 'center', gap: '0.75rem' }} className="desktop-actions">
          <Link to="/app" className="btn btn-secondary">
            Sign in
          </Link>
          <Link to="/contact" className="btn btn-primary">
            Request a demo
            <ArrowRight size={15} />
          </Link>
        </div>

        {/* Mobile Hamburger toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{ background: 'none', border: 'none', color: 'var(--color-text-primary)', cursor: 'pointer' }}
          className="mobile-toggle"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div style={{ background: '#ffffff', borderBottom: '1px solid var(--color-border)', padding: '1rem 1.5rem 1.5rem 1.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  fontSize: '1rem',
                  fontWeight: isActive(link.path) ? 600 : 500,
                  color: isActive(link.path) ? 'var(--color-primary)' : 'var(--color-text-primary)'
                }}
              >
                {link.name}
              </Link>
            ))}
            <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '0.5rem 0' }} />
            <Link to="/app" className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
              Sign in
            </Link>
            <Link to="/contact" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              Request a demo
            </Link>
          </div>
        </div>
      )}

      <style>{`
        @media (min-width: 768px) {
          .desktop-nav { display: flex !important; }
          .desktop-actions { display: flex !important; }
          .mobile-toggle { display: none !important; }
        }
      `}</style>
    </header>
  );
}
