import React from 'react';

export function Button({ 
  children, 
  variant = 'primary', 
  className = '', 
  ...props 
}) {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none rounded-full px-6 py-2';
  
  const variants = {
    primary: 'bg-accent-primary text-white hover:bg-accent-primary-hover',
    secondary: 'border-2 border-border-default text-text-primary hover:bg-surface-card',
    outline: 'border-2 border-slate-700 text-slate-700 hover:bg-slate-50 font-semibold',
    ghost: 'text-text-primary hover:bg-surface-card',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant] || variants.primary} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

