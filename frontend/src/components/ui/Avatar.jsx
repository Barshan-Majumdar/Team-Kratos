import React from 'react';
import { User } from 'lucide-react';

export function Avatar({ src, alt, size = 'md', initials, className = '' }) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg'
  };

  return (
    <div className={`relative inline-flex items-center justify-center overflow-hidden bg-accent-primary/10 text-accent-primary font-bold rounded-full border border-border-default shrink-0 ${sizeClasses[size]} ${className}`}>
      {src ? (
        <img src={src} alt={alt || 'Avatar'} className="w-full h-full object-cover" />
      ) : initials ? (
        initials
      ) : (
        <User className="w-1/2 h-1/2 opacity-70" />
      )}
    </div>
  );
}

