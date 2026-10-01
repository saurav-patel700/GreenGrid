import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Clock } from 'lucide-react';

export default function StatusBadge({ status }) {
  const normalized = (status || '').toLowerCase();

  if (['online', 'optimal', 'active', 'paid'].includes(normalized)) {
    return (
      <span className="badge badge-green">
        <CheckCircle2 size={12} />
        {status}
      </span>
    );
  }

  if (['warning', 'high demand', 'pending'].includes(normalized)) {
    return (
      <span className="badge badge-amber">
        <AlertTriangle size={12} />
        {status}
      </span>
    );
  }

  if (['critical', 'offline', 'flagged'].includes(normalized)) {
    return (
      <span className="badge badge-red">
        <AlertCircle size={12} />
        {status}
      </span>
    );
  }

  return (
    <span className="badge badge-gray">
      <Clock size={12} />
      {status || 'Unknown'}
    </span>
  );
}
