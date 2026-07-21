import React from 'react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

const Alert = ({ type = 'error', message, className = '' }) => {
  if (!message) return null;

  const config = {
    error: {
      icon: <AlertCircle size={20} className="text-red-400 mt-0.5 shrink-0" />,
      bg: 'bg-red-500/10',
      border: 'border-l-4 border-l-red-500 border-y border-r border-red-500/20',
      text: 'text-red-400'
    },
    success: {
      icon: <CheckCircle2 size={20} className="text-emerald-400 mt-0.5 shrink-0" />,
      bg: 'bg-emerald-500/10',
      border: 'border-l-4 border-l-emerald-500 border-y border-r border-emerald-500/20',
      text: 'text-emerald-400'
    },
    info: {
      icon: <Info size={20} className="text-blue-400 mt-0.5 shrink-0" />,
      bg: 'bg-blue-500/10',
      border: 'border-l-4 border-l-blue-500 border-y border-r border-blue-500/20',
      text: 'text-blue-400'
    }
  };

  const current = config[type] || config.error;

  // Add animation classes to make it slide/fade in beautifully
  return (
    <div className={`flex items-start gap-3 p-4 rounded-r-lg ${current.bg} ${current.border} shadow-sm animate-in slide-in-from-top-2 fade-in duration-300 ${className}`}>
      {current.icon}
      <div className="flex-1 overflow-hidden">
        <p className={`text-sm font-medium leading-relaxed break-words line-clamp-3 ${current.text}`} title={typeof message === 'string' ? message : ''}>
          {message}
        </p>
      </div>
    </div>
  );
};

export default Alert;
