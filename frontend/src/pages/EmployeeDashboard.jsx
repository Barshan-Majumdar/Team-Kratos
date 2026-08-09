import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, useMotionValue, useSpring, useTransform, animate, AnimatePresence } from 'framer-motion';
import { 
  Calendar as CalendarIcon, CalendarDays, BarChart2, CheckCircle2, 
  ArrowUpRight, Sun, SunMedium, Moon, Flame, ArrowRight, AlertCircle, Filter, ChevronDown, Check, ScanFace
} from 'lucide-react';
import { ComposedChart, Area, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { calculateStreak, getInteractiveChartData, generateHeatmapData } from '../utils/employeeDashboardHelpers';
import { format, differenceInDays, parseISO } from 'date-fns';


const HOLIDAYS = [
  { date: '2026-01-01', name: 'New Year\'s Day', category: 'Public' },
  { date: '2026-05-01', name: 'Labor Day', category: 'Public' },
  { date: '2026-07-04', name: 'Independence Day', category: 'National' },
  { date: '2026-11-26', name: 'Thanksgiving Day', category: 'National' },
  { date: '2026-12-25', name: 'Christmas Day', category: 'Public' },
];

// ── Framer Motion Animation Variants ─────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.04,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 280,
      damping: 22,
    },
  },
};

// ── Greeting Calculator ───────────────────────────────────────────────────
const getGreetingDetails = () => {
  const hour = new Date().getHours();
  if (hour < 12) return { text: 'Good Morning', Icon: Sun, badgeBg: 'bg-amber-50 text-amber-600 border-amber-200' };
  if (hour < 18) return { text: 'Good Afternoon', Icon: SunMedium, badgeBg: 'bg-orange-50 text-orange-600 border-orange-200' };
  return { text: 'Good Evening', Icon: Moon, badgeBg: 'bg-indigo-50 text-indigo-600 border-indigo-200' };
};

// ── Custom Tooltip Component for Heatmap ─────────────────────────────────
const HeatmapTooltip = ({ day }) => {
  if (!day) return null;
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 5, scale: 0.95 }}
      className="absolute -top-12 left-1/2 -translate-x-1/2 bg-[#1F2B4D] text-white text-[11px] font-medium py-1.5 px-3 rounded-xl shadow-[0_0_20px_rgba(31,43,77,0.5)] border border-slate-700/60 whitespace-nowrap pointer-events-none z-50 flex flex-col items-center gap-0.5"
    >
      <span className="font-bold text-amber-300">{format(day.date, 'EEEE, MMM d')}</span>
      <span className="text-[10px] text-slate-300 font-mono">{day.label}</span>
      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#1F2B4D] rotate-45 border-r border-b border-slate-700/60" />
    </motion.div>
  );
};

// ── Animated Counter Component ──────────────────────────────────────────
const AnimatedCounter = ({ value, duration = 2 }) => {
  const nodeRef = React.useRef(null);
  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;
    const controls = animate(0, value, {
      duration: duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate(v) {
        node.textContent = Math.round(v);
      },
    });
    return () => controls.stop();
  }, [value, duration]);
  return <span ref={nodeRef}>{value}</span>;
};

// ── 3D Tilt Card Wrapper ────────────────────────────────────────────────
const TiltCard = ({ children, className }) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 300, damping: 20 });
  const mouseYSpring = useSpring(y, { stiffness: 300, damping: 20 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["7deg", "-7deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-7deg", "7deg"]);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      style={{ rotateX, rotateY }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`tilt-preserve-3d ${className}`}
    >
      {children}
    </motion.div>
  );
};

const FloatingFilterDropdown = ({ 
  options, 
  selectedValue, 
  onSelect, 
  label = "Filter",
  icon: Icon = Filter 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = React.useRef(null);

  const selectedOption = options.find(opt => opt.id === selectedValue) || options[0];

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center justify-between gap-2 px-3 py-1.5 rounded-full bg-[#F0F3F9] border border-[#CBD5E1] text-[11px] font-bold text-[#0f172a] shadow-xs hover:bg-[#E2E8F0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F2B4D] focus-visible:ring-offset-1 transition-all"
      >
        <div className="flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5" />
          <span className="font-mono tracking-wide">{selectedOption?.label}</span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div 
          role="listbox"
          className="absolute right-0 mt-2 w-48 rounded-[16px] bg-white/95 border border-[#EAE7E0] shadow-2xl backdrop-blur-xl z-50 py-1.5 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="max-h-60 overflow-y-auto py-1">
            {options.map((opt) => {
              const isSelected = opt.id === selectedValue;
              return (
                <button
                  key={opt.id}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onSelect(opt.id);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-[11px] flex items-center justify-between transition-colors ${
                    isSelected ? 'bg-[#F0F3F9] text-[#0f172a] font-bold' : 'text-[#111827] hover:bg-[#FAF9F6] hover:text-[#000000] font-semibold'
                  }`}
                >
                  <span className="font-mono uppercase tracking-wider">{opt.label}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#0f172a]" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const EmployeeDashboard = ({ user }) => {
  const [attendance, setAttendance] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [heatmapMonth] = useState(new Date());
  const [chartFilter, setChartFilter] = useState('weekly');


  const greeting = getGreetingDetails();

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const [attRes, leaveRes, balRes] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/attendance/me`, { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/leave/me`, { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/leave/balances`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);
        
        if (attRes.ok) {
          const attData = await attRes.json();
          if (isMounted) setAttendance(Array.isArray(attData) ? attData : []);
        }
        if (leaveRes.ok) {
          const leaveData = await leaveRes.json();
          if (isMounted) setLeaves(Array.isArray(leaveData) ? leaveData : []);
        }
        if (balRes.ok) {
          const balData = await balRes.json();
          if (isMounted) setBalances(Array.isArray(balData) ? balData : []);
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchData();
    return () => { isMounted = false; };
  }, []);

  const streak = useMemo(() => calculateStreak(attendance), [attendance]);
  const chartData = useMemo(() => getInteractiveChartData(attendance, chartFilter), [attendance, chartFilter]);
  const heatmapData = useMemo(() => generateHeatmapData(attendance, leaves), [attendance, leaves]);

  // Biometric unlock banner state
  const [biometricUnlock, setBiometricUnlock] = useState(null); // { unlocked, expiresAt } | null

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/face-registration/unlock-status`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setBiometricUnlock(data); })
      .catch(() => {});
  }, []);


  // Calculate average hours worked in the selected period
  const avgHours = useMemo(() => {
    if (!chartData || chartData.length === 0) return 0;
    const total = chartData.reduce((acc, curr) => acc + (curr.hours || 0), 0);
    return (total / chartData.length).toFixed(1);
  }, [chartData]);

  // Easter Egg Calculation
  const totalAbsentDays = useMemo(() => {
    return attendance.filter(a => a.status === 'Absent').length;
  }, [attendance]);

  // Handle Loading Skeleton State with Shimmer
  if (loading) {
    return (
      <div className="p-6 md:p-10 max-w-[1650px] mx-auto min-h-screen space-y-8 animate-pulse">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-3">
            <div className="h-4 w-40 bg-[#FAF8F5] border border-[#EAE7E0] rounded-full" />
            <div className="h-10 w-80 bg-white border border-[#EAE7E0] rounded-2xl" />
            <div className="h-4 w-96 bg-[#FAF8F5] border border-[#EAE7E0] rounded-lg" />
          </div>
          <div className="h-20 w-56 bg-white border border-[#EAE7E0] rounded-[24px]" />
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2 space-y-8">
            <div className="h-56 bg-white border border-[#EAE7E0] rounded-[28px]" />
            <div className="h-80 bg-white border border-[#EAE7E0] rounded-[28px]" />
          </div>
          <div className="space-y-8">
            <div className="h-72 bg-white border border-[#EAE7E0] rounded-[28px]" />
            <div className="h-64 bg-white border border-[#EAE7E0] rounded-[28px]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="p-6 md:p-10 max-w-[1650px] mx-auto min-h-screen flex flex-col gap-8 font-sans antialiased text-[#000000]"
    >
      
      {/* ── Biometric Unlock Banner ──────────────────────────────────── */}
      {biometricUnlock?.unlocked && (
        <motion.div
          variants={itemVariants}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-amber-50 border border-amber-200 rounded-[20px] px-6 py-4 shadow-sm"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <ScanFace size={20} strokeWidth={2} />
            </div>
            <div>
              <p className="text-sm font-extrabold text-amber-800 tracking-tight">Biometric Update Available</p>
              <p className="text-xs text-amber-700 font-medium mt-0.5">
                Your biometrics have been unlocked for update by an admin.
                {biometricUnlock.expiresAt && (
                  <> Token expires <strong>{new Date(biometricUnlock.expiresAt).toLocaleString('en-IN')}</strong>.</>  
                )}
              </p>
            </div>
          </div>
          <a
            href={`/face-registration?uid=${user?.id}`}
            className="shrink-0 inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-5 py-2.5 rounded-full transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-95 shadow-sm hover:shadow-md whitespace-nowrap"
          >
            <ScanFace size={14} strokeWidth={2.5} />
            Update My Biometrics
          </a>
        </motion.div>
      )}

      {/* Executive Hero Banner & Streak Pill */}
      <motion.div variants={itemVariants} className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          {/* Eyebrow greeting pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[#EAE7E0] shadow-xs mb-3 animate-float">
            <greeting.Icon size={14} className={greeting.badgeBg.split(' ')[1]} />
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#0f172a] font-mono">
              {greeting.text}
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse-glow" />
          </div>

          <h1 className="text-[clamp(2.5rem,4vw,3.5rem)] font-bold text-[#000000] tracking-[-0.03em] font-palagio leading-none">
            Dashboard
          </h1>
          <p className="text-[#111827] text-[clamp(0.9375rem,0.9rem+0.2vw,1.125rem)] font-medium mt-3 max-w-2xl leading-relaxed">
            Welcome back, <strong className="text-[#0f172a] font-bold">{user?.displayName || 'Team Member'}</strong> — here is your real-time attendance, streak & leave policy overview.
          </p>
        </div>

        {/* Current Streak Stat Card - Easter Egg */}
        {totalAbsentDays > 69 && (
          <motion.div variants={itemVariants} className="shrink-0 w-full sm:w-auto">
            <div className="bg-[#F8FAFC] rounded-[20px] border border-[#94A3B8] shadow-sm px-5 py-3 flex items-center justify-between sm:justify-start gap-4 transition-colors">
              <div className="w-12 h-12 rounded-[14px] bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.3)] shrink-0">
                <Flame size={24} className="fill-amber-100 drop-shadow-sm" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-extrabold text-[#4b5563] uppercase tracking-widest font-mono">Work Streak</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                </div>
                <p className="text-[2rem] font-black text-[#0f172a] font-kpi tracking-[-0.04em] mt-0.5 flex items-baseline leading-none">
                  <AnimatedCounter value={streak} /> <span className="text-[10px] font-extrabold text-[#111827] font-mono uppercase tracking-widest ml-1.5">Days Active</span>
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Left Column (Wider Primary Workspace) */}
        <div className="xl:col-span-2 flex flex-col gap-8">
          
          {/* Doppelrand Leave Policy Balance Cards */}
          <motion.div variants={itemVariants}>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3.5">
                <div className="w-[44px] h-[44px] rounded-[14px] bg-gradient-to-b from-white to-[#F8FAFC] border border-[#CBD5E1]/80 flex items-center justify-center text-[#3654F0] shadow-[0_4px_12px_-2px_rgba(54,84,240,0.2),0_1px_2px_rgba(15,23,42,0.05)] shrink-0">
                  <CalendarIcon size={20} />
                </div>
                <div className="title-text">
                  <h2 className="text-[26px] font-semibold text-[#0f172a] font-palagio tracking-tight margin-0 leading-tight">
                    Leave Balances
                  </h2>
                  <p className="text-[13px] text-[#64748B] font-sans mt-0.5 font-medium">
                    {balances.length} leave types · resets Jan 1
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <span className="font-mono text-[12px] font-semibold bg-white border border-[#CBD5E1]/80 text-[#475569] px-4 py-2 rounded-full inline-flex items-center gap-1.5 shadow-2xs">
                  {balances.length} Policies Configured
                </span>
                <Link
                  to="/dashboard/time-off"
                  className="font-sans font-semibold text-[14px] bg-gradient-to-b from-[#1E293B] to-[#0F172A] hover:from-black hover:to-[#0F172A] text-white px-5 py-2.5 rounded-full inline-flex items-center gap-2 transition-all duration-200 shadow-[0_4px_14px_rgba(15,23,42,0.25)] hover:shadow-[0_6px_20px_rgba(15,23,42,0.35)] hover:-translate-y-0.5 active:translate-y-0 group"
                >
                  <span>Request Leave</span>
                  <ArrowUpRight size={15} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              {balances.length === 0 ? (
                <div className="p-1.5 bg-[#F4F1EA] rounded-[26px] border border-[#EAE7E0] col-span-full">
                  <div className="bg-white rounded-[20px] p-10 text-center">
                    <AlertCircle size={32} className="text-[#4b5563] mx-auto mb-2 opacity-60" />
                    <p className="text-sm text-[#111827] font-medium">No leave policies allocated yet.</p>
                  </div>
                </div>
              ) : (
                balances.map((bal, idx) => {
                  const denominator = bal.allocated > 0 ? bal.allocated : bal.annualQuota;
                  
                  // Palette theme helper matching the new design spec
                  const getColorTheme = (name = '', i = 0) => {
                    const n = name.toLowerCase();
                    if (n.includes('annual')) return { color: '#3654F0', tint: '#EAEDFE' };
                    if (n.includes('sick')) return { color: '#D64550', tint: '#FBEAEB' };
                    if (n.includes('casual') || n.includes('valo')) return { color: '#12876F', tint: '#E7F5F1' };
                    if (n.includes('comp')) return { color: '#7C4DE0', tint: '#F1EAFB' };
                    
                    const themes = [
                      { color: '#3654F0', tint: '#EAEDFE' },
                      { color: '#D64550', tint: '#FBEAEB' },
                      { color: '#12876F', tint: '#E7F5F1' },
                      { color: '#7C4DE0', tint: '#F1EAFB' },
                    ];
                    return themes[i % themes.length];
                  };

                  const theme = getColorTheme(bal.policyName, idx);
                  const ticksCount = Math.min(denominator, 25);
                  
                  return (
                    <motion.div
                      key={bal.policyGroupId || idx}
                      variants={itemVariants}
                      className="h-full"
                    >
                      <div className="bg-white rounded-[24px] border border-[#E2E8F0] shadow-[0_10px_30px_-5px_rgba(0,0,0,0.06),0_4px_10px_-2px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_40px_-5px_rgba(0,0,0,0.12)] hover:border-[#3654F0]/50 hover:-translate-y-1 transition-all duration-300 p-[28px] flex flex-col justify-between h-full group">
                        <div className="flex flex-col justify-between h-full">
                          <div>
                              {/* Card Head: Swatch + Type Name & Quota Badge */}
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-2.5">
                                <span className="w-2.5 h-2.5 rounded-[3px] shrink-0 shadow-2xs" style={{ background: theme.color }} />
                                <span className="font-palagio italic font-bold text-[18px] tracking-wide text-black">
                                  {bal.policyName}
                                </span>
                              </div>
                              <span 
                                className="font-mono text-[11px] font-bold px-3.5 py-1 rounded-full whitespace-nowrap border border-current/15 shadow-2xs"
                                style={{ background: theme.tint, color: theme.color }}
                              >
                                Quota {denominator}d
                              </span>
                            </div>

                            {/* Count Row: Big Number + Days Available */}
                            <div className="flex items-baseline gap-2.5 mb-1.5">
                              <span className="font-sans font-black text-[44px] leading-none tracking-tight text-black">
                                <AnimatedCounter value={bal.available} />
                              </span>
                              <span className="font-mono text-[11px] font-extrabold text-[#1e293b] uppercase tracking-[0.06em]">
                                days available
                              </span>
                            </div>

                            {/* Stats Row: Used & Pending */}
                            <div className="flex items-center gap-5 my-3.5 text-[13px] text-[#1e293b]">
                              <span className="flex items-center font-medium">
                                <span className="w-2 h-2 rounded-full inline-block mr-1.5" style={{ background: theme.color }} />
                                Used <b className="text-black font-bold ml-1 font-mono"><AnimatedCounter value={bal.used} />d</b>
                              </span>
                              <span className="flex items-center font-medium">
                                <span className="w-2 h-2 rounded-full inline-block mr-1.5 bg-[#64748B]" />
                                Pending <b className="text-black font-bold ml-1 font-mono">{bal.pending || 0}d</b>
                              </span>
                            </div>

                            {/* Tickbar: Signature Day-Tick Bar */}
                            <div className="flex gap-1.5 mt-2.5">
                              {Array.from({ length: ticksCount }, (_, i) => {
                                const isFilled = i < Math.round((bal.used / denominator) * ticksCount);
                                return (
                                  <div 
                                    key={i} 
                                    className="h-[10px] flex-1 rounded-[3px] transition-all duration-300"
                                    style={{ 
                                      background: isFilled ? theme.color : '#E2E8F0' 
                                    }} 
                                  />
                                );
                              })}
                            </div>
                            <div className="flex justify-between items-center mt-2.5 font-mono text-[11px] font-semibold text-[#475569]">
                              <span>0</span>
                              <span>{denominator}d quota</span>
                            </div>
                          </div>

                          {/* Card Foot: History Link + Mini Request Button */}
                          <div className="mt-5 pt-4 border-t border-[#E4E6EF] flex justify-between items-center">
                            <Link 
                              to="/dashboard/time-off" 
                              className="text-[13px] font-bold text-[#0f172a] hover:text-black transition-colors inline-flex items-center gap-1 group/link"
                            >
                              <span>View history</span>
                              <ArrowUpRight size={14} className="group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" />
                            </Link>
                            <Link 
                              to="/dashboard/time-off"
                              className="font-sans text-[12px] font-bold bg-transparent hover:bg-black hover:text-white border border-slate-300 hover:border-black text-black px-4 py-1.5 rounded-full transition-all shadow-2xs"
                            >
                              + Request
                            </Link>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </motion.div>

          {/* Performance Matrix Chart Card */}
          <motion.div variants={itemVariants} className="bg-white rounded-[24px] p-6 md:p-7 border border-[#E2E8F0] shadow-[0_10px_30px_-5px_rgba(0,0,0,0.06),0_4px_10px_-2px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_40px_-5px_rgba(0,0,0,0.12)] hover:border-[#334155]/30 hover:-translate-y-1 transition-all duration-300 flex flex-col min-h-[400px]">
              
              {/* Chart Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                  <h3 className="text-[clamp(1.125rem,1rem+0.5vw,1.375rem)] font-bold text-[#000000] flex items-center gap-2.5 font-palagio tracking-tight leading-snug">
                    <BarChart2 size={20} className="text-[#0f172a]" />
                    Performance Matrix
                  </h3>
                  <p className="text-[clamp(0.75rem,0.7rem+0.2vw,0.875rem)] text-[#111827] mt-1 font-medium leading-relaxed">Activity and output metrics</p>
                </div>

                <div className="flex items-center gap-3">
                  <FloatingFilterDropdown 
                    options={[
                      { id: 'weekly', label: 'Last 7 Days' },
                      { id: 'monthly', label: 'Last 30 Days' },
                      { id: 'yearly', label: 'Last 12 Months' }
                    ]}
                    selectedValue={chartFilter}
                    onSelect={setChartFilter}
                  />
                  <span className="text-xs font-bold text-[#0f172a] bg-[#F0F3F9] px-3 py-1.5 rounded-full border border-[#CBD5E1] font-mono whitespace-nowrap">
                    Avg: {avgHours} hrs
                  </span>
                </div>
              </div>
              
              {/* Recharts Container */}
              <div className="flex-1 w-full min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="activeBarGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#E2E8F0" stopOpacity={0.6} />
                        <stop offset="100%" stopColor="#F1F5F9" stopOpacity={0.2} />
                      </linearGradient>
                      <linearGradient id="colorOutput" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                      </linearGradient>
                      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="4" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>
                    </defs>
                    
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EAE7E0" opacity={0.6} />
                    
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#6B655C', fontSize: 11, fontWeight: 600, fontFamily: 'monospace' }} 
                      dy={10} 
                    />
                    
                    <YAxis 
                      yAxisId="left"
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#9A948A', fontSize: 10, fontWeight: 500 }}
                      domain={[0, 100]}
                    />
                    
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#9A948A', fontSize: 10, fontWeight: 500 }}
                      domain={[0, 'auto']}
                    />
                    
                    <Tooltip 
                      cursor={{ fill: '#F4F1EA', opacity: 0.4 }}
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-[#EAE7E0] text-xs font-sans space-y-3 min-w-[160px]">
                              <p className="font-bold text-[#000000] border-b border-[#EAE7E0] pb-2 mb-2">{data.fullDate}</p>
                              
                              <div className="flex justify-between items-center gap-4">
                                <span className="text-[#111827] font-semibold flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#3B82F6]" /> Peak Output</span>
                                <span className="font-mono font-bold text-[#3B82F6]">{data.peakOutput}%</span>
                              </div>
                              
                              <div className="flex justify-between items-center gap-4">
                                <span className="text-[#111827] font-semibold flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#10B981]" /> Score</span>
                                <span className="font-mono font-bold text-[#10B981]">{data.score}%</span>
                              </div>
                              
                              <div className="flex justify-between items-center gap-4">
                                <span className="text-[#111827] font-semibold flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#F97316]" /> Lead Time</span>
                                <span className="font-mono font-bold text-[#F97316]">{data.leadTime}</span>
                              </div>
                              
                              <div className="flex justify-between items-center pt-2 border-t border-[#EAE7E0]/60 gap-4">
                                <span className="text-[#4b5563] font-medium">Hours Logged</span>
                                <span className="font-mono font-bold text-[#111827]">{data.hours}h</span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    
                    {/* Background Bars for volume context */}
                    <Bar yAxisId="right" dataKey="hours" fill="url(#activeBarGradient)" radius={[6, 6, 0, 0]} barSize={32} />
                    
                    {/* Secondary Metrics */}
                    <Area yAxisId="left" type="monotone" dataKey="score" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorScore)" isAnimationActive={true} />
                    
                    {/* Tertiary Metric */}
                    <Line yAxisId="right" type="monotone" dataKey="leadTime" stroke="#F97316" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3, fill: "#F97316", strokeWidth: 0 }} isAnimationActive={true} />
                    
                    {/* Primary Hero Metric */}
                    <Area yAxisId="left" type="monotone" dataKey="peakOutput" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorOutput)" filter="url(#glow)" activeDot={{ r: 6, fill: "#3B82F6", stroke: "#fff", strokeWidth: 2 }} isAnimationActive={true} />
                    
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
          </motion.div>

        </div>

        {/* Right Column (Secondary Widgets & Matrix) */}
        <div className="flex flex-col gap-8">
          
          {/* Month Attendance Heatmap Widget */}
          <motion.div variants={itemVariants} className="bg-white rounded-[24px] p-5 border border-[#E2E8F0] shadow-[0_10px_30px_-5px_rgba(0,0,0,0.06),0_4px_10px_-2px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_40px_-5px_rgba(0,0,0,0.12)] hover:border-[#334155]/30 hover:-translate-y-1 transition-all duration-300">
              
              {/* Heatmap Header */}
              <div className="flex justify-between items-center mb-3.5">
                <h3 className="text-[10px] font-extrabold text-[#000000] uppercase tracking-[0.1em] flex items-center gap-2 font-mono">
                  <CalendarDays size={16} className="text-[#0f172a]" />
                  This Month
                </h3>
                <span className="text-xs font-bold text-[#0f172a] bg-[#F0F3F9] px-3 py-1 rounded-full border border-[#CBD5E1] font-mono">
                  {format(heatmapMonth, 'MMMM yyyy')}
                </span>
              </div>
              
              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-2 mb-3.5">
                {['S','M','T','W','T','F','S'].map((d, i) => (
                  <div key={i} className="text-[11px] font-bold text-[#4b5563] text-center font-mono">{d}</div>
                ))}
                
                {/* Padding for start of month */}
                {Array.from({ length: new Date(new Date().getFullYear(), new Date().getMonth(), 1).getDay() }).map((_, i) => (
                  <div key={`pad-${i}`} className="aspect-square" />
                ))}

                {heatmapData.map((day, i) => {
                  let bgColor = 'bg-[#F0EEE9]'; // Default
                  if (day.status === 'present') {
                    bgColor = day.level === 3 ? 'bg-[#10B981] shadow-xs ring-1 ring-emerald-600' : 'bg-emerald-400';
                  } else if (day.status === 'leave') {
                    bgColor = 'bg-amber-400';
                  } else if (day.status === 'absent') {
                    bgColor = 'bg-rose-400';
                  } else if (day.status === 'weekend') {
                    bgColor = 'bg-[#FAF9F6] border border-[#EAE7E0]';
                  }

                  return (
                    <motion.div 
                      key={i} 
                      className="relative flex justify-center items-center group aspect-square"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: i * 0.015, type: 'spring', stiffness: 300 }}
                    >
                      <motion.div 
                        whileHover={{ scale: 1.5, zIndex: 50, rotate: [-2, 2, 0] }}
                        transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                        className={`w-full h-full rounded-lg ${bgColor} cursor-pointer transition-colors shadow-sm`} 
                      />
                      <AnimatePresence>
                        <div className="hidden group-hover:block absolute z-50">
                          <HeatmapTooltip day={day} />
                        </div>
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>

              {/* Heatmap Legend */}
              <div className="flex justify-between items-center text-[10px] text-[#111827] font-bold uppercase tracking-wider pt-2 border-t border-[#EAE7E0] font-mono">
                <span>Less</span>
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-xs bg-[#F0EEE9] border border-[#EAE7E0]" title="No Activity" />
                  <div className="w-3 h-3 rounded-xs bg-amber-400" title="On Leave" />
                  <div className="w-3 h-3 rounded-xs bg-emerald-400" title="Present" />
                  <div className="w-3 h-3 rounded-xs bg-[#10B981]" title="Present Overtime" />
                </div>
                <span>More</span>
              </div>
          </motion.div>

          {/* Upcoming Holidays Widget */}
          <motion.div variants={itemVariants} className="bg-white rounded-[24px] p-5 border border-[#E2E8F0] shadow-[0_10px_30px_-5px_rgba(0,0,0,0.06),0_4px_10px_-2px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_40px_-5px_rgba(0,0,0,0.12)] hover:border-[#334155]/30 hover:-translate-y-1 transition-all duration-300 flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-2.5">
                <h3 className="text-[10px] font-extrabold text-[#000000] uppercase tracking-[0.1em] flex items-center gap-2 font-mono">
                  <CheckCircle2 size={16} className="text-[#10B981]" />
                  Upcoming Holidays
                </h3>
                <span className="text-[10px] font-bold text-[#111827] bg-[#FAF8F5] px-2.5 py-0.5 rounded-full border border-[#EAE7E0] font-mono">
                  2026 Calendar
                </span>
              </div>

              <div className="space-y-2 flex-1">
                {HOLIDAYS.filter(h => new Date(h.date) >= new Date()).slice(0, 4).map((holiday, i) => {
                  const daysUntil = differenceInDays(parseISO(holiday.date), new Date());
                  return (
                    <motion.div 
                      key={i}
                      whileHover={{ x: 3 }}
                      transition={{ type: 'spring', stiffness: 300 }}
                      className="flex items-center justify-between p-3 rounded-2xl bg-[#FAF8F5] border border-[#EAE7E0] hover:border-[#1F2B4D]/30 hover:bg-white transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-white border border-[#EAE7E0] text-[#0f172a] flex items-center justify-center shrink-0 shadow-2xs font-bold text-xs font-mono">
                          {format(parseISO(holiday.date), 'dd')}
                        </div>
                        <div>
                          <p className="text-[clamp(0.8125rem,0.8rem+0.1vw,0.875rem)] font-bold text-[#000000] font-sans leading-tight mb-0.5">{holiday.name}</p>
                          <p className="text-[10px] font-medium text-[#111827] font-mono tracking-wide">
                            {format(parseISO(holiday.date), 'MMMM do, yyyy')}
                          </p>
                        </div>
                      </div>

                      <span className="text-[10px] font-extrabold text-[#0f172a] bg-[#F0F3F9] px-2.5 py-1 rounded-full border border-[#CBD5E1] font-mono shrink-0">
                        {daysUntil === 0 ? 'Today' : `In ${daysUntil}d`}
                      </span>
                    </motion.div>
                  );
                })}
              </div>

              {/* Quick Navigation Footer */}
              <div className="pt-4 border-t border-[#EAE7E0] mt-4 flex justify-between items-center text-xs">
                <Link 
                  to="/dashboard/attendance"
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#F0F3F9] hover:bg-[#E2E8F0] text-[#0f172a] border border-[#CBD5E1] rounded-xl font-bold transition-all active:scale-[0.98] font-sans"
                >
                  <span>View Full Attendance Log</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
          </motion.div>

        </div>
      </div>
    </motion.div>
  );
};

export default EmployeeDashboard;
