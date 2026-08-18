import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Users, Flame, CreditCard, Clock, ArrowUpRight, ArrowDownRight, Radio, AlertTriangle, Sparkles, X } from 'lucide-react';
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

  // AI Risk Explanation State
  const [explainingRiskId, setExplainingRiskId] = useState(null);
  const [riskExplanation, setRiskExplanation] = useState(null);

  // Ethereal GSAP Intro & Ambient Breathing Choreography (Safely Guarded)
  useGSAP(() => {
    if (loading) return;

    const container = containerRef.current;
    if (!container) return;

    const cinematicHeader = container.querySelector('.cinematic-header');
    const cinematicKpis = container.querySelectorAll('.cinematic-kpi');
    const cinematicPanels = container.querySelectorAll('.cinematic-panel');
    const ambientFloats = container.querySelectorAll('.ambient-float');

    const tl = gsap.timeline({ defaults: { ease: "power2.out" } });

    if (cinematicHeader) {
      tl.fromTo(cinematicHeader, 
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.8 }
      );
    }
    if (cinematicKpis.length > 0) {
      tl.fromTo(cinematicKpis, 
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.7, stagger: 0.08 },
        "-=0.5"
      );
    }
    if (cinematicPanels.length > 0) {
      tl.fromTo(cinematicPanels, 
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.7, stagger: 0.1 },
        "-=0.4"
      );
    }

    if (ambientFloats.length > 0) {
      gsap.to(ambientFloats, {
        y: "-=3",
        duration: 5,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
        delay: 1.5,
        stagger: 0.4
      });
    }

  }, { scope: containerRef, dependencies: [loading] });

  const fetchColocationNetwork = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/colocation/network`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setColocationData(data || { nodes: [], links: [] });
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
          setAttritionData(data || []);
        }
      } catch (err) {
        console.error('Failed to load attrition risk data:', err);
      } finally {
        setLoadingAttrition(false);
      }
    };
    fetchAttrition();
  }, []);

  const handleExplainRisk = async (userId) => {
    setExplainingRiskId(userId);
    setRiskExplanation(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/analytics/risk/${userId}/explain`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRiskExplanation({ userId, ...data });
      } else {
        const err = await res.json();
        setRiskExplanation({ userId, error: err.error || 'Failed to generate explanation.' });
      }
    } catch (err) {
      console.error(err);
      setRiskExplanation({ userId, error: 'Network error occurred.' });
    } finally {
      setExplainingRiskId(null);
    }
  };

  const closeExplanation = () => setRiskExplanation(null);

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
      transports: ['polling', 'websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000
    });

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));
    socket.on('connect_error', () => setIsConnected(false));
    socket.on('pulse:update', (updatedState) => setPulseData(updatedState));

    return () => socket.disconnect();
  }, []);

  const attendanceVelocity = useMemo(() => {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    return (pulseData.recentEvents || []).filter(
      ev => ev.type === 'checkin' && ev.timestamp >= oneHourAgo
    ).length;
  }, [pulseData.recentEvents]);

  const formattedHistory = useMemo(() => {
    return (pulseData.rollingHistory || []).map(pt => ({
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

  return (
    <div ref={containerRef} className="w-full min-h-full flex flex-col gap-3.5 sm:gap-4 p-3 sm:p-5 md:p-6 bg-[#FAF9F6] font-sans">
      
      {/* Live Stream Header */}
      <div className="cinematic-header flex flex-col min-[600px]:flex-row min-[600px]:items-center justify-between gap-2.5 pb-3 border-b border-[#EAE7E0] w-full">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <h1 className="font-serif font-bold text-lg sm:text-2xl md:text-3xl text-[#1F2B4D] tracking-tight leading-tight flex items-center gap-2">
              <Activity className="text-[#1F2B4D] w-5 h-5 sm:w-6 sm:h-6" />
              <span>Live Org Pulse</span>
            </h1>
            <BadgeConnection isConnected={isConnected} />
          </div>
          <p className="text-[#6B655C] text-xs sm:text-sm font-medium">
            Real-time headcount monitoring, cost burn tracking, and active attendance feed.
          </p>
        </div>

        <div className="flex items-center justify-center min-[600px]:justify-start gap-2 text-xs font-bold text-[#1F2B4D] bg-white border border-[#EAE7E0] px-3 py-1.5 rounded-xl shadow-2xs w-full min-[600px]:w-auto shrink-0">
          <Clock size={14} className="text-[#6B655C] shrink-0" />
          <span className="whitespace-nowrap">{format(currentTime, 'PPPP p')}</span>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex items-center justify-center">
          <span className="text-xs font-bold text-[#9A948A] tracking-widest uppercase">Initializing Pulse...</span>
        </div>
      ) : (
        <>
          {/* KPI Dashboard Grid (2x2 MOBILE / 4x1 DESKTOP) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5 w-full">
            
            {/* Live Headcount */}
            <div className="cinematic-kpi ambient-float p-3.5 sm:p-4 bg-white rounded-2xl border border-[#EAE7E0] shadow-2xs flex flex-col justify-between">
              <div className="flex justify-between items-start mb-2">
                <div className="space-y-0.5">
                  <span className="text-[9.5px] sm:text-[10.5px] font-display font-bold text-[#6B655C] uppercase tracking-wider block">Live Headcount</span>
                  <span className="text-xl sm:text-2xl md:text-3xl font-bold text-[#1F2B4D] tracking-tight block">{pulseData.headcount}</span>
                </div>
                <div className="p-1.5 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800">
                  <Users size={16} />
                </div>
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[10px] sm:text-[11px] font-bold text-[#6B655C]">Updating live</span>
              </div>
            </div>

            {/* Hourly Burn Rate */}
            <div className="cinematic-kpi ambient-float p-3.5 sm:p-4 bg-white rounded-2xl border border-[#EAE7E0] shadow-2xs flex flex-col justify-between">
              <div className="flex justify-between items-start mb-2">
                <div className="space-y-0.5">
                  <span className="text-[9.5px] sm:text-[10.5px] font-display font-bold text-[#6B655C] uppercase tracking-wider block">Hourly Burn Rate</span>
                  <span className="text-xl sm:text-2xl md:text-3xl font-bold text-[#1F2B4D] tracking-tight block">
                    ₹{pulseData.burnRate.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </span>
                </div>
                <div className="p-1.5 bg-rose-50 rounded-xl border border-rose-200 text-rose-800">
                  <Flame size={16} />
                </div>
              </div>
              <div className="mt-2 text-[9.5px] sm:text-[10.5px] font-bold text-rose-700 bg-rose-50 border border-rose-100 py-0.5 px-2 rounded-md self-start">
                Live Estimate
              </div>
            </div>

            {/* Today's Accrued Cost */}
            <div className="cinematic-kpi ambient-float p-3.5 sm:p-4 bg-white rounded-2xl border border-[#EAE7E0] shadow-2xs flex flex-col justify-between">
              <div className="flex justify-between items-start mb-2">
                <div className="space-y-0.5">
                  <span className="text-[9.5px] sm:text-[10.5px] font-display font-bold text-[#6B655C] uppercase tracking-wider block">Accrued Today</span>
                  <span className="text-xl sm:text-2xl md:text-3xl font-bold text-[#1F2B4D] tracking-tight block">
                    ₹{pulseData.cumulativeCost.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </span>
                </div>
                <div className="p-1.5 bg-[#F0F3F9] rounded-xl border border-[#CBD5E1] text-[#1F2B4D]">
                  <CreditCard size={16} />
                </div>
              </div>
              <div className="mt-2 text-[10px] sm:text-[11px] font-bold text-[#6B655C] flex items-center gap-1">
                <Activity size={12} className="text-[#1F2B4D]" />
                <span>Accruing per minute</span>
              </div>
            </div>

            {/* Attendance Velocity */}
            <div className="cinematic-kpi ambient-float p-3.5 sm:p-4 bg-white rounded-2xl border border-[#EAE7E0] shadow-2xs flex flex-col justify-between">
              <div className="flex justify-between items-start mb-2">
                <div className="space-y-0.5">
                  <span className="text-[9.5px] sm:text-[10.5px] font-display font-bold text-[#6B655C] uppercase tracking-wider block">Pulse Velocity</span>
                  <span className="text-xl sm:text-2xl md:text-3xl font-bold text-[#1F2B4D] tracking-tight block">{attendanceVelocity}</span>
                </div>
                <div className="p-1.5 bg-[#FAF8F5] rounded-xl border border-[#EAE7E0] text-[#1F2B4D]">
                  <Activity size={16} />
                </div>
              </div>
              <div className="mt-2 text-[10px] sm:text-[11px] font-bold text-[#6B655C]">
                Check-ins (60m)
              </div>
            </div>
          </div>

          {/* Interactive Chart & Live Ticker */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 sm:gap-4 w-full">
            
            {/* Live Chart */}
            <div className="cinematic-panel lg:col-span-2 p-4 sm:p-5 bg-white rounded-2xl border border-[#EAE7E0] shadow-2xs flex flex-col w-full">
              <div className="mb-4 flex justify-between items-center">
                <div>
                  <h3 className="font-serif font-bold text-sm sm:text-base text-[#1F2B4D] tracking-tight flex items-center gap-2">
                    <Activity className="text-[#1F2B4D]" size={16} />
                    <span>Live Activity Matrix</span>
                  </h3>
                  <p className="text-xs text-[#6B655C] font-medium mt-0.5">Real-time rolling snapshot timeline</p>
                </div>
              </div>

              <div className="flex-1 w-full min-h-[260px] sm:min-h-[320px]">
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
                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="formattedTime" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }}
                      dy={10}
                    />
                    <YAxis 
                      yAxisId="left"
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', backgroundColor: '#ffffff', padding: '8px 12px' }}
                      labelStyle={{ fontWeight: '800', color: '#1F2B4D', marginBottom: '4px', fontSize: '11px' }}
                      itemStyle={{ fontWeight: '600', fontSize: '11px' }}
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
            <div className="cinematic-panel p-4 sm:p-5 bg-white rounded-2xl border border-[#EAE7E0] shadow-2xs flex flex-col h-[360px] sm:h-[420px] w-full">
              <div className="mb-3">
                <h3 className="font-serif font-bold text-sm sm:text-base text-[#1F2B4D] tracking-tight flex items-center gap-2">
                  <Radio className="text-rose-500 animate-pulse" size={16} />
                  <span>Live Activity Feed</span>
                </h3>
                <p className="text-xs text-[#6B655C] font-medium mt-0.5">Real-time check-in events</p>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2.5 [&::-webkit-scrollbar]:hidden pr-1">
                <AnimatePresence initial={false} mode="popLayout">
                  {pulseData.recentEvents.length === 0 ? (
                    <motion.div 
                      key="empty"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="flex items-center justify-center h-full text-xs text-[#6B655C] font-bold uppercase tracking-wider"
                    >
                      Listening for events...
                    </motion.div>
                  ) : (
                    pulseData.recentEvents.map((event) => {
                      const initials = event.displayName ? event.displayName.split(/\s+/).map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'EE';
                      const isCheckin = event.type === 'checkin';
                      return (
                        <motion.div
                          layout
                          key={event.timestamp + '-' + event.userId}
                          initial={{ opacity: 0, scale: 0.95, y: -10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#FAF8F5] border border-[#EAE7E0] hover:border-[#1F2B4D]/20 transition-all"
                        >
                          <div className="relative shrink-0">
                            {event.avatarUrl ? (
                              <img src={event.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover shadow-2xs border border-[#EAE7E0]" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-white border border-[#EAE7E0] shadow-2xs flex items-center justify-center text-[10px] font-bold text-[#1F2B4D]">
                                {initials}
                              </div>
                            )}
                            <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-white ${
                              isCheckin ? 'bg-emerald-500' : 'bg-rose-500'
                            }`} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <span className="font-bold text-xs text-[#1F2B4D] block truncate leading-tight">{event.displayName}</span>
                            <span className="text-[#6B655C] font-bold text-[9px] uppercase tracking-wider block truncate">{event.department || 'General'}</span>
                          </div>

                          <div className="flex flex-col items-end gap-1 shrink-0">
                            {isCheckin ? (
                              <span className="text-[9px] font-bold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                <ArrowUpRight size={10} />
                                In
                              </span>
                            ) : (
                              <span className="text-[9px] font-bold uppercase bg-rose-50 text-rose-800 border border-rose-200 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                <ArrowDownRight size={10} />
                                Out
                              </span>
                            )}
                            <span className="text-[9px] text-[#6B655C] font-bold whitespace-nowrap">{getRelativeTime(event.timestamp)}</span>
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
          <div className="cinematic-panel p-4 sm:p-5 bg-white rounded-2xl border border-[#EAE7E0] shadow-2xs flex flex-col w-full overflow-hidden">
            <div className="mb-4">
              <h3 className="font-serif font-bold text-sm sm:text-base text-[#1F2B4D] tracking-tight flex items-center gap-2">
                <AlertTriangle className="text-rose-700" size={16} />
                <span>Attrition & Burnout Risk Radar</span>
              </h3>
              <p className="text-xs text-[#6B655C] font-medium mt-0.5">Identifies employees with elevated risk based on workload variance.</p>
            </div>

            <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden w-full">
              <table className="w-full text-left min-w-[540px] border-collapse">
                <thead>
                  <tr className="border-b border-[#EAE7E0] bg-[#FAF8F5]">
                    <th className="px-3 py-2 text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider">Employee</th>
                    <th className="px-3 py-2 text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider">Department</th>
                    <th className="px-3 py-2 text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider">Risk Score</th>
                    <th className="px-3 py-2 text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider">Risk Label</th>
                    <th className="px-3 py-2 text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F4F1EA]">
                  {loadingAttrition ? (
                    <tr><td colSpan="5" className="py-6 text-center text-[#6B655C] text-xs font-medium">Scanning parameters...</td></tr>
                  ) : attritionData.length === 0 ? (
                    <tr><td colSpan="5" className="py-6 text-center text-[#6B655C] text-xs font-medium">No risk anomalies detected.</td></tr>
                  ) : (
                    attritionData.map(user => {
                      let badgeClasses = 'bg-slate-50 text-slate-600 border-slate-200';
                      if (user.attritionRiskLabel === 'Critical') badgeClasses = 'bg-rose-50 text-rose-800 border-rose-200';
                      else if (user.attritionRiskLabel === 'High') badgeClasses = 'bg-orange-50 text-orange-800 border-orange-200';
                      else if (user.attritionRiskLabel === 'Moderate') badgeClasses = 'bg-amber-50 text-amber-800 border-amber-200';
                      else if (user.attritionRiskLabel === 'Low') badgeClasses = 'bg-emerald-50 text-emerald-800 border-emerald-200';

                      return (
                        <tr key={user.id} className="hover:bg-[#FAF8F5] transition-colors">
                          <td className="px-3 py-2.5">
                            <span className="text-xs font-bold text-[#1F2B4D]">{user.displayName}</span>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="text-xs font-medium text-[#6B655C]">{user.department || '-'}</span>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="text-xs font-mono font-bold text-[#1F2B4D] bg-[#FAF8F5] border border-[#EAE7E0] px-2 py-0.5 rounded-md">
                              {user.attritionRiskScore !== null ? user.attritionRiskScore : '-'}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            {user.attritionRiskLabel ? (
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-display font-bold uppercase tracking-wider border shadow-2xs inline-block ${badgeClasses}`}>
                                {user.attritionRiskLabel}
                              </span>
                            ) : (
                              <span className="text-[#9A948A] text-xs italic">Unscored</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5">
                            {user.attritionRiskScore !== null ? (
                              <button
                                onClick={() => handleExplainRisk(user.id)}
                                disabled={explainingRiskId === user.id}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:opacity-50"
                              >
                                {explainingRiskId === user.id ? (
                                  <span className="w-3 h-3 border-2 border-slate-600 border-t-transparent rounded-full animate-spin"></span>
                                ) : (
                                  <Sparkles size={12} className="text-indigo-500" />
                                )}
                                Explain Score
                              </button>
                            ) : (
                              <span className="text-xs text-slate-400">-</span>
                            )}
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
          <div className="cinematic-panel w-full">
            <ColocationNetworkGraph
              data={colocationData}
              loading={loadingColocation}
              onRefresh={fetchColocationNetwork}
            />
          </div>

        </>
      )}

      {/* AI Risk Explanation Modal */}
      <AnimatePresence>
        {riskExplanation && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-lg bg-white border border-slate-200 shadow-2xl rounded-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-50 rounded-md">
                    <Sparkles size={16} className="text-indigo-600" />
                  </div>
                  <h3 className="font-display font-bold text-slate-900">AI Risk Explanation</h3>
                </div>
                <button
                  onClick={closeExplanation}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="p-5 space-y-4">
                {riskExplanation.error ? (
                  <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg text-sm text-rose-700">
                    {riskExplanation.error}
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">Engine Score</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-lg text-slate-900">{riskExplanation.score}</span>
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-white border shadow-sm rounded-full text-slate-700">
                          {riskExplanation.label}
                        </span>
                      </div>
                    </div>
                    <div className="prose prose-sm prose-slate max-w-none">
                      <div className="whitespace-pre-wrap text-slate-700 leading-relaxed font-medium">
                        {riskExplanation.explanation}
                      </div>
                    </div>
                    <div className="pt-2 border-t border-slate-100">
                      <p className="text-[10px] text-slate-400 text-center uppercase tracking-wider font-semibold">
                        ⚠ AI does not recalculate score. Explanation based on underlying evidence only.
                      </p>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const BadgeConnection = ({ isConnected }) => {
  return isConnected ? (
    <span className="inline-flex items-center gap-1 text-[9px] font-display font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full shadow-2xs shrink-0">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
      Connected
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[9px] font-display font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full shadow-2xs shrink-0 animate-pulse">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
      Reconnecting
    </span>
  );
};

export default OrgPulseDashboard;
