import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Building2, ArrowRight, CheckCircle2, ShieldCheck, Zap, 
  Crown, Users, Clock, Lock, Sparkles, Layers, ArrowUpRight
} from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#1D1B16] flex flex-col justify-between font-sans selection:bg-[#F0F3F9] selection:text-[#1F2B4D]">
      
      {/* Top Bar Navigation (Fixed Top Header Wrapper) */}
      <div className="sticky top-0 z-50 bg-[#FAF9F6] pt-4 pb-2 px-4 sm:px-6 md:px-10 w-full">
        <nav className="w-full max-w-7xl mx-auto flex items-center justify-between py-4 px-4 sm:px-6 rounded-2xl bg-white border border-[#EAE7E0] shadow-[0_1px_2px_rgba(29,27,22,0.04)]">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="p-2 rounded-xl bg-[#F4F1EA] border border-[#EAE7E0] group-hover:border-[#1F2B4D]/30 transition-all">
              <img src="/Crew.png" alt="Crew HR Logo" className="h-7 w-auto object-contain" />
            </div>
            <div>
              <span className="font-heading font-extrabold text-[#1D1B16] text-lg tracking-tight block leading-none">Crew HRMS</span>
              <span className="text-[10px] text-[#9A948A] font-semibold uppercase tracking-wider block mt-0.5">Enterprise Platform</span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            {/* Executive C-Suite Rank Badge */}
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#0F172A] text-white border border-slate-700/60 text-xs font-bold shadow-xs">
              <Crown className="w-3.5 h-3.5 text-slate-300" />
              Enterprise Edition
            </span>

            <Link 
              to="/login" 
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#F4F1EA] text-[#1F2B4D] border border-[#EAE7E0] hover:bg-[#EAE7E0] text-xs font-bold transition-all cursor-pointer"
            >
              <Lock size={13} />
              Console Login
            </Link>
          </div>
        </nav>
      </div>

      {/* Main Hero & CTA Section */}
      <main className="w-full max-w-7xl mx-auto my-auto py-4 px-4 sm:px-6 md:px-10">
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Left Column: Executive Marketing Copy */}
          <div className="lg:col-span-7 space-y-6">
            <motion.div 
              initial={{ opacity: 0, y: 15 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
            >
              {/* Warm Stone Executive Eyebrow Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F4F1EA] text-[#1F2B4D] border border-[#EAE7E0] text-xs font-bold uppercase tracking-wider mb-6 shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-[#1F2B4D]" />
                FOR GROWING & ENTERPRISE TEAMS
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#1D1B16] leading-[1.1] tracking-tight">
                Manage your <br className="hidden sm:inline" />entire company{' '}
                <span className="text-[#1F2B4D] relative inline-block">
                  in one place.
                  <span className="absolute bottom-1 left-0 right-0 h-1.5 bg-[#F0F3F9] -z-10 rounded-full"></span>
                </span>
              </h1>

              <p className="text-base sm:text-lg text-[#6B655C] mt-5 leading-relaxed max-w-xl font-normal">
                Create your workspace in seconds. Instantly unlock modern payroll, smart geofenced attendance, and effortless onboarding for your entire organization.
              </p>
            </motion.div>

            {/* Trajectory Metrics Cards (Doppelrand Micro Architecture) */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ duration: 0.5, delay: 0.15, ease: [0.34, 1.56, 0.64, 1] }} 
              className="pt-6 grid grid-cols-3 gap-3 border-t border-[#EAE7E0]"
            >
              <div className="p-3.5 rounded-2xl bg-[#F4F1EA] border border-[#EAE7E0]">
                <p className="text-2xl sm:text-3xl font-black text-[#1D1B16]">10k+</p>
                <p className="text-[11px] font-semibold text-[#6B655C] uppercase tracking-wider mt-0.5">Teams Joined</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#ECFDF5] border border-[#A7F3D0]">
                <p className="text-2xl sm:text-3xl font-black text-[#065F46]">99.9%</p>
                <p className="text-[11px] font-semibold text-[#065F46] uppercase tracking-wider mt-0.5">Uptime SLA</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#F4F1EA] border border-[#EAE7E0]">
                <p className="text-2xl sm:text-3xl font-black text-[#1F2B4D]">SOC-2</p>
                <p className="text-[11px] font-semibold text-[#6B655C] uppercase tracking-wider mt-0.5">Verified</p>
              </div>
            </motion.div>
          </div>

          {/* Right Column: Call to Action Card (Doppelrand Architecture) */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.96 }} 
            animate={{ opacity: 1, scale: 1 }} 
            transition={{ duration: 0.5, delay: 0.1 }} 
            className="lg:col-span-5"
          >
            {/* Outer Shell Bezel */}
            <div className="rounded-[32px] bg-[#F4F1EA] p-3 border border-[#EAE7E0] shadow-[0_1px_2px_rgba(29,27,22,.04),0_8px_20px_rgba(29,27,22,.06)]">
              {/* Inner Core Surface */}
              <div className="rounded-[22px] bg-white p-7 sm:p-9 border border-[#E2E8F0] shadow-sm">
                
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F0F3F9] text-[#1F2B4D] text-xs font-bold mb-4">
                  <ShieldCheck size={14} /> Instant Setup
                </div>

                <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1D1B16] tracking-tight leading-snug">
                  Ready to modernize your HR?
                </h2>
                
                <p className="text-sm text-[#6B655C] mt-2 mb-6 leading-relaxed">
                  Join 10,000+ companies managing their workforce with Crew's executive platform.
                </p>

                {/* Feature Highlights Checklist */}
                <div className="space-y-3 mb-8">
                  {[
                    'Zero-config automated payroll & compliance',
                    'Geofenced smart attendance & AI face logs',
                    'WAI-ARIA APG standard role governance'
                  ].map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs text-[#1D1B16] font-semibold">
                      <CheckCircle2 size={16} className="text-[#1F2B4D] mt-0.5 shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>

                {/* Action CTA Buttons */}
                <div className="flex flex-col gap-3">
                  <Link 
                    to="/register" 
                    className="relative group rounded-xl bg-[#1F2B4D] hover:bg-[#141C33] text-white px-7 py-4 font-bold shadow-md hover:shadow-lg active:scale-[0.99] transition-all duration-300 flex items-center justify-center gap-3 cursor-pointer text-center text-sm"
                  >
                    <span>Start Free Trial</span>
                    <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center group-hover:translate-x-1 transition-transform">
                      <ArrowRight size={15} />
                    </div>
                  </Link>

                  <Link 
                    to="/login" 
                    className="bg-[#F4F1EA] hover:bg-[#EAE7E0] text-[#1F2B4D] border border-[#EAE7E0] px-7 py-3.5 rounded-xl font-semibold text-xs transition-all text-center flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Console Login</span>
                    <ArrowUpRight size={14} className="text-[#6B655C]" />
                  </Link>
                </div>

              </div>
            </div>
          </motion.div>

        </div>

        {/* Bento Feature Grid Row */}
        <div className="mt-16 pt-12 border-t border-[#EAE7E0] grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          
          <div className="p-6 rounded-[24px] bg-[#F4F1EA] border border-[#EAE7E0] space-y-3 hover:border-[#1F2B4D]/30 transition-all">
            <div className="w-10 h-10 rounded-xl bg-white border border-[#E2E8F0] flex items-center justify-center text-[#1F2B4D] shadow-xs">
              <Zap size={20} />
            </div>
            <h3 className="text-base font-bold text-[#1D1B16]">Automated Payroll & Tax</h3>
            <p className="text-xs text-[#6B655C] leading-relaxed">
              Calculate tax deductions, PF/ESI contributions, and automated salary slip distributions in one click.
            </p>
          </div>

          <div className="p-6 rounded-[24px] bg-[#F4F1EA] border border-[#EAE7E0] space-y-3 hover:border-[#1F2B4D]/30 transition-all">
            <div className="w-10 h-10 rounded-xl bg-white border border-[#E2E8F0] flex items-center justify-center text-[#1F2B4D] shadow-xs">
              <Clock size={20} />
            </div>
            <h3 className="text-base font-bold text-[#1D1B16]">Smart Geofenced Attendance</h3>
            <p className="text-xs text-[#6B655C] leading-relaxed">
              Real-time GPS boundary verification, biometric face registration, and automated shift scheduling.
            </p>
          </div>

          <div className="p-6 rounded-[24px] bg-[#F4F1EA] border border-[#EAE7E0] space-y-3 hover:border-[#1F2B4D]/30 transition-all sm:col-span-2 lg:col-span-1">
            <div className="w-10 h-10 rounded-xl bg-white border border-[#E2E8F0] flex items-center justify-center text-[#1F2B4D] shadow-xs">
              <Layers size={20} />
            </div>
            <h3 className="text-base font-bold text-[#1D1B16]">Executive Governance</h3>
            <p className="text-xs text-[#6B655C] leading-relaxed">
              WAI-ARIA APG compliant role tree navigation, Level 0 Owner security controls, and detailed audit logs.
            </p>
          </div>

        </div>
      </main>



    </div>
  );
}
