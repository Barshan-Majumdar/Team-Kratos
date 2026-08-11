import React, { useRef, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bot, ArrowLeft, ArrowUpRight, BrainCircuit, ShieldCheck, Layers, FileText, BarChart3, Database, Clock, Cpu, CheckCircle2, Activity, Crown, Sparkles } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { gsap } from 'gsap';
import toast from 'react-hot-toast';
import axios from 'axios';

/* ─────────────────────────────────────────────────
   Premium UI/UX Architects Redesign - Iteration 6
   Theme: High-End Corporate (Minimalist Blue/Slate)
   Enhancements: Unified Black AI Logos, Floating UI Elements, 
   Rich KPI Cards, and Integrations Band.
   ───────────────────────────────────────────────── */

const RevealStagger = ({ children, delayOffset = 0, className = "" }) => {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{
        duration: 0.6,
        delay: delayOffset,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {children}
    </motion.div>
  );
};

const UniformCard = ({ children, className = "", innerClassName = "" }) => {
  return (
    <div className={`p-1.5 md:p-2 bg-white/40 backdrop-blur-sm border border-[#EAE7E0] rounded-[1.5rem] shadow-[0_2px_10px_rgb(0,0,0,0.02)] transition-all duration-300 hover:shadow-[0_8px_30px_rgba(15,23,42,0.06)] hover:border-[#CBD5E1] h-full flex flex-col ${className}`}>
      <div className={`bg-white rounded-[calc(1.5rem-0.375rem)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)] h-full w-full flex flex-col relative overflow-hidden border border-transparent ${innerClassName}`}>
        {children}
      </div>
    </div>
  );
};

// Standard Button Animation (Professional & Minimal)
const WavyButton = ({ text, disabled = false, isLoading = false, className = "", onClick }) => {
  return (
    <button 
      disabled={disabled || isLoading}
      onClick={onClick}
      className={`group relative inline-flex items-center gap-3 px-7 py-3.5 bg-[#0F172A] hover:bg-[#1E293B] text-white rounded-xl font-sans font-bold text-[14px] tracking-wide shadow-[0_4px_14px_rgba(15,23,42,0.2)] transition-all duration-300 ${disabled || isLoading ? 'opacity-70 cursor-not-allowed' : 'active:scale-[0.98] hover:-translate-y-0.5'} ${className}`}
    >
      <span>{text}</span>
      <div className={`flex items-center justify-center transition-transform duration-300 ${(disabled || isLoading) ? '' : 'group-hover:translate-x-1 text-blue-400'}`}>
        {isLoading ? (
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
        ) : (
          <ArrowUpRight size={18} strokeWidth={2.5} />
        )}
      </div>
    </button>
  );
};

// Enhanced Rich KPI Card
const StatBadge = ({ icon: Icon, label, value, trend, isPositive }) => (
  <div className="flex flex-col gap-2 p-4 bg-white border border-[#EAE7E0] rounded-[1.25rem] shadow-[0_2px_8px_rgb(0,0,0,0.02)] transition-all duration-300 hover:border-[#CBD5E1] hover:shadow-md relative overflow-hidden group">
    {/* Abstract corner shape for visual richness */}
    <div className="absolute top-0 right-0 w-16 h-16 bg-[#F8FAFC] rounded-bl-full -mr-8 -mt-8 transition-transform duration-500 group-hover:scale-125"></div>
    
    <div className="flex justify-between items-start relative z-10">
      <div className="w-8 h-8 rounded-lg bg-[#F8FAFC] text-[#475569] border border-[#F1F5F9] flex items-center justify-center shrink-0 group-hover:text-[#2563EB] group-hover:border-blue-100 transition-colors">
        <Icon size={16} />
      </div>
      {trend && (
        <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 shadow-sm ${isPositive ? 'text-emerald-700 bg-emerald-50 border border-emerald-100' : 'text-blue-700 bg-blue-50 border border-blue-100'}`}>
          {isPositive ? '↑' : '↓'} {trend}
        </div>
      )}
    </div>
    
    <div className="relative z-10 mt-1">
      <p className="text-[22px] font-sans font-extrabold text-[#0F172A] leading-tight tracking-tight mb-0.5">{value}</p>
      <p className="text-[10px] uppercase tracking-wider font-bold text-[#94A3B8]">{label}</p>
    </div>
  </div>
);

const MockChatUI = () => {
  const containerRef = useRef(null);
  const syncRef = useRef(null);
  const confidenceRef = useRef(null);

  return (
    <div className="relative w-full max-w-md mx-auto md:mr-0 mt-12 md:mt-0" ref={containerRef}>
      
      {/* Decorative Background Grid */}
      <div className="absolute inset-0 -m-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMTUsMjMsNDIsMC4wMikiLz48L3N2Zz4=')] [mask-image:radial-gradient(circle_at_center,black,transparent_70%)] pointer-events-none -z-10" />

      {/* Floating Elements for visual richness */}
      <div ref={syncRef} className="absolute -left-8 md:-left-12 top-20 bg-white border border-[#EAE7E0] p-2.5 rounded-xl shadow-lg flex items-center gap-2.5 z-20">
        <div className="w-7 h-7 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
          <CheckCircle2 size={14} />
        </div>
        <div className="text-[10px] font-bold text-[#0F172A] uppercase pr-2 tracking-wide">Sync Active</div>
      </div>

      <div ref={confidenceRef} className="absolute -right-4 md:-right-8 bottom-16 bg-white border border-[#EAE7E0] p-3 rounded-xl shadow-lg flex flex-col gap-0.5 z-20 transition-transform hover:scale-105 hover:-rotate-2 duration-300">
        <div className="flex items-center gap-1.5 text-[9px] text-[#64748B] font-bold uppercase tracking-wider">
          <Activity size={10} className="text-[#2563EB]" /> Confidence
        </div>
        <div className="text-lg font-display font-extrabold text-[#0F172A]">99.9%</div>
      </div>

      <div className="relative bg-white border border-[#EAE7E0] p-6 rounded-[1.5rem] shadow-[0_20px_50px_-15px_rgba(15,23,42,0.15)] transition-transform duration-700 hover:scale-[1.01]">
        <div className="flex items-center justify-between mb-6 border-b border-[#F1F5F9] pb-4">
          <div className="flex items-center gap-3.5">
            {/* High-End Minimalist Logo */}
            <div className="relative w-10 h-10 rounded-xl bg-[#0F172A] flex items-center justify-center shadow-md shrink-0 border border-[#1E293B]">
              <Cpu size={20} className="text-white" strokeWidth={1.5} />
            </div>
            <div>
              <h4 className="text-[15px] font-sans font-extrabold text-[#0F172A] tracking-tight">Crew AI</h4>
              <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1.5 uppercase tracking-wider mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 block"></span> Connected
              </p>
            </div>
          </div>
          <div className="text-[10px] font-mono font-bold text-[#475569] bg-[#F8FAFC] px-2.5 py-1 rounded-md border border-[#E2E8F0]">
            v2.0-beta
          </div>
        </div>

        <div className="space-y-6">
          {/* User Message - Solid Professional Blue */}
          <div className="flex justify-end">
            <div className="bg-[#2563EB] text-white text-[13px] px-4 py-3 rounded-2xl rounded-tr-[4px] shadow-[0_4px_12px_rgba(37,99,235,0.2)] max-w-[85%] font-medium leading-relaxed">
              Analyze Q3 engineering payroll vs forecasted budget.
            </div>
          </div>
          
          {/* AI Message - Clean Slate Layout */}
          <div className="flex justify-start">
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] text-[#334155] text-[13px] p-5 rounded-2xl rounded-tl-[4px] max-w-[95%] font-medium leading-relaxed relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-[#3B82F6] rounded-l-sm"></div>
              
              <div className="flex items-center gap-2 mb-3 pb-3 border-b border-[#E2E8F0]">
                <Database size={12} className="text-[#64748B]" />
                <span className="text-[10.5px] font-mono text-[#64748B] font-semibold tracking-wide">
                  Queried 14,203 records in <span className="text-[#0F172A] font-bold">420ms</span>
                </span>
              </div>
              
              <p className="mb-4">
                Q3 Engineering payroll totaled <strong className="text-[#0F172A] font-extrabold">$1,242,500</strong>. <br/>
                This is <strong className="text-emerald-700 font-extrabold bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded ml-1">3.2% under</strong> the forecasted budget of $1.28M.
              </p>

              <div className="bg-white p-3 rounded-xl border border-[#E2E8F0] shadow-sm grid grid-cols-2 gap-3 text-[11.5px]">
                <div className="bg-[#F8FAFC] p-2.5 rounded-lg border border-[#F1F5F9] transition-colors hover:border-[#CBD5E1]">
                  <div className="text-[#64748B] mb-1 font-semibold uppercase tracking-wider text-[9px]">Base Salary</div>
                  <div className="font-extrabold text-[#0F172A] text-[13px]">$980,000</div>
                </div>
                <div className="bg-[#F8FAFC] p-2.5 rounded-lg border border-[#F1F5F9] transition-colors hover:border-[#CBD5E1]">
                  <div className="text-[#64748B] mb-1 font-semibold uppercase tracking-wider text-[9px]">Bonuses / OT</div>
                  <div className="font-extrabold text-[#2563EB] text-[13px]">$262,500</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const AIChatbot = () => {
  const getEmail = () => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        return JSON.parse(userStr).email;
      }
    } catch (e) {}
    return 'guest@crew.com';
  };

  const [isBetaRequested, setIsBetaRequested] = useState(() => {
    return localStorage.getItem(`crew_beta_requested_${getEmail()}`) === 'true';
  });
  const [isEarlyAccessRequested, setIsEarlyAccessRequested] = useState(() => {
    return localStorage.getItem(`crew_early_access_requested_${getEmail()}`) === 'true';
  });
  const [isBetaLoading, setIsBetaLoading] = useState(false);
  const [isEarlyAccessLoading, setIsEarlyAccessLoading] = useState(false);

  const handleBetaClick = async () => {
    if (isBetaRequested || isBetaLoading) return;
    setIsBetaLoading(true);

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      await axios.post(`${API_URL}/api/auth/waitlist`, {
        email: getEmail(),
        type: 'beta'
      });
      
      // Artificial delay for premium loading feel
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setIsBetaRequested(true);
      localStorage.setItem(`crew_beta_requested_${getEmail()}`, 'true');
      toast.success("your beta access request is received, we will notify if you are eligible", {
        style: { background: '#0F172A', color: '#fff', borderRadius: '12px', fontSize: '13px', fontWeight: 'bold' },
        iconTheme: { primary: '#F59E0B', secondary: '#0F172A' },
      });
    } catch (e) {
      console.error('Waitlist error', e);
      toast.error("Failed to send request. Please try again.");
    } finally {
      setIsBetaLoading(false);
    }
  };

  const handleEarlyAccessClick = async () => {
    if (isEarlyAccessRequested || isEarlyAccessLoading) return;
    setIsEarlyAccessLoading(true);

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      await axios.post(`${API_URL}/api/auth/waitlist`, {
        email: getEmail(),
        type: 'early'
      });
      
      // Artificial delay for premium loading feel
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setIsEarlyAccessRequested(true);
      localStorage.setItem(`crew_early_access_requested_${getEmail()}`, 'true');
      toast.success("your early access request received, we will notify if you meet the eligibility critiria", {
        style: { background: '#0F172A', color: '#fff', borderRadius: '12px', fontSize: '13px', fontWeight: 'bold' },
        iconTheme: { primary: '#3B82F6', secondary: '#0F172A' },
      });
    } catch (e) {
      console.error('Waitlist error', e);
      toast.error("Failed to send request. Please try again.");
    } finally {
      setIsEarlyAccessLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 lg:p-12 w-full max-w-[1600px] mx-auto min-h-full flex flex-col font-sans relative bg-[#FDFBF7]">
      
      {/* ── Page Header ───────────────────────────────── */}
      <RevealStagger>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 pb-5 border-b border-[#EAE7E0] gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            {/* Unified Logo - Same as Mock Chat UI */}
            <div 
              className="relative w-11 h-11 rounded-xl bg-[#0F172A] flex items-center justify-center shadow-md shrink-0 border border-[#1E293B] cursor-pointer"
              onDoubleClick={() => {
                localStorage.removeItem(`crew_beta_requested_${getEmail()}`);
                localStorage.removeItem(`crew_early_access_requested_${getEmail()}`);
                toast.success("Account waitlist status unlocked/reset!");
                setTimeout(() => window.location.reload(), 1000);
              }}
              title="Double click to reset waitlist status"
            >
              <Cpu size={22} className="text-white" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="font-sans font-bold text-xl md:text-2xl text-[#0F172A] tracking-tight">
                Crew AI
              </h1>
              <p className="text-[12px] text-[#64748B] mt-0.5 font-medium">
                Enterprise-grade RAG-based conversational analytics
              </p>
            </div>
          </div>
          <Link 
            to="/dashboard" 
            className="group bg-white hover:bg-[#F8FAFC] text-[#0F172A] border border-[#EAE7E0] font-sans font-bold px-4 py-2 rounded-lg transition-all active:scale-[0.98] flex items-center text-xs shadow-sm"
          >
            <ArrowLeft size={14} strokeWidth={2.5} className="mr-2 transition-transform group-hover:-translate-x-1" /> 
            Back to Dashboard
          </Link>
        </div>
      </RevealStagger>

      {/* ── Premium Feature Alert Banner ────────────────── */}
      <RevealStagger delayOffset={0.05}>
        <div className="mb-12 w-full relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 rounded-xl blur opacity-25 group-hover:opacity-40 transition duration-500"></div>
          <div className="relative bg-white border border-amber-200 rounded-xl p-4 md:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm overflow-hidden">
            
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
            
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-100 to-amber-200 border border-amber-300 flex items-center justify-center shrink-0 text-amber-700 shadow-inner">
                <Crown size={24} strokeWidth={2} />
              </div>
              <div>
                <h3 className="font-sans font-extrabold text-[#0F172A] text-[16px] flex items-center gap-2 mb-1">
                  Crew Premium Feature 
                  <span className="px-2 py-0.5 rounded-md bg-amber-100 border border-amber-200 text-amber-800 text-[9px] uppercase font-bold tracking-widest">
                    In Development
                  </span>
                </h3>
                <p className="text-[13.5px] text-[#475569] font-medium leading-relaxed max-w-3xl">
                  This intelligent RAG oracle is currently in closed beta. It allows for deep cross-module analytics (payroll vs performance). Features, interfaces, and query speeds are subject to change before the final stable release.
                </p>
              </div>
            </div>
            
            <div className="relative z-10 shrink-0 md:ml-auto w-full md:w-auto">
              <button 
                onClick={handleBetaClick} 
                disabled={isBetaRequested || isBetaLoading}
                className={`w-full md:w-auto px-5 py-2.5 rounded-lg font-sans font-bold text-[13px] tracking-wide transition-colors shadow-sm flex items-center justify-center gap-2 ${isBetaRequested ? 'bg-amber-800/40 text-amber-100 cursor-not-allowed opacity-90' : isBetaLoading ? 'bg-amber-500/80 cursor-wait text-white' : 'bg-amber-500 hover:bg-amber-600 text-white active:scale-95'}`}
              >
                {isBetaLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <Sparkles size={16} />
                )}
                {isBetaRequested ? 'Request Received' : isBetaLoading ? 'Sending...' : 'Request Beta Access'}
              </button>
            </div>
          </div>
        </div>
      </RevealStagger>


      {/* ── Hero Section (Data-Dense & Controlled Typography) ────────────────────── */}
      <div className="mb-20 flex flex-col lg:flex-row items-center justify-between pt-4 pb-8 relative z-10 gap-10">
        
        <div className="w-full lg:w-[55%] flex flex-col items-start">
          <RevealStagger delayOffset={0.1}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-[#EAE7E0] mb-6 w-fit shadow-sm">
              <span className="relative flex h-1.5 w-1.5">
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#3B82F6]" />
              </span>
              <span className="text-[10px] font-bold text-[#475569] uppercase tracking-wider">
                System Status: Active
              </span>
            </div>
          </RevealStagger>

          <RevealStagger delayOffset={0.2}>
            <h2 className="text-4xl md:text-5xl lg:text-[52px] font-sans font-extrabold text-[#0F172A] tracking-tight leading-[1.1] mb-6 max-w-2xl">
              Turn your HR database into an <span className="text-[#2563EB]">intelligent oracle</span>.
            </h2>
          </RevealStagger>
          
          <RevealStagger delayOffset={0.3}>
            <p className="text-[15px] text-[#475569] max-w-lg leading-relaxed mb-8 font-medium">
              Unlike traditional HRMS platforms, our RAG-based engine requires <strong>zero human effort</strong>. Simply type a prompt and it instantly fetches real-time DB insights—from employee details and leave balances to live time-shift schedules. Ask anything, and get the exact answer you need in milliseconds.
            </p>
          </RevealStagger>

          {/* Data Density: Rich KPI badges */}
          <RevealStagger delayOffset={0.4} className="grid grid-cols-2 gap-4 mb-10 w-full max-w-lg">
            <StatBadge icon={Database} label="Vectors Indexed" value="1.2M+" trend="12%" isPositive={true} />
            <StatBadge icon={Clock} label="Avg Query Time" value="< 500ms" trend="-42ms" isPositive={false} />
          </RevealStagger>

          <RevealStagger delayOffset={0.5} className="flex flex-wrap gap-4">
            <WavyButton 
              text={isEarlyAccessRequested ? "Request Received" : isEarlyAccessLoading ? "Sending..." : "Request Early Access"} 
              onClick={handleEarlyAccessClick} 
              disabled={isEarlyAccessRequested} 
              isLoading={isEarlyAccessLoading}
            />
            <button className="px-7 py-3.5 bg-white text-[#0F172A] border border-[#EAE7E0] rounded-xl font-sans font-bold text-[14px] tracking-wide transition-all shadow-sm hover:shadow-md hover:border-[#CBD5E1] hover:bg-[#F8FAFC] active:scale-[0.98]">
              View Documentation
            </button>
          </RevealStagger>

          {/* Integrations Band */}
          <RevealStagger delayOffset={0.6} className="mt-12 pt-6 border-t border-[#EAE7E0]/60 w-full max-w-lg">
            <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-4">Seamlessly Correlates Data From</p>
            <div className="flex items-center gap-6 opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500">
              <div className="flex items-center gap-1.5 font-sans font-extrabold text-[#0F172A]"><div className="w-4 h-4 bg-blue-600 rounded-sm"></div> Workday</div>
              <div className="flex items-center gap-1.5 font-serif font-bold text-[#0F172A]"><div className="w-4 h-4 rounded-full bg-indigo-600"></div> BambooHR</div>
              <div className="flex items-center gap-1.5 font-display font-black text-[#0F172A] tracking-tighter"><div className="w-4 h-4 bg-orange-500 rounded-sm rotate-45 scale-75"></div> Gusto</div>
              <div className="flex items-center gap-1.5 font-mono font-bold text-[#0F172A]"><Layers size={16} className="text-emerald-600" /> Deel</div>
            </div>
          </RevealStagger>
        </div>

        <div className="w-full lg:w-[45%]">
          <RevealStagger delayOffset={0.5}>
            <MockChatUI />
          </RevealStagger>
        </div>
      </div>

      {/* ── Symmetrical, Uniform Features Grid ─────────────────────── */}
      <div className="mb-20 relative z-10">
        <RevealStagger>
          <div className="mb-8 border-b border-[#EAE7E0] pb-3">
            <h3 className="text-lg font-sans font-extrabold text-[#0F172A] tracking-tight">System Architecture & Capabilities</h3>
          </div>
        </RevealStagger>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 auto-rows-fr">
          
          {[
            {
              title: "Context-Aware RAG Engine",
              icon: BrainCircuit,
              desc: "Answers are exclusively grounded in your company data using Retrieval-Augmented Generation. Zero external hallucination risk.",
              stats: [{ label: "Accuracy Rate", val: "99.8%" }, { label: "Data Scope", val: "Internal Only" }]
            },
            {
              title: "Cross-Module Synthesis",
              icon: Layers,
              desc: "Correlates data across payroll ledgers, performance reviews, and attendance logs to answer complex multi-variable questions.",
              stats: [{ label: "Connected APIs", val: "14 Modules" }, { label: "Data Lag", val: "Real-time" }]
            },
            {
              title: "Enterprise Grade Security",
              icon: ShieldCheck,
              desc: "Row-level security ensures the AI only returns information the querying user (HR Admin / Owner) is authorized to see.",
              stats: [{ label: "Encryption", val: "AES-256" }, { label: "Compliance", val: "SOC 2 Type II" }]
            },
            {
              title: "Predictive Analytics",
              icon: BarChart3,
              desc: "Identifies trends in turnover, cost centers, and performance automatically without requiring complex manual Excel pivots.",
              stats: [{ label: "Forecast Models", val: "Enabled" }, { label: "Auto-Reporting", val: "Scheduled" }]
            },
            {
              title: "Instant Document Retrieval",
              icon: FileText,
              desc: "Semantically searches through thousands of uploaded HR policies, offer letters, and compliance documents in milliseconds.",
              stats: [{ label: "Vector Search", val: "Active" }, { label: "Supported Formats", val: "PDF, DOCX, CSV" }]
            },
            {
              title: "Crew Premium Tier",
              icon: Database,
              desc: "Exclusive capability for premium organizations requiring massive query limits and dedicated tenant indexing.",
              stats: [{ label: "Compute Tier", val: "Dedicated" }, { label: "Query Limit", val: "Unlimited" }]
            }
          ].map((feature, idx) => (
            <RevealStagger key={idx} delayOffset={0.1 * (idx + 1)} className="h-full">
              <UniformCard innerClassName="p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-[#F8FAFC] border border-[#F1F5F9] flex items-center justify-center shrink-0">
                    <feature.icon size={18} className="text-[#3B82F6]" />
                  </div>
                  <h4 className="text-[15px] font-sans font-bold text-[#0F172A] leading-tight pt-1">{feature.title}</h4>
                </div>
                
                <p className="text-[13px] text-[#475569] leading-relaxed mb-6 flex-grow font-medium">
                  {feature.desc}
                </p>

                <div className="grid grid-cols-2 gap-2 mt-auto pt-4 border-t border-[#EAE7E0]/60">
                  {feature.stats.map((stat, i) => (
                    <div key={i}>
                      <div className="text-[10px] text-[#64748B] uppercase tracking-wider mb-0.5 font-bold">{stat.label}</div>
                      <div className="text-[12px] font-mono font-bold text-[#0F172A]">{stat.val}</div>
                    </div>
                  ))}
                </div>
              </UniformCard>
            </RevealStagger>
          ))}

        </div>
      </div>

    </div>
  );
};

export default AIChatbot;
