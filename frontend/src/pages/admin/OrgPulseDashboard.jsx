import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Users, Flame, CreditCard, Clock, ArrowUpRight, ArrowDownRight, Radio, AlertTriangle } from 'lucide-react';
import { io } from 'socket.io-client';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { format } from 'date-fns';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ColocationNetworkGraph } from '../../components/charts/ColocationNetworkGraph';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const OrgPulseDashboard = () => {
  const containerRef = useRef(null);
  const [pulseData, setPulseData] = useState({
    headcount: 0,
    burnRate: 0,
    cumulativeCost: 0,
    rollingHistory: [],
    recentEvents: []
  });
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [attritionData, setAttritionData] = useState([]);
  const [loadingAttrition, setLoadingAttrition] = useState(true);
  const [colocationData, setColocationData] = useState({ nodes: [], links: [] });
  const [loadingColocation, setLoadingColocation] = useState(true);

  // Ethereal GSAP Intro & Ambient Breathing Choreography
  useGSAP(() => {
    if (loading) return;

    const tl = gsap.timeline({ defaults: { ease: "power2.out" } });

    // 1. Soft Drifting Entrance
    tl.fromTo('.cinematic-header', 
      { opacity: 0, y: 40 },
      { opacity: 1, y: 0, duration: 1 }
    )
    .fromTo('.cinematic-kpi', 
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.9, stagger: 0.1 },
      "-=0.7"
    )
    .fromTo('.cinematic-panel', 
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.9, stagger: 0.15 },
      "-=0.5"
    );

    // 2. Ultra-Soft Continuous Breathing
    gsap.to('.ambient-float', {
      y: "-=3",
      duration: 5,
      ease: "sine.inOut",
      yoyo: true,
      repeat: -1,
      delay: 1.5,
      stagger: 0.4
    });

  }, { scope: containerRef, dependencies: [loading] });

  const fetchColocationNetwork = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/colocation/network`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setColocationData(data);
      }
    } catch (err) {
      console.error('Failed to load colocation graph data:', err);
    } finally {
      setLoadingColocation(false);
    }
  };

  useEffect(() => {
    fetchColocationNetwork();
  }, []);

  // Fetch attrition risk
  useEffect(() => {
    const fetchAttritionRisk = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/api/analytics/attrition-risk`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setAttritionData(data);
        }
      } catch (err) {
        console.error('Failed to load attrition risk data:', err);
      } finally {
        setLoadingAttrition(false);
      }
    };
    fetchAttritionRisk();
  }, []);

  // Ticker for current system clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch initial snapshot
  const fetchSnapshot = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/pulse/live`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPulseData(data);
      }
    } catch (err) {
      console.error('Failed to load pulse snapshot:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSnapshot();

    const socket = io(API_BASE, {
      auth: { token: localStorage.getItem('token') },
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));
    socket.on('pulse:update', (updatedState) => setPulseData(updatedState));

    return () => socket.disconnect();
  }, []);

  const attendanceVelocity = useMemo(() => {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    return pulseData.recentEvents.filter(
      ev => ev.type === 'checkin' && ev.timestamp >= oneHourAgo
    ).length;
  }, [pulseData.recentEvents]);

  const formattedHistory = useMemo(() => {
    return pulseData.rollingHistory.map(pt => ({
      ...pt,
      formattedTime: format(new Date(pt.timestamp), 'HH:mm:ss')
    }));
  }, [pulseData.rollingHistory]);

  const getRelativeTime = (timestamp) => {
    const diffMs = Date.now() - timestamp;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins === 1) return '1m ago';
    return `${diffMins}m ago`;
  };

  // Ethereal Hover CSS classes
  // transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
  const etherealHoverClasses = "transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-[1.03] hover:-translate-y-2 hover:-rotate-1 hover:shadow-[0_20px_60px_rgba(100,116,139,0.12)] hover:border-white";

  return (
    <div ref={containerRef} className="p-4 md:p-8 lg:p-12 space-y-8 bg-[#FAF9F6] min-h-screen font-sans">
      
      {/* Live Stream Header */}
      <div className="cinematic-header flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            {/* Swapped #1D1B16 for slate-700 */}
            <h1 className="text-[32px] font-extrabold text-slate-700 tracking-tight leading-none">Live Org Pulse</h1>
            <BadgeConnection isConnected={isConnected} />
          </div>
          <p className="text-slate-500 text-[14px] font-medium tracking-tight">
            Real-time headcount monitoring, cost burn tracking, and active attendance feed.
          </p>
        </div>
        <div className="flex items-center gap-3 text-[13px] font-bold text-slate-600 bg-white/80 backdrop-blur-md ring-1 ring-slate-200/50 shadow-[0_2px_10px_rgb(0,0,0,0.02)] px-4 py-2.5 rounded-[16px]">
          <Clock size={16} className="text-slate-400" />
          <span>{format(currentTime, 'PPPP p')}</span>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex items-center justify-center">
          <span className="text-[12px] font-bold text-slate-400 tracking-[0.2em] uppercase">Initializing Pulse...</span>
        </div>
      ) : (
        <>
          {/* KPI Dashboard Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Live Headcount */}
            <div className={`cinematic-kpi ambient-float p-6 bg-white/90 backdrop-blur-sm ring-1 ring-slate-100 rounded-[24px] shadow-[0_4px_24px_rgba(148,163,184,0.04)] ${etherealHoverClasses} flex flex-col justify-between`}>
              <div className="flex justify-between items-start">
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-400 tracking-[0.1em] uppercase">Live Headcount</span>
                  <span className="text-[36px] font-black tracking-tighter leading-none block bg-clip-text text-transparent bg-gradient-to-br from-slate-700 to-slate-400">{pulseData.headcount}</span>
                </div>
                <div className="p-3 bg-emerald-50/80 rounded-[16px] text-emerald-500">
                  <Users size={22} strokeWidth={2.5} />
                </div>
              </div>
              <div className="mt-6 flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                </span>
                <span className="text-[12px] font-bold text-slate-500">Stream updating instantly</span>
              </div>
            </div>

            {/* Hourly Burn Rate */}
            <div className={`cinematic-kpi ambient-float p-6 bg-white/90 backdrop-blur-sm ring-1 ring-slate-100 rounded-[24px] shadow-[0_4px_24px_rgba(148,163,184,0.04)] ${etherealHoverClasses} flex flex-col justify-between`}>
              <div className="flex justify-between items-start">
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-400 tracking-[0.1em] uppercase">Hourly Burn Rate</span>
                  <span className="text-[36px] font-black tracking-tighter leading-none block bg-clip-text text-transparent bg-gradient-to-br from-slate-700 to-slate-400">
                    ₹{pulseData.burnRate.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </span>
                </div>
                <div className="p-3 bg-rose-50/80 rounded-[16px] text-rose-400">
                  <Flame size={22} strokeWidth={2.5} />
                </div>
              </div>
              <div className="mt-6 text-[11px] font-bold text-slate-400 tracking-[0.05em] uppercase bg-slate-50/80 border border-slate-100/50 py-1 px-3 rounded-[8px] self-start">
                * Live Estimate
              </div>
            </div>

            {/* Today's Accrued Cost */}
            <div className={`cinematic-kpi ambient-float p-6 bg-white/90 backdrop-blur-sm ring-1 ring-slate-100 rounded-[24px] shadow-[0_4px_24px_rgba(148,163,184,0.04)] ${etherealHoverClasses} flex flex-col justify-between`}>
              <div className="flex justify-between items-start">
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-400 tracking-[0.1em] uppercase">Accrued Today</span>
                  <span className="text-[36px] font-black tracking-tighter leading-none block bg-clip-text text-transparent bg-gradient-to-br from-slate-700 to-slate-400">
                    ₹{pulseData.cumulativeCost.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </span>
                </div>
                <div className="p-3 bg-indigo-50/80 rounded-[16px] text-indigo-400">
                  <CreditCard size={22} strokeWidth={2.5} />
                </div>
              </div>
              <div className="mt-6 text-[12px] font-bold text-slate-500 flex items-center gap-1.5">
                <Activity size={14} strokeWidth={2.5} className="text-indigo-400" />
                Accruing by minute
              </div>
            </div>

            {/* Attendance Velocity */}
            <div className={`cinematic-kpi ambient-float p-6 bg-white/90 backdrop-blur-sm ring-1 ring-slate-100 rounded-[24px] shadow-[0_4px_24px_rgba(148,163,184,0.04)] ${etherealHoverClasses} flex flex-col justify-between`}>
              <div className="flex justify-between items-start">
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-400 tracking-[0.1em] uppercase">Pulse Velocity</span>
                  <span className="text-[36px] font-black tracking-tighter leading-none block bg-clip-text text-transparent bg-gradient-to-br from-slate-700 to-slate-400">{attendanceVelocity}</span>
                </div>
                <div className="p-3 bg-amber-50/80 rounded-[16px] text-amber-500">
                  <Activity size={22} strokeWidth={2.5} />
                </div>
              </div>
              <div className="mt-6 text-[12px] font-bold text-slate-500">
                Check-ins last 60 mins
              </div>
            </div>
          </div>

          {/* Interactive Chart & Live Ticker */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Live Chart */}
            <div className={`cinematic-panel lg:col-span-2 p-7 bg-white/90 backdrop-blur-sm ring-1 ring-slate-100 shadow-[0_4px_24px_rgba(148,163,184,0.04)] rounded-[24px] flex flex-col transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:shadow-[0_20px_60px_rgba(100,116,139,0.08)] hover:-translate-y-1 hover:border-white`}>
              <div className="mb-8 flex justify-between items-center">
                <div>
                  <h3 className="text-[20px] font-extrabold text-slate-700 tracking-tight flex items-center gap-2 mb-1">
                    <Activity className="text-slate-400" size={20} strokeWidth={2.5} />
                    Live Activity Matrix
                  </h3>
                  <p className="text-[13px] text-slate-500 font-medium">Real-time rolling snapshot timeline</p>
                </div>
              </div>

              <div className="flex-1 w-full min-h-[340px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={formattedHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorHeadcount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorBurnRate" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#fb7185" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#fb7185" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    {/* Softened Gridlines */}
                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="formattedTime" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 'bold' }}
                      dy={10}
                    />
                    <YAxis 
                      yAxisId="left"
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 'bold' }}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 'bold' }}
                    />
                    {/* Softened Tooltip */}
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 8px 30px rgba(100,116,139,0.1)', backgroundColor: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)', padding: '12px' }}
                      labelStyle={{ fontWeight: '800', color: '#475569', marginBottom: '8px' }}
                      itemStyle={{ fontWeight: '600', fontSize: '13px' }}
                    />
                    <Area 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="headcount" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorHeadcount)" 
                      name="Active Headcount"
                    />
                    <Area 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="burnRate" 
                      stroke="#fb7185" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorBurnRate)" 
                      name="Hourly Burn (₹)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Live Ticker Feed */}
            <div className={`cinematic-panel p-7 bg-white/90 backdrop-blur-sm ring-1 ring-slate-100 shadow-[0_4px_24px_rgba(148,163,184,0.04)] rounded-[24px] flex flex-col h-[480px] transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:shadow-[0_20px_60px_rgba(100,116,139,0.08)] hover:-translate-y-1 hover:border-white`}>
              <div className="mb-6">
                <h3 className="text-[20px] font-extrabold text-slate-700 tracking-tight flex items-center gap-2 mb-1">
                  <Radio className="text-slate-400 animate-pulse" size={20} strokeWidth={2.5} />
                  Live Activity Feed
                </h3>
                <p className="text-[13px] text-slate-500 font-medium">Real-time check-in events</p>
              </div>

              <div className="flex-grow overflow-y-auto space-y-3 custom-scrollbar pr-2">
                <AnimatePresence initial={false} mode="popLayout">
                  {pulseData.recentEvents.length === 0 ? (
                    <motion.div 
                      key="empty"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="flex items-center justify-center h-full text-[12px] text-slate-400 font-bold uppercase tracking-wider"
                    >
                      Listening for events...
                    </motion.div>
                  ) : (
                    pulseData.recentEvents.map((event) => {
                      const initials = event.displayName.split(/\s+/).map(n => n[0]).join('').substring(0, 2).toUpperCase();
                      const isCheckin = event.type === 'checkin';
                      return (
                        <motion.div
                          layout
                          key={event.timestamp + '-' + event.userId}
                          initial={{ opacity: 0, scale: 0.9, y: -20 }}
                          animate={{ opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 400, damping: 25 } }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="group flex items-center gap-3.5 p-3 rounded-[16px] bg-slate-50/50 backdrop-blur-sm border border-slate-100/50 hover:scale-[1.02] hover:bg-white hover:shadow-[0_8px_20px_rgba(148,163,184,0.1)] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
                        >
                          <div className="relative shrink-0">
                            {event.avatarUrl ? (
                              <img src={event.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover shadow-sm ring-2 ring-white" />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-white border border-slate-100 shadow-sm flex items-center justify-center text-[12px] font-bold text-slate-600">
                                {initials}
                              </div>
                            )}
                            <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-white flex items-center justify-center ${
                              isCheckin ? 'bg-emerald-400' : 'bg-rose-400'
                            }`} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <span className="font-bold text-[14px] text-slate-700 block truncate leading-tight mb-0.5">{event.displayName}</span>
                            <span className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.05em] block truncate">{event.department}</span>
                          </div>

                          <div className="flex flex-col items-end gap-1.5 shrink-0">
                            {isCheckin ? (
                              <span className="text-[10px] font-extrabold uppercase bg-emerald-50/80 text-emerald-600 ring-1 ring-emerald-200/50 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                                <ArrowUpRight size={12} strokeWidth={3} />
                                In
                              </span>
                            ) : (
                              <span className="text-[10px] font-extrabold uppercase bg-rose-50/80 text-rose-500 ring-1 ring-rose-200/50 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                                <ArrowDownRight size={12} strokeWidth={3} />
                                Out
                              </span>
                            )}
                            <span className="text-[10px] text-slate-400 font-bold whitespace-nowrap">{getRelativeTime(event.timestamp)}</span>
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Attrition & Burnout Risk Panel */}
          <div className={`cinematic-panel mt-8 p-7 bg-white/90 backdrop-blur-sm ring-1 ring-slate-100 shadow-[0_4px_24px_rgba(148,163,184,0.04)] rounded-[24px] flex flex-col transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:shadow-[0_20px_60px_rgba(100,116,139,0.08)] hover:-translate-y-1 hover:border-white`}>
            <div className="mb-6 flex justify-between items-center">
              <div>
                <h3 className="text-[20px] font-extrabold text-slate-700 tracking-tight flex items-center gap-2 mb-1">
                  <AlertTriangle className="text-rose-400" size={20} strokeWidth={2.5} />
                  Attrition & Burnout Risk Radar
                </h3>
                <p className="text-[13px] text-slate-500 font-medium">Identifies employees with elevated risk based on workload variance.</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[600px] border-collapse">
                <thead>
                  <tr className="border-b border-slate-100/50">
                    <th className="px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em]">Employee</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em]">Department</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em]">Risk Score</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em]">Risk Label</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em]">Last Computed</th>
                  </tr>
                </thead>
                <tbody className="space-y-2 relative top-2">
                  {loadingAttrition ? (
                    <tr><td colSpan="5" className="py-8 text-center text-slate-400 text-[13px] font-bold">Scanning parameters...</td></tr>
                  ) : attritionData.length === 0 ? (
                    <tr><td colSpan="5" className="py-8 text-center text-slate-400 text-[13px] font-bold">No risk anomalies detected.</td></tr>
                  ) : (
                    attritionData.map(user => {
                      let badgeClasses = 'bg-slate-50/50 text-slate-500 ring-slate-200/50';
                      if (user.attritionRiskLabel === 'Critical') badgeClasses = 'bg-rose-50/80 text-rose-600 ring-rose-200/50';
                      else if (user.attritionRiskLabel === 'High') badgeClasses = 'bg-orange-50/80 text-orange-600 ring-orange-200/50';
                      else if (user.attritionRiskLabel === 'Moderate') badgeClasses = 'bg-amber-50/80 text-amber-600 ring-amber-200/50';
                      else if (user.attritionRiskLabel === 'Low') badgeClasses = 'bg-emerald-50/80 text-emerald-500 ring-emerald-200/50';

                      return (
                        <tr key={user.id} className="group hover:bg-gradient-to-r hover:from-white hover:to-slate-50/50 hover:shadow-[0_8px_20px_rgba(148,163,184,0.06)] hover:scale-[1.01] hover:-translate-y-0.5 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] cursor-default">
                          <td className="px-4 py-3.5 rounded-l-[16px]">
                            <span className="text-[14px] font-bold text-slate-700">{user.displayName}</span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="text-[13px] font-semibold text-slate-500">{user.department || '-'}</span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="text-[13px] font-bold font-mono text-slate-600 bg-white ring-1 ring-slate-100 px-2 py-1 rounded-md shadow-sm">
                              {user.attritionRiskScore !== null ? user.attritionRiskScore : '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            {user.attritionRiskLabel ? (
                              <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-[0.05em] ring-1 shadow-sm inline-block ${badgeClasses}`}>
                                {user.attritionRiskLabel}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[12px] font-bold italic">Unscored</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 rounded-r-[16px]">
                            <span className="text-[13px] font-semibold text-slate-400">
                              {user.riskUpdatedAt ? new Date(user.riskUpdatedAt).toLocaleDateString() : '-'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Colocation Network Graph Panel */}
          <div className="cinematic-panel mt-8">
            <ColocationNetworkGraph
              data={colocationData}
              loading={loadingColocation}
              onRefresh={fetchColocationNetwork}
            />
          </div>

        </>
      )}
    </div>
  );
};

const BadgeConnection = ({ isConnected }) => {
  return isConnected ? (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.1em] bg-emerald-50/80 text-emerald-600 ring-1 ring-emerald-200/50 py-1 px-2.5 rounded-full shadow-sm">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
      Connected
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.1em] bg-amber-50/80 text-amber-600 ring-1 ring-amber-200/50 py-1 px-2.5 rounded-full shadow-sm animate-pulse">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
      Reconnecting
    </span>
  );
};

export default OrgPulseDashboard;
