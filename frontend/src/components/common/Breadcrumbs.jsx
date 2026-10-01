import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Breadcrumbs({ items = [] }) {
  return (
    <nav style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
      <Link to="/app" style={{ display: 'flex', alignItems: 'center', color: 'var(--color-text-muted)', transition: 'color 0.15s' }}>
        <Home size={14} />
      </Link>
      {items.map((item, idx) => (
        <React.Fragment key={idx}>
          <ChevronRight size={14} color="var(--color-text-muted)" />
          {item.path ? (
            <Link to={item.path} style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}>
              {item.label}
            </Link>
          ) : (
            <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>
              {item.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
