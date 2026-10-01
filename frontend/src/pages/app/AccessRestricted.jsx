import React from 'react';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AccessRestricted({ requiredRoles = [], currentRole = 'viewer' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center', padding: '2rem' }}>
      <div style={{ padding: '1rem', borderRadius: '50%', background: 'var(--color-danger-red-bg)', color: 'var(--color-danger-red)', marginBottom: '1.25rem' }}>
        <ShieldAlert size={40} />
      </div>

      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '0.5rem' }}>
        Access Restricted
      </h1>

      <p style={{ fontSize: '0.9375rem', color: 'var(--color-text-secondary)', maxWidth: '480px', lineHeight: 1.6, marginBottom: '1.5rem' }}>
        Your account role <strong>({currentRole})</strong> does not have permission to access this administration view. This action requires <strong>{requiredRoles.join(' or ')}</strong> privileges.
      </p>

      <Link to="/app" className="btn btn-secondary">
        <ArrowLeft size={16} />
        Return to Energy Overview
      </Link>
    </div>
  );
}
