import React from 'react';
import { motion } from 'framer-motion';
import RegistrationFlow from '../components/RegistrationFlow';

function Landing() {
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

        {/* Right Side: Call to action */}
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }} className="w-full flex flex-col items-center justify-center p-8 bg-white/50 backdrop-blur-sm rounded-3xl border border-white">
          <h2 className="text-3xl font-bold text-slate-800 mb-4 text-center">Ready to modernize your HR?</h2>
          <p className="text-slate-600 mb-8 text-center">Join 10,000+ companies managing their workforce with Crew.</p>
          <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
            <a href="/register" className="bg-indigo-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 text-center">Start Free Trial</a>
            <a href="/login" className="bg-white text-indigo-600 px-8 py-4 rounded-xl font-semibold hover:bg-slate-50 transition-colors border border-slate-200 text-center">Console Login</a>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default Landing;
