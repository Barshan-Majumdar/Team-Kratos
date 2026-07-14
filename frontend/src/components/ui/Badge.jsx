import React from 'react';

export function Badge({ children, variant = 'blue', className = '' }) {
  const variants = {
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
    gray: 'bg-gray-100 text-gray-600',
  };

  const selectedVariant = variants[variant] || variants.gray;

  return (
    <span
      className={`text-[10px] font-bold tracking-wider uppercase px-3 py-1 rounded-full ${selectedVariant} ${className}`}
    >
      {children}
    </span>
  );
}

