import React from 'react';

export function Card({ children, className = '', ...props }) {
  return (
    <div
      className={`bg-white dark:bg-slate-900 rounded-[24px] border border-slate-200/70 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_16px_35px_rgb(0,0,0,0.08)] transition-all duration-300 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

