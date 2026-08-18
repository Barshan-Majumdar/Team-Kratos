import React, { useState } from 'react';
import toast from 'react-hot-toast';

export function Button({ 
  children, 
  variant = 'primary', 
  className = '', 
  onClick,
  disabled,
  ...props 
}) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async (e) => {
    if (!onClick) return;
    
    const result = onClick(e);
    if (result instanceof Promise) {
      setIsLoading(true);
      try {
        await result;
      } catch (error) {
        toast.error(error?.message || error?.toString() || "Task failed");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const baseStyles = 'inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none rounded-full px-6 py-2 relative overflow-hidden whitespace-nowrap';
  
  const variants = {
    primary: 'bg-accent-primary text-white hover:bg-accent-primary-hover',
    secondary: 'border-2 border-border-default text-text-primary hover:bg-surface-card',
    outline: 'border-2 border-slate-700 text-slate-700 hover:bg-slate-50 font-semibold',
    ghost: 'text-text-primary hover:bg-surface-card',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant] || variants.primary} ${className}`}
      onClick={handleClick}
      disabled={disabled || isLoading}
      {...props}
    >
      <span className={`flex items-center justify-center whitespace-nowrap transition-opacity duration-200 ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
        {children}
      </span>
      {isLoading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </span>
      )}
    </button>
  );
}

