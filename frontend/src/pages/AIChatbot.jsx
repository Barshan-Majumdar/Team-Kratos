import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bot, Sparkles, ArrowLeft, ArrowUpRight, Cpu, Zap, MessageSquare, BrainCircuit, ShieldCheck, Layers, Command, Workflow } from 'lucide-react';

/* ─────────────────────────────────────────────────
   Standard Dashboard UI matching other Kratos pages
   ───────────────────────────────────────────────── */

const useInView = (threshold = 0.15) => {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold]);
  return [ref, isVisible];
};

const FadeUp = ({ children, delay = 0, className = '' }) => {
  const [ref, isVisible] = useInView(0.1);
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
        isVisible
          ? 'translate-y-0 opacity-100'
          : 'translate-y-8 opacity-0'
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

const AIChatbot = () => {
  return (
    <div className="p-4 md:p-8 lg:p-12 w-full max-w-[1600px] mx-auto min-h-full flex flex-col">
      
      {/* ── Page Header ───────────────────────────────── */}
      <FadeUp>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 pb-5 border-b border-[#EAE7E0] gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#F0F3F9] border border-[#CBD5E1] flex items-center justify-center shadow-xs shrink-0">
              <Bot size={22} className="text-[#1F2B4D]" />
            </div>
            <div>
              <h1 className="font-serif font-bold text-2xl md:text-3xl text-[#1F2B4D] tracking-tight">
                AI Chatbot
              </h1>
              <p className="text-xs md:text-sm text-[#6B655C] mt-0.5 font-medium">
                Intelligent HR assistant powered by AI
              </p>
            </div>
          </div>
          <Link 
            to="/dashboard" 
            className="bg-[#F0F3F9] hover:bg-[#E2E8F0] text-[#1F2B4D] border border-[#CBD5E1] font-display font-bold px-4 py-2 rounded-xl transition-all hover:scale-[1.02] active:scale-95 flex items-center text-xs gap-1.5 shadow-xs"
          >
            <ArrowLeft size={14} strokeWidth={2.5} /> 
            Back to Dashboard
          </Link>
        </div>
      </FadeUp>

      {/* ── Main Dashboard Grid ────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 mb-6">
        
        {/* ── Hero Card (spans 8 cols) ──────────────── */}
        <FadeUp delay={100} className="md:col-span-8 md:row-span-2">
          <div className="h-full bg-white rounded-[20px] shadow-xs border border-[#EAE7E0] overflow-hidden flex flex-col relative group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity duration-700 pointer-events-none">
              <Sparkles size={120} className="text-[#1F2B4D]" />
            </div>

            <div className="p-8 sm:p-10 lg:p-12 flex flex-col justify-center h-full min-h-[420px] md:min-h-0 relative z-10">
              {/* Eyebrow pill */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#F0F3F9] border border-[#CBD5E1] mb-6 w-fit">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#38BDF8] opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#1F2B4D]" />
                </span>
                <span className="text-[10px] font-bold text-[#1F2B4D] uppercase tracking-widest font-display">
                  In Development
                </span>
              </div>

              {/* Standard typography matching dashboard */}
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#1F2B4D] tracking-tight leading-[1.1] mb-4 max-w-lg">
                The future of HR is <span className="text-[#1F2B4D]">conversational</span>.
              </h2>
              
              <p className="text-[13px] md:text-[15px] text-[#6B655C] max-w-xl leading-[1.6] mb-8 font-medium">
                We're building an intelligent <strong className="text-[#1F2B4D]">RAG-based AI assistant</strong> exclusively for HR. 
                Talk to your data — ask absolutely anything about your employees, company policies, or workforce metrics, and get instant, accurate answers through natural conversation.
                <br /><br />
                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-amber-50 border border-amber-200 text-[10px] font-bold text-amber-700 uppercase tracking-wider">
                  Crew Premium Feature
                </span>
              </p>

              {/* Standard Kratos UI Button */}
              <div>
                <button 
                  disabled
                  className="bg-[#1F2B4D] text-white font-display font-bold text-xs md:text-sm px-5 py-2.5 rounded-xl shadow-xs opacity-60 cursor-not-allowed flex items-center gap-2"
                >
                  Notify Me on Launch
                  <ArrowUpRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </FadeUp>

        {/* ── Status Card (spans 4 cols, row 1) ────── */}
        <FadeUp delay={200} className="md:col-span-4">
          <div className="h-full bg-white rounded-[20px] shadow-xs border border-[#EAE7E0] p-6 flex flex-col justify-between min-h-[200px]">
            <div className="w-12 h-12 rounded-xl bg-[#F0F3F9] border border-[#CBD5E1] flex items-center justify-center mb-5">
              <Bot size={24} className="text-[#1F2B4D]" />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-bold text-[#6B655C] uppercase tracking-wider font-display">Progress</span>
                <span className="text-[10px] font-bold text-[#1F2B4D] font-display">Phase 1 / 3</span>
              </div>
              <div className="h-2 w-full bg-[#F0F3F9] rounded-full overflow-hidden mb-2">
                <div 
                  className="h-full rounded-full bg-[#1F2B4D] transition-all duration-[1200ms] ease-out"
                  style={{ width: '35%' }}
                />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-semibold text-[#94A3B8] font-display">Research</span>
                <span className="text-[9px] font-semibold text-[#94A3B8] font-display">Engine</span>
                <span className="text-[9px] font-semibold text-[#94A3B8] font-display">Launch</span>
              </div>
            </div>
          </div>
        </FadeUp>

        {/* ── Access Badge Card (spans 4 cols, row 2) ── */}
        <FadeUp delay={300} className="md:col-span-4">
          <div className="h-full bg-white rounded-[20px] shadow-xs border border-[#EAE7E0] p-6 flex flex-col justify-between min-h-[200px]">
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center mb-4">
              <ShieldCheck size={24} className="text-amber-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1F2B4D] mb-1 font-sans">Admin-Only Access</h3>
              <p className="text-[11px] text-[#6B655C] font-medium leading-relaxed">
                Available exclusively for Owners and HR Admins. 
                We'll notify you when early access begins.
              </p>
            </div>
          </div>
        </FadeUp>
      </div>

      {/* ── Feature Cards Row ─────────────────────── */}
      <FadeUp delay={400}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
          {[
            { icon: MessageSquare, color: 'text-[#1F2B4D]', bg: 'bg-[#F0F3F9]', title: 'Talk to Your Data', desc: 'Ask complex questions about any employee and get instant, detailed answers.' },
            { icon: BrainCircuit, color: 'text-sky-600', bg: 'bg-sky-50', title: 'RAG-Based AI', desc: 'Retrieval-Augmented Generation ensures answers are securely based on your actual data.' },
            { icon: Layers, color: 'text-[#1F2B4D]', bg: 'bg-[#F0F3F9]', title: 'Unlimited Scope', desc: 'From payroll to performance, you can ask the bot literally anything about the org.' },
            { icon: Sparkles, color: 'text-amber-600', bg: 'bg-amber-50', title: 'Crew Premium', desc: 'An exclusive premium feature built to supercharge your HR operations.' },
          ].map((feat, i) => (
            <FadeUp key={feat.title} delay={500 + i * 100}>
              <div className="bg-white p-5 rounded-[20px] shadow-xs border border-[#EAE7E0] hover:border-[#CBD5E1] hover:shadow-sm transition-all duration-300 h-full group">
                <div className={`w-10 h-10 rounded-xl ${feat.bg} flex items-center justify-center mb-3 border ${feat.bg === 'bg-[#F0F3F9]' ? 'border-[#CBD5E1]' : 'border-transparent'} group-hover:scale-105 transition-transform duration-300`}>
                  <feat.icon size={18} className={feat.color} />
                </div>
                <h3 className="text-xs font-bold text-[#1F2B4D] mb-1.5 tracking-tight font-sans">{feat.title}</h3>
                <p className="text-[11px] text-[#6B655C] font-medium leading-relaxed">{feat.desc}</p>
              </div>
            </FadeUp>
          ))}
        </div>
      </FadeUp>
    </div>
  );
};

export default AIChatbot;
