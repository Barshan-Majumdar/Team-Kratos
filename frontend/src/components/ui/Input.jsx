import React from 'react';

export function Input({ className = '', ...props }) {
  return (
    <input
      className={`flex h-10 w-full rounded-[var(--radius-md)] border border-border-default bg-surface-glass-solid px-3 py-2 text-sm text-text-primary file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-text-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    />
  );
}

