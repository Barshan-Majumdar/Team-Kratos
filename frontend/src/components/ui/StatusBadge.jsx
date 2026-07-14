import React from 'react';
import { CheckCircle2, Clock, Plane, XCircle, AlertCircle } from 'lucide-react';

export function StatusBadge({ status, className = '' }) {
  const normalizedStatus = status?.toLowerCase() || '';

  let colorClass = '';
  let Icon = null;
  let label = status;

  if (['present', 'approved', 'checked-in'].includes(normalizedStatus)) {
    colorClass = 'text-success bg-success/10 border-success/20';
    Icon = CheckCircle2;
  } else if (['absent', 'pending'].includes(normalizedStatus)) {
    colorClass = 'text-warning bg-warning/10 border-warning/20';
    Icon = Clock;
  } else if (normalizedStatus.includes('leave')) {
    colorClass = 'text-text-tertiary bg-surface-card border-border-default';
    Icon = Plane;
  } else if (['rejected'].includes(normalizedStatus)) {
    colorClass = 'text-danger bg-danger/10 border-danger/20';
    Icon = XCircle;
  } else {
    colorClass = 'text-text-secondary bg-surface-card border-border-default';
    Icon = AlertCircle;
  }

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border ${colorClass} ${className}`}>
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {label}
    </span>
  );
}

