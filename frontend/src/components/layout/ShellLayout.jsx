import React, { useState } from 'react';
import Sidebar from './Sidebar';
import { Menu, X, AlertTriangle } from 'lucide-react';

const ShellLayout = ({ user, children }) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="flex h-screen w-screen bg-[#f3f4f6] overflow-hidden p-0 gap-0 relative flex-col">
      {/* Top Banner for Unverified Email */}
      {user && !user.emailVerified && (
        <div className="bg-rose-500 text-white px-4 py-2 text-center text-sm font-medium z-[60] flex items-center justify-center gap-2 w-full absolute top-0 left-0">
          <AlertTriangle size={16} />
          Your email address is not verified. Please go to your Profile to verify it.
        </div>
      )}

      <div className={`flex flex-1 min-h-0 min-w-0 overflow-hidden w-full h-full relative p-0 md:p-3 md:gap-3 ${user && !user.emailVerified ? 'mt-9' : ''}`}>
        
        {/* Mobile Header */}
        <div className="md:hidden absolute top-0 left-0 w-full h-16 bg-[#f3f4f6] z-30 flex items-center px-4 border-b border-slate-200">
        <button 
          className="p-2 -ml-2 text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors shrink-0"
          onClick={() => setIsMobileOpen(true)}
        >
          <Menu size={24} />
        </button>
        <div className="flex flex-1 justify-start ml-2">
          <img src="/Crew.png" alt="Crew HR" className="h-10 sm:h-12 object-contain" />
        </div>
      </div>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-30 md:hidden" 
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <div className={`
        fixed md:static inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        bg-[#0F172A] md:bg-transparent p-4 md:p-0 h-full w-[280px] md:w-auto
      `}>
        {/* Mobile close button inside the sidebar */}
        <button 
          className="md:hidden absolute top-4 right-4 p-2 text-[rgba(186,230,253,0.6)] hover:text-[#E0E7FF] hover:bg-[rgba(59,130,246,0.12)] rounded-lg z-50"
          onClick={() => setIsMobileOpen(false)}
        >
          <X size={20} />
        </button>
        <Sidebar user={user} onCloseMobile={() => setIsMobileOpen(false)} />
      </div>
      
        {/* Main Content Area */}
        <main className="flex-1 min-h-0 min-w-0 rounded-none md:rounded-[28px] bg-[#f3f4f6] overflow-y-auto relative w-full">
          {/* Safe padding on mobile for the absolute header so content doesn't get obscured */}
          <div className="md:hidden h-16 w-full shrink-0" />
          {children}
        </main>
      </div>
    </div>
  );
};

export default ShellLayout;

