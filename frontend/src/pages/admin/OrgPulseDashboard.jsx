import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Users, Flame, CreditCard, Clock, ArrowUpRight, ArrowDownRight, RefreshCw, Radio, AlertTriangle } from 'lucide-react';
import { io } from 'socket.io-client';
import { Card } from '../../components/ui/Card';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { format } from 'date-fns';
import { ColocationNetworkGraph } from '../../components/charts/ColocationNetworkGraph';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const OrgPulseDashboard = () => {
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

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('pulse:update', (updatedState) => {
      setPulseData(updatedState);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Compute Velocity (check-ins in the last 60 minutes)
  const attendanceVelocity = useMemo(() => {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    return pulseData.recentEvents.filter(
      ev => ev.type === 'checkin' && ev.timestamp >= oneHourAgo
    ).length;
  }, [pulseData.recentEvents]);

  // Format chart time labels
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

  return (
    <div className="p-4 md:p-8 lg:p-12 space-y-8 bg-slate-50/50 min-h-screen">
      {/* Live Stream Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">Live Org Pulse</h1>
            <BadgeConnection isConnected={isConnected} />
          </div>
          <p className="text-slate-500 text-sm mt-1">
            Real-time headcount monitoring, cost burn tracking, and active attendance feed.
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm font-semibold text-slate-500 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-100">
          <Clock size={16} className="text-indigo-500" />
          <span>{format(currentTime, 'PPPP p')}</span>
        </div>
      </div>

      {loading ? (
        <div className="space-y-6 animate-pulse">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="p-6 border-slate-100 shadow-sm">
                <div className="flex justify-between items-start">
                  <div className="space-y-3">
                    <div className="h-3 w-24 bg-slate-200 rounded" />
                    <div className="h-8 w-16 bg-slate-200 rounded" />
                  </div>
                  <div className="w-10 h-10 bg-slate-100 rounded-xl" />
                </div>
                <div className="mt-4 h-3 w-32 bg-slate-100 rounded" />
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="col-span-2 p-6 border-slate-100 shadow-sm">
              <div className="h-5 w-48 bg-slate-200 rounded mb-4" />
              <div className="h-64 bg-slate-100 rounded-xl" />
            </Card>
            <Card className="p-6 border-slate-100 shadow-sm">
              <div className="h-5 w-32 bg-slate-200 rounded mb-4" />
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-10 bg-slate-100 rounded-lg" />
                ))}
              </div>
            </Card>
          </div>
        </div>
      ) : (
        <>
          {/* KPI Dashboard Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Live Headcount */}
            <Card className="p-6 relative overflow-hidden border-slate-100 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Live Headcount</span>
                  <span className="text-4xl font-black text-slate-800">{pulseData.headcount}</span>
                </div>
                <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
                  <Users size={20} />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-xs font-bold text-slate-500">Stream updating instantly</span>
              </div>
            </Card>

            {/* Hourly Burn Rate */}
            <Card className="p-6 border-slate-100 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Hourly Burn Rate</span>
                  <span className="text-4xl font-black text-slate-800">
                    ₹{pulseData.burnRate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
                  <Flame size={20} />
                </div>
              </div>
              <div className="mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 py-1 px-2.5 rounded border border-slate-100 self-start">
                * Live Estimate Only
              </div>
            </Card>

            {/* Today's Accrued Cost */}
            <Card className="p-6 border-slate-100 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Accrued Today</span>
                  <span className="text-4xl font-black text-slate-800">
                    ₹{pulseData.cumulativeCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
                  <CreditCard size={20} />
                </div>
              </div>
              <div className="mt-4 text-xs font-semibold text-slate-500 flex items-center gap-1">
                <Activity size={12} className="text-amber-500" />
                Accruing real-time by minute
              </div>
            </Card>

            {/* Attendance Velocity */}
            <Card className="p-6 border-slate-100 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Pulse Velocity</span>
                  <span className="text-4xl font-black text-slate-800">{attendanceVelocity}</span>
                </div>
                <div className="p-3 bg-rose-50 rounded-xl text-rose-600">
                  <Activity size={20} />
                </div>
              </div>
              <div className="mt-4 text-xs font-semibold text-slate-500">
                Check-ins over last 60 minutes
              </div>
            </Card>
          </div>

          {/* Interactive Chart & Live Ticker */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Live Chart */}
            <Card className="lg:col-span-2 p-6 border-slate-100 shadow-sm flex flex-col">
              <div className="mb-6 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                    <Activity className="text-indigo-500" size={18} />
                    Live Activity Chart
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Real-time rolling snapshot timeline (last 30 ticks)</p>
                </div>
              </div>

              <div className="flex-1 w-full min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={formattedHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorHeadcount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorBurnRate" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="formattedTime" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 10 }}
                    />
                    <YAxis 
                      yAxisId="left"
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 10 }}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 10 }}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      labelStyle={{ fontWeight: 'bold', color: '#1e293b' }}
                    />
                    <Area 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="headcount" 
                      stroke="#6366f1" 
                      strokeWidth={2.5}
                      fillOpacity={1} 
                      fill="url(#colorHeadcount)" 
                      name="Active Headcount"
                    />
                    <Area 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="burnRate" 
                      stroke="#10b981" 
                      strokeWidth={2.5}
                      fillOpacity={1} 
                      fill="url(#colorBurnRate)" 
                      name="Hourly Burn (₹)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Live Ticker Feed */}
            <Card className="p-6 border-slate-100 shadow-sm flex flex-col h-[400px]">
              <div className="mb-4">
                <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                  <Radio className="text-indigo-500 animate-pulse" size={18} />
                  Live Activity Feed
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Real-time check-in and checkout events</p>
              </div>

              <div className="flex-grow overflow-y-auto space-y-3.5 custom-scrollbar pr-1">
                <AnimatePresence initial={false}>
                  {pulseData.recentEvents.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-xs text-slate-400 font-bold uppercase tracking-wider">
                      No recent pulse events
                    </div>
                  ) : (
                    pulseData.recentEvents.map((event) => {
                      const initials = event.displayName.split(/\s+/).map(n => n[0]).join('').substring(0, 2).toUpperCase();
                      const isCheckin = event.type === 'checkin';
                      return (
                        <motion.div
                          key={event.timestamp + '-' + event.userId}
                          initial={{ opacity: 0, y: -20, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                          className="flex items-center gap-3.5 p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-200 transition-colors"
                        >
                          <div className="relative">
                            {event.avatarUrl ? (
                              <img src={event.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover shadow-inner" />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700">
                                {initials}
                              </div>
                            )}
                            <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white flex items-center justify-center ${
                              isCheckin ? 'bg-emerald-500' : 'bg-rose-500'
                            }`} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <span className="font-bold text-sm text-slate-800 block truncate">{event.displayName}</span>
                            <span className="text-slate-400 font-semibold text-[10px] uppercase tracking-wider block">{event.department}</span>
                          </div>

                          <div className="flex flex-col items-end gap-1">
                            {isCheckin ? (
                              <span className="text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-0.5 shadow-sm">
                                <ArrowUpRight size={10} />
                                In
                              </span>
                            ) : (
                              <span className="text-[10px] font-extrabold uppercase bg-rose-50 text-rose-700 border border-rose-100 px-2 py-0.5 rounded-full flex items-center gap-0.5 shadow-sm">
                                <ArrowDownRight size={10} />
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
            </Card>
          </div>

          {/* Attrition & Burnout Risk Panel */}
          <Card className="mt-8 p-6 border-slate-100 shadow-sm flex flex-col">
            <div className="mb-6 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                  <AlertTriangle className="text-rose-500" size={18} />
                  Attrition & Burnout Risk Radar
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Identifies employees with elevated risk based on workload, variance, and absence patterns.</p>
              </div>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left min-w-[600px]">
                <thead className="bg-slate-50/50 border-b border-slate-200/60">
                  <tr>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Employee</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Department</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Risk Score</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Risk Label</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Last Computed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingAttrition ? (
                    <tr><td colSpan="5" className="p-8 text-center text-slate-500 text-sm">Loading radar data...</td></tr>
                  ) : attritionData.length === 0 ? (
                    <tr><td colSpan="5" className="p-8 text-center text-slate-500 text-sm">No risk data available yet.</td></tr>
                  ) : (
                    attritionData.map(user => {
                      let badgeColor = 'bg-slate-100 text-slate-600';
                      if (user.attritionRiskLabel === 'Critical') badgeColor = 'bg-rose-100 text-rose-700';
                      else if (user.attritionRiskLabel === 'High') badgeColor = 'bg-orange-100 text-orange-700';
                      else if (user.attritionRiskLabel === 'Moderate') badgeColor = 'bg-amber-100 text-amber-700';
                      else if (user.attritionRiskLabel === 'Low') badgeColor = 'bg-emerald-100 text-emerald-700';

                      return (
                        <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 text-sm font-bold text-slate-800">{user.displayName}</td>
                          <td className="p-4 text-sm text-slate-600">{user.department || '-'}</td>
                          <td className="p-4 text-sm font-mono font-medium text-slate-600">
                            {user.attritionRiskScore !== null ? user.attritionRiskScore : '-'}
                          </td>
                          <td className="p-4 text-sm">
                            {user.attritionRiskLabel ? (
                              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${badgeColor}`}>
                                {user.attritionRiskLabel}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs">Unscored</span>
                            )}
                          </td>
                          <td className="p-4 text-sm text-slate-500">
                            {user.riskUpdatedAt ? new Date(user.riskUpdatedAt).toLocaleDateString() : '-'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Colocation Network Graph Panel */}
          <div className="mt-8">
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
    <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 py-1 px-3 rounded-full shadow-sm">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
      Connected
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-amber-50 text-amber-700 border border-amber-100 py-1 px-3 rounded-full shadow-sm animate-pulse">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
      Reconnecting
    </span>
  );
};

export default OrgPulseDashboard;
