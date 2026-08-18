import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Crown, Sparkles } from 'lucide-react';

export default function IrisAlert() {
  const [isVisible, setIsVisible] = useState(false);
  const [isHiding, setIsHiding] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // We wait a second before showing it so it feels more natural
    const timer = setTimeout(() => {
      if (localStorage.getItem('crew_iris_alert_dismissed') === 'true') {
        return;
      }
      
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          // Only show to Level 0 (Super Admin) and Level 1 (Owner/Admin)
          if (user.roleDefinition && (user.roleDefinition.level === 0 || user.roleDefinition.level === 1)) {
            setIsVisible(true);
          }
        } catch (e) {
          console.error(e);
        }
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  const dismiss = () => {
    setIsHiding(true);
    localStorage.setItem('crew_iris_alert_dismissed', 'true');
    setTimeout(() => {
      setIsVisible(false);
    }, 400); // Wait for the transition to finish
  };

  const handleTryNow = () => {
    setIsHiding(true);
    localStorage.setItem('crew_iris_alert_dismissed', 'true');
    setTimeout(() => {
      setIsVisible(false);
      navigate('/dashboard/ai-chatbot'); // Redirect to correct AI chat section
    }, 400);
  };

  return (
    <div className={`fixed bottom-6 right-6 z-[9999] max-w-sm w-full transition-all duration-500 ease-in-out ${isHiding ? 'opacity-0 translate-y-10' : 'animate-in slide-in-from-bottom-10 fade-in'}`}>
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] overflow-hidden relative">
        {/* Solid Top Border */}
        <div className="absolute top-0 inset-x-0 h-1 bg-slate-900"></div>
        
        {/* Close Button */}
        <button 
          onClick={dismiss}
          className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors z-10"
        >
          <X size={16} />
        </button>

        <div className="p-5 sm:p-6 relative">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center shadow-md relative">
              <Sparkles size={20} className="text-indigo-400" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg leading-tight flex items-center gap-1.5">
                Meet Iris <Crown size={14} className="text-amber-500" strokeWidth={3} />
              </h3>
              <p className="text-[11px] font-semibold tracking-wider uppercase text-indigo-600">New Feature</p>
            </div>
          </div>
          
          <p className="text-slate-600 text-sm leading-relaxed mb-5">
            Your personal AI assistant is now live! You can now use natural language to instantly analyze company policies, track attendance, and manage payroll.
          </p>

          <div className="flex gap-3">
            <button 
              onClick={dismiss}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors"
            >
              Maybe later
            </button>
            <button 
              onClick={handleTryNow}
              className="flex-1 py-2.5 px-4 rounded-xl bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 shadow-sm transition-transform active:scale-95"
            >
              Try Iris Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
