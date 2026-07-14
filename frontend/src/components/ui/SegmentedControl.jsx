import React from 'react';

export function SegmentedControl({ options, value, onChange, className = '' }) {
  return (
    <div className={`bg-slate-100 rounded-full p-1 inline-flex ${className}`}>
      {options.map((option) => {
        const isActive = value === option.value;
        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`
              rounded-full px-6 py-2 text-sm font-semibold transition-all duration-200
              ${isActive 
                ? 'bg-slate-900 text-white shadow-md' 
                : 'text-slate-500 hover:text-slate-700'
              }
            `}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

