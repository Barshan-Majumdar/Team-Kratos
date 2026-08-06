import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Calendar as CalendarIcon, TrendingUp, CalendarDays, BarChart2, CheckCircle2 } from 'lucide-react';
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
    <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] font-medium py-1 px-2.5 rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">
      {label}
    </div>
  );

  if (loading) {
    return (
      <div className="p-6 md:p-8 max-w-[1600px] mx-auto min-h-0 flex flex-col gap-6 animate-pulse">
        <div className="flex justify-between items-end">
          <div className="space-y-2">
            <div className="h-8 w-72 bg-slate-200 rounded-xl" />
            <div className="h-4 w-80 bg-slate-100 rounded-lg" />
          </div>
          <div className="h-16 w-44 bg-white border border-slate-100 rounded-2xl" />
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            <div className="h-44 bg-white border border-slate-100 rounded-3xl" />
            <div className="h-72 bg-white border border-slate-100 rounded-3xl" />
          </div>
          <div className="space-y-6">
            <div className="h-48 bg-white border border-slate-100 rounded-3xl" />
            <div className="h-48 bg-white border border-slate-100 rounded-3xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto min-h-0 flex flex-col gap-6">
      
      {/* Header & Current Streak Card */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-1">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight font-outfit">
            Dashboard
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-1">
            Welcome back, <strong className="text-slate-700 font-semibold">{user?.displayName || 'Team Member'}</strong> — here is your attendance & leave balance overview.
          </p>
        </div>

        {/* Current Streak Stat Card */}
        <div className="bg-white rounded-[20px] border border-slate-100 shadow-sm shadow-slate-200/50 hover:shadow-md hover:-translate-y-0.5 px-5 py-3.5 flex items-center gap-4 shrink-0 transition-all duration-200">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center border border-amber-100 shadow-xs shrink-0">
            <TrendingUp size={22} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Current Streak</p>
            <p className="text-2xl font-black text-slate-900 font-kpi tracking-tight mt-0.5">
              {streak} <span className="text-xs font-semibold text-slate-400 font-sans">Days</span>
            </p>
          </div>
        </div>
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left Column (Wider Area) */}
        <div className="xl:col-span-2 flex flex-col gap-6">
          
          {/* Dynamic Admin Leave Policy Balance Cards */}
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <h2 className="text-base font-extrabold text-slate-900 font-kpi tracking-tight flex items-center gap-2">
                <CalendarIcon size={18} className="text-[#3b82f6]" />
                Leave Balances
              </h2>
              <span className="text-xs text-slate-400 font-medium">{balances.length} Policies</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 pb-2">
              {balances.length === 0 ? (
                <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-8 text-center col-span-full">
                  <p className="text-sm text-slate-400 font-medium">No leave policies configured yet.</p>
                </div>
              ) : (
                balances.map((bal) => {
                  const denominator = bal.allocated > 0 ? bal.allocated : bal.annualQuota;
                  const usedPercent = denominator > 0 ? Math.max(0, Math.min(100, (bal.available / denominator) * 100)) : 0;
                  return (
                    <div key={bal.policyGroupId} className="bg-white rounded-[24px] border border-slate-100 shadow-sm shadow-slate-200/50 p-5 flex flex-col justify-between hover:shadow-md hover:border-blue-200 hover:-translate-y-1 transition-all duration-300">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            {bal.policyName}
                          </span>
                          <span className="text-[11px] font-semibold text-[#3b82f6] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100 font-kpi">
                            Quota: {denominator}d
                          </span>
                        </div>

                        <div className="flex items-baseline gap-2 my-1.5">
                          <span className="text-4xl font-black text-slate-900 font-kpi tracking-tight">
                            {bal.available}
                          </span>
                          <span className="text-xs font-bold text-slate-400">
                            Days Available
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100">
                        <div className="flex justify-between items-center text-xs font-medium text-slate-400 mb-2">
                          <span>Used: <strong className="text-slate-700 font-mono">{bal.used}d</strong></span>
                          {bal.pending > 0 && <span>Pending: <strong className="text-amber-500 font-mono">{bal.pending}d</strong></span>}
                        </div>

                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className="bg-[#3b82f6] h-full rounded-full transition-all duration-1000 ease-out" 
                            style={{ width: `${usedPercent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Weekly Hours Activity Chart */}
          <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm shadow-slate-200/50 p-6 flex flex-col min-h-[330px]">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2 tracking-tight">
                  <BarChart2 size={18} className="text-[#3b82f6]" />
                  Weekly Activity
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 font-medium">Hours logged over the last 7 days</p>
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
                    tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 500 }} 
                    dy={10} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 500 }} 
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ 
                      borderRadius: '16px', 
                      backgroundColor: '#ffffff',
                      borderColor: '#e2e8f0',
                      boxShadow: '0 8px 24px -4px rgba(148, 163, 184, 0.2)',
                      padding: '10px 14px'
                    }}
                    labelStyle={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '2px' }}
                  />
                  <Bar dataKey="hours" radius={[8, 8, 0, 0]} maxBarSize={44}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.hours > 0 ? '#3b82f6' : '#e2e8f0'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* Right Column (Widgets) */}
        <div className="flex flex-col gap-6">
          
          {/* Month Attendance Heatmap Widget */}
          <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm shadow-slate-200/50 p-6">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <CalendarDays size={16} className="text-[#3b82f6]" />
                This Month
              </h3>
              <span className="text-xs font-bold text-[#3b82f6] bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
                {format(new Date(), 'MMMM')}
              </span>
            </div>
            
            <div className="grid grid-cols-7 gap-2 mb-4">
              {['S','M','T','W','T','F','S'].map((d, i) => (
                <div key={i} className="text-[10.5px] font-bold text-slate-400 text-center">{d}</div>
              ))}
              
              {/* Padding for start of month */}
              {Array.from({ length: new Date(new Date().getFullYear(), new Date().getMonth(), 1).getDay() }).map((_, i) => (
                <div key={`pad-${i}`} className="aspect-square" />
              ))}

              {heatmapData.map((day, i) => {
                let bgColor = 'bg-slate-100'; // Default / none
                if (day.status === 'present') {
                  bgColor = day.level === 3 ? 'bg-emerald-500 shadow-xs' : 'bg-emerald-400';
                } else if (day.status === 'leave') {
                  bgColor = 'bg-amber-400';
                } else if (day.status === 'absent') {
                  bgColor = 'bg-rose-400';
                } else if (day.status === 'weekend') {
                  bgColor = 'bg-slate-50';
                }

                return (
                  <div key={i} className="relative group aspect-square">
                    <div className={`w-full h-full rounded-md ${bgColor} hover:ring-2 hover:ring-blue-300 hover:scale-110 transition-all cursor-pointer`} />
                    <HeatmapTooltip label={`${format(day.date, 'MMM d')}: ${day.label}`} />
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold pt-3 border-t border-slate-100">
              <span>Less</span>
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm bg-slate-100" />
                <div className="w-2.5 h-2.5 rounded-sm bg-emerald-300" />
                <div className="w-2.5 h-2.5 rounded-sm bg-emerald-400" />
                <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
              </div>
              <span>More</span>
            </div>
          </div>

          {/* Upcoming Holidays Widget */}
          <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm shadow-slate-200/50 p-6 flex-1 flex flex-col">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-[#3b82f6]" />
              Upcoming Holidays
            </h3>
            <div className="space-y-3 flex-1">
              {HOLIDAYS.filter(h => new Date(h.date) >= new Date()).slice(0, 4).map((holiday, i) => (
                <div key={i} className="flex flex-col p-3 rounded-xl bg-slate-50 border border-slate-100/80 hover:bg-blue-50/50 transition-colors">
                  <span className="text-[10px] font-bold text-[#3b82f6] mb-0.5 uppercase tracking-wide">
                    {format(new Date(holiday.date), 'MMM do, yyyy')}
                  </span>
                  <span className="text-xs font-bold text-slate-700">{holiday.name}</span>
                </div>
              ))}
              {HOLIDAYS.filter(h => new Date(h.date) >= new Date()).length === 0 && (
                <p className="text-xs text-slate-400 text-center py-6">No upcoming holidays scheduled.</p>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
