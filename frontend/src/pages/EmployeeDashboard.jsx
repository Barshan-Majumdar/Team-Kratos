import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Calendar as CalendarIcon, Clock, TrendingUp, AlertCircle, CalendarDays, BarChart2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { calculateStreak, getWeeklyChartData, generateHeatmapData } from '../utils/employeeDashboardHelpers';
import { format } from 'date-fns';

const HOLIDAYS = [
  { date: '2026-01-01', name: 'New Year\'s Day' },
  { date: '2026-05-01', name: 'Labor Day' },
  { date: '2026-07-04', name: 'Independence Day' },
  { date: '2026-11-26', name: 'Thanksgiving Day' },
  { date: '2026-12-25', name: 'Christmas Day' },
];

const GRADIENT_PALETTES = [
  'from-blue-500 to-indigo-600 shadow-indigo-500/20',
  'from-emerald-400 to-teal-500 shadow-teal-500/20',
  'from-purple-500 to-violet-600 shadow-violet-500/20',
  'from-amber-400 to-orange-500 shadow-orange-500/20',
  'from-rose-400 to-pink-500 shadow-pink-500/20',
  'from-cyan-400 to-sky-500 shadow-sky-500/20',
];

const EmployeeDashboard = ({ user }) => {
  const [attendance, setAttendance] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
          setAttendance(Array.isArray(attData) ? attData : []);
        }
        if (leaveRes.ok) {
          const leaveData = await leaveRes.json();
          setLeaves(Array.isArray(leaveData) ? leaveData : []);
        }
        if (balRes.ok) {
          const balData = await balRes.json();
          setBalances(Array.isArray(balData) ? balData : []);
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const streak = calculateStreak(attendance);
  const chartData = getWeeklyChartData(attendance);
  const heatmapData = generateHeatmapData(attendance, leaves);

  // Custom Tooltip for Heatmap
  const HeatmapTooltip = ({ label }) => (
    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
      {label}
    </div>
  );

  if (loading) {
    return (
      <div className="p-8 md:p-12 h-full flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
          <p className="text-slate-500">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto min-h-0 flex flex-col gap-6">
      
      {/* Header & Quick Stats */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4 mb-2">
        <div>
          <h1 className="text-4xl font-bold text-slate-800 tracking-tight" style={{ fontFamily: '"Dancing Script", cursive' }}>Welcome back, {user?.displayName}</h1>
          <p className="text-slate-500 mt-1">Here is what's happening with your attendance today.</p>
        </div>
        <div className="flex items-center gap-4">
          <Card className="p-4 flex items-center gap-4 bg-white border-slate-100 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center">
              <TrendingUp size={20} />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Current Streak</p>
              <p className="text-xl font-black text-slate-800">{streak} Days</p>
            </div>
          </Card>
        </div>
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left Column (Wider) */}
        <div className="xl:col-span-2 flex flex-col gap-6">
          
          {/* Dynamic Admin Leave Policy Balance Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {balances.length === 0 ? (
              <Card className="p-4 border-dashed border-2 border-slate-200 col-span-full">
                <p className="text-sm text-slate-500 text-center">No leave policies configured yet.</p>
              </Card>
            ) : (
              balances.map((bal, idx) => {
                const palette = GRADIENT_PALETTES[idx % GRADIENT_PALETTES.length];
                const denominator = bal.allocated > 0 ? bal.allocated : bal.annualQuota;
                const usedPercent = denominator > 0 ? Math.max(0, Math.min(100, (bal.available / denominator) * 100)) : 0;
                return (
                  <Card key={bal.policyGroupId} className={`p-5 border-transparent bg-gradient-to-br ${palette} text-white shadow-lg relative overflow-hidden group hover:shadow-xl transition-shadow`}>
                    <div className="absolute -top-4 -right-4 p-8 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:rotate-12 duration-500">
                      <CalendarIcon size={100} />
                    </div>
                    <div className="relative z-10">
                      <h3 className="text-white/80 font-semibold mb-1 text-xs uppercase tracking-wider">{bal.policyName}</h3>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-4xl font-black tracking-tight">{bal.available}</span>
                        <span className="text-white/80 font-medium text-sm">Days Available</span>
                      </div>
                      <div className="flex gap-4 mt-1 text-xs text-white/80">
                        <span>Used: <span className="font-bold text-white">{bal.used}</span></span>
                        {bal.pending > 0 && <span>Pending: <span className="font-bold text-white">{bal.pending}</span></span>}
                      </div>
                      <div className="mt-3 w-full bg-black/20 rounded-full h-1 overflow-hidden">
                        <div className="bg-white h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${usedPercent}%` }}></div>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>

          {/* Interactive Weekly Chart */}
          <Card className="p-6 border-slate-100 shadow-sm flex-1 min-h-[300px] flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <BarChart2 size={18} className="text-indigo-500" />
                  Weekly Activity
                </h3>
                <p className="text-xs text-slate-500 mt-1">Hours logged over the last 7 days</p>
              </div>
            </div>
            
            <div className="flex-1 w-full min-h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="day" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 12 }} 
                    dy={10} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 12 }} 
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    labelStyle={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '4px' }}
                  />
                  <Bar dataKey="hours" radius={[6, 6, 0, 0]} maxBarSize={50}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.hours > 0 ? '#6366f1' : '#e2e8f0'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Right Column (Narrower) */}
        <div className="flex flex-col gap-6">
          
          {/* Month Heatmap */}
          <Card className="p-6 border-slate-100 shadow-sm">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <CalendarDays size={16} className="text-indigo-500" />
                This Month
              </h3>
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">
                {format(new Date(), 'MMMM')}
              </span>
            </div>
            
            <div className="grid grid-cols-7 gap-1.5 mb-4">
              {['S','M','T','W','T','F','S'].map((d, i) => (
                <div key={i} className="text-[10px] font-bold text-slate-400 text-center">{d}</div>
              ))}
              
              {/* Padding for start of month */}
              {Array.from({ length: new Date(new Date().getFullYear(), new Date().getMonth(), 1).getDay() }).map((_, i) => (
                <div key={`pad-${i}`} className="aspect-square"></div>
              ))}

              {heatmapData.map((day, i) => {
                let bgColor = 'bg-slate-100'; // Default / none
                if (day.status === 'present') {
                  bgColor = day.level === 3 ? 'bg-emerald-500' : 'bg-emerald-400';
                } else if (day.status === 'leave') {
                  bgColor = 'bg-amber-400';
                } else if (day.status === 'absent') {
                  bgColor = 'bg-red-400';
                } else if (day.status === 'weekend') {
                  bgColor = 'bg-slate-50';
                }

                return (
                  <div key={i} className="relative group aspect-square">
                    <div className={`w-full h-full rounded-sm ${bgColor} hover:ring-2 hover:ring-indigo-300 hover:scale-110 transition-all cursor-crosshair`}></div>
                    <HeatmapTooltip label={`${format(day.date, 'MMM d')}: ${day.label}`} />
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between items-center text-[10px] text-slate-500 font-medium px-1">
              <span>Less</span>
              <div className="flex gap-1">
                <div className="w-2.5 h-2.5 rounded-sm bg-slate-100"></div>
                <div className="w-2.5 h-2.5 rounded-sm bg-emerald-300"></div>
                <div className="w-2.5 h-2.5 rounded-sm bg-emerald-400"></div>
                <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></div>
              </div>
              <span>More</span>
            </div>
          </Card>

          {/* Public Holidays */}
          <Card className="p-6 border-slate-100 shadow-sm flex-1">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-5 flex items-center gap-2">
              <AlertCircle size={16} className="text-indigo-500" />
              Upcoming Holidays
            </h3>
            <div className="space-y-4">
              {HOLIDAYS.filter(h => new Date(h.date) >= new Date()).slice(0, 4).map((holiday, i) => (
                <div key={i} className="flex flex-col p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-100/50">
                  <span className="text-[10px] font-bold text-indigo-500 mb-0.5 uppercase tracking-wide">
                    {format(new Date(holiday.date), 'MMM do, yyyy')}
                  </span>
                  <span className="text-sm font-bold text-slate-700">{holiday.name}</span>
                </div>
              ))}
              {HOLIDAYS.filter(h => new Date(h.date) >= new Date()).length === 0 && (
                <p className="text-xs text-slate-500 text-center py-4">No upcoming holidays this year.</p>
              )}
            </div>
          </Card>

        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;

