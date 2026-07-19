import React from 'react';
import { motion } from 'framer-motion';
import RegistrationFlow from './components/RegistrationFlow';

function App() {
  return (
    <div className="min-h-screen mesh-bg flex flex-col items-center justify-center p-4 md:p-8">
      
      {/* Brand Header */}
      <div className="absolute top-8 left-8 flex items-center gap-2">
        <img src="/Crew.png" alt="Crew HR Logo" className="h-10 w-auto object-contain drop-shadow-sm" />
      </div>

      <div className="w-full max-w-[1200px] grid lg:grid-cols-2 gap-12 items-center">
        
        {/* Left Side: Marketing Copy */}
        <div className="hidden lg:block space-y-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="px-3 py-1 bg-indigo-100 text-indigo-700 font-bold text-xs rounded-full uppercase tracking-widest mb-4 inline-block">For Growing Teams</span>
            <h1 className="text-5xl font-black text-slate-800 leading-[1.1] tracking-tight">
              Manage your <br/>entire company<br/>
              <span className="text-indigo-600 italic font-serif">in one place.</span>
            </h1>
            <p className="text-lg text-slate-600 mt-6 leading-relaxed max-w-md">
              Create your workspace in seconds. Instantly unlock modern payroll, smart attendance, and effortless onboarding for your entire organization.
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="pt-8 flex items-center gap-8 border-t border-slate-200/60">
            <div>
              <p className="text-3xl font-black text-slate-800">10k+</p>
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Teams joined</p>
            </div>
            <div>
              <p className="text-3xl font-black text-slate-800">99.9%</p>
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Uptime SLA</p>
            </div>
          </motion.div>
        </div>

        {/* Right Side: Multi-Step Registration Form */}
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }} className="w-full">
          <RegistrationFlow />
        </motion.div>
      </div>
    </div>
  );
}

export default App;
