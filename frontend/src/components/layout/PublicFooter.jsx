import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import BrandLogo from '../common/BrandLogo';

export default function PublicFooter() {
  return (
    <footer style={{ background: 'var(--color-bg-sidebar)', color: '#94a3b8', borderTop: '1px solid #1e293b', paddingTop: '3.5rem', paddingBottom: '2.5rem' }}>
      <div className="container">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '2.5rem', marginBottom: '3rem' }}>
          
          {/* Col 1: Brand info */}
          <div style={{ gridColumn: 'span 2' }}>
            <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', marginBottom: '1rem', textDecoration: 'none' }} aria-label="GreenGrid Home">
              <BrandLogo height="38px" showText={true} textColor="#ffffff" textSize="1.35rem" textWeight={800} />
            </Link>
            <p style={{ fontSize: '0.875rem', lineHeight: '1.6', color: '#94a3b8', maxWidth: '360px', marginBottom: '0.75rem' }}>
              Enterprise Smart Energy Management Information System (EMIS) for facility monitoring, utility cost control, and operational decarbonization.
            </p>
            <div style={{ fontSize: '0.8125rem', color: '#cbd5e1', marginBottom: '0.75rem', lineHeight: 1.5 }}>
              <div><strong>GreenGrid Energy Solutions</strong></div>
              <div>Sector 62, Noida, Uttar Pradesh, India – 201309</div>
              <div>Phone: +91 98765 43210</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#64748b' }}>
              <ShieldCheck size={14} color="var(--color-energy-green)" />
              SOC2 & ISO 50001 Architecture Standard Ready
            </div>
          </div>

          {/* Col 2: Platform */}
          <div>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
              Platform
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.625rem', fontSize: '0.875rem' }}>
              <li><Link to="/platform" style={{ color: '#94a3b8' }}>Energy Monitoring</Link></li>
              <li><Link to="/platform" style={{ color: '#94a3b8' }}>Facility Analytics</Link></li>
              <li><Link to="/platform" style={{ color: '#94a3b8' }}>Utility Billing & Costs</Link></li>
              <li><Link to="/platform" style={{ color: '#94a3b8' }}>Demand Management</Link></li>
              <li><Link to="/platform" style={{ color: '#94a3b8' }}>Renewables & Storage</Link></li>
            </ul>
          </div>

          {/* Col 3: Solutions */}
          <div>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
              Solutions
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.625rem', fontSize: '0.875rem' }}>
              <li><Link to="/solutions" style={{ color: '#94a3b8' }}>Commercial Buildings</Link></li>
              <li><Link to="/solutions" style={{ color: '#94a3b8' }}>Manufacturing Plants</Link></li>
              <li><Link to="/solutions" style={{ color: '#94a3b8' }}>University Campuses</Link></li>
              <li><Link to="/solutions" style={{ color: '#94a3b8' }}>Retail & Multi-site</Link></li>
              <li><Link to="/solutions" style={{ color: '#94a3b8' }}>Renewable Operators</Link></li>
            </ul>
          </div>

          {/* Col 4: Integrations & Resources */}
          <div>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
              Integrations & Resources
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.625rem', fontSize: '0.875rem' }}>
              <li><Link to="/integrations" style={{ color: '#94a3b8' }}>Hardware & Inverters</Link></li>
              <li><Link to="/integrations" style={{ color: '#94a3b8' }}>IoT & BMS Gateways</Link></li>
              <li><Link to="/resources" style={{ color: '#94a3b8' }}>EMIS Playbooks</Link></li>
              <li><Link to="/resources" style={{ color: '#94a3b8' }}>Peak Shaving Guide</Link></li>
            </ul>
          </div>

          {/* Col 5: Company & Legal */}
          <div>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
              Company
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.625rem', fontSize: '0.875rem' }}>
              <li><Link to="/about" style={{ color: '#94a3b8' }}>About GreenGrid</Link></li>
              <li><Link to="/contact" style={{ color: '#94a3b8' }}>Contact Operations</Link></li>
              <li><Link to="/privacy" style={{ color: '#94a3b8' }}>Privacy Policy</Link></li>
              <li><Link to="/terms" style={{ color: '#94a3b8' }}>Terms & Conditions</Link></li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div style={{ borderTop: '1px solid #1e293b', paddingTop: '1.5rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', fontSize: '0.8125rem', color: '#64748b' }}>
          <div>
            © {new Date().getFullYear()} GreenGrid Energy Intelligence Systems Inc. All rights reserved.
          </div>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <Link to="/privacy" style={{ color: '#64748b' }}>Privacy Policy</Link>
            <Link to="/terms" style={{ color: '#64748b' }}>Terms & Conditions</Link>
            <Link to="/contact" style={{ color: '#64748b' }}>Support</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
