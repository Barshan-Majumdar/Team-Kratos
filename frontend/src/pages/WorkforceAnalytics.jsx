import React, { useState, useEffect } from 'react';
import { hasPermission } from '../lib/permissions';
import {
  BarChart3,
  Users,
  Building2,
  CalendarCheck,
  HeartHandshake,
  DollarSign,
  Download,
  RefreshCw,
  PieChart as PieChartIcon,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';
import toast from 'react-hot-toast';
import { StatCardSkeleton } from '../components/ui/Skeleton';

const EXECUTIVE_COLORS = ['#1F2B4D', '#0F766E', '#D97706', '#6366F1', '#8B5CF6', '#EC4899'];
const PIE_COLORS = ['#6366F1', '#EC4899', '#10B981', '#F59E0B', '#8B5CF6'];

const WorkforceAnalytics = ({ user }) => {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'demographics' | 'attendance' | 'payroll' | 'exports'
  const [summary, setSummary] = useState(null);
  const [demographics, setDemographics] = useState({ byDepartment: [], byOffice: [] });
  const [attendance, setAttendance] = useState({ byStatus: [] });
  const [payroll, setPayroll] = useState({ payrollTrend: [] });
  const [benefits, setBenefits] = useState({ byCategory: [] });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const isAdmin = hasPermission(user, 'view_reports');
  const isManager = hasPermission(user, 'view_reports');
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const fetchAnalyticsData = async (forceRefresh = false) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) return;

      const headers = { 'Authorization': `Bearer ${token}` };
      const refreshQuery = forceRefresh ? '?refresh=true' : '';

      const promises = [
        fetch(`${apiBase}/api/analytics/summary${refreshQuery}`, { headers }).then(r => r.ok ? r.json() : null),
        fetch(`${apiBase}/api/analytics/demographics${refreshQuery}`, { headers }).then(r => r.ok ? r.json() : null),
        fetch(`${apiBase}/api/analytics/attendance${refreshQuery}`, { headers }).then(r => r.ok ? r.json() : null),
        fetch(`${apiBase}/api/analytics/benefits${refreshQuery}`, { headers }).then(r => r.ok ? r.json() : null),
        isAdmin ? fetch(`${apiBase}/api/analytics/payroll${refreshQuery}`, { headers }).then(r => r.ok ? r.json() : null) : Promise.resolve(null)
      ];

      const [summaryData, demoData, attData, benData, payData] = await Promise.all(promises);

      if (summaryData) setSummary(summaryData);
      if (demoData) setDemographics(demoData);
      if (attData) setAttendance(attData);
      if (benData) setBenefits(benData);
      if (payData) setPayroll(payData);

      if (forceRefresh) {
        toast.success('Analytics cache refreshed cleanly');
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, [user?.id, isAdmin]);

  const handleExportCSV = async (type) => {
    try {
      setExporting(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiBase}/api/analytics/export?type=${type}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to export CSV report');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_report_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.success(`Exported ${type} report CSV cleanly`);
    } catch (err) {
      toast.error(err.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  if (!isManager) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center h-[80vh] flex items-center justify-center">
        <div className="bg-white/5 border border-white/10 rounded-[28px] p-2 max-w-lg shadow-[0_8px_32px_-12px_rgba(0,0,0,0.1)]">
          <div className="bg-white rounded-[20px] p-12 border border-slate-200 flex flex-col items-center gap-4">
            <AlertCircle size={48} className="text-amber-500" />
            <h2 className="text-2xl font-black text-slate-800" style={{ fontFamily: 'Outfit, sans-serif' }}>Access Restricted</h2>
            <p className="text-slate-500 text-sm max-w-md" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              Workforce Analytics & Reports are reserved for Managers and Executive Administrators.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Double-Bezel Card Component Wrapper
  const DoppelrandCard = ({ children, className = '', hoverable = false, ...props }) => (
    <div 
      className={`wa-doppelrand-shell ${hoverable ? 'hoverable' : ''} ${className}`} 
      {...props}
    >
      <div className="wa-doppelrand-core">
        {children}
      </div>
    </div>
  );

  return (
    <div className="wa-page p-4 md:p-8 lg:px-12 max-w-[1600px] mx-auto min-h-full flex flex-col gap-10 bg-[#FAF9F6] pb-24">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        
        .wa-page {
          --panel: #FFFFFF;
          --line: #EAE7E0;
          --shadow-subtle: 0 4px 20px -8px rgba(31, 43, 77, 0.06);
          --shadow-float: 0 12px 32px -12px rgba(31, 43, 77, 0.15);
          font-family: 'Plus Jakarta Sans', sans-serif;
        }
        
        .wa-page h1, .wa-page h2, .wa-page h3, .wa-page h4 {
          font-family: 'Outfit', sans-serif;
        }
        
        .wa-doppelrand-shell {
          background: rgba(31, 43, 77, 0.02); 
          border: 1px solid rgba(31, 43, 77, 0.05); 
          border-radius: 28px;
          padding: 8px; 
          box-shadow: inset 0 1px 1px rgba(255,255,255,1);
          transition: all 700ms cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .wa-doppelrand-shell.hoverable:hover {
          background: rgba(31, 43, 77, 0.04);
          border-color: rgba(31, 43, 77, 0.1);
          box-shadow: var(--shadow-float);
          transform: translateY(-6px) scale(1.01);
        }
        
        .wa-doppelrand-core {
          background: var(--panel);
          border-radius: 20px;
          padding: 24px;
          box-shadow: var(--shadow-subtle), inset 0 1px 0 rgba(255,255,255,0.8);
          border: 1px solid var(--line);
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .wa-page .recharts-tooltip-wrapper .recharts-default-tooltip {
          background: rgba(255, 255, 255, 0.85) !important;
          backdrop-filter: blur(12px) !important;
          border: 1px solid var(--line) !important;
          border-radius: 12px !important;
          box-shadow: var(--shadow-float) !important;
          font-family: 'Plus Jakarta Sans', sans-serif !important;
          padding: 12px !important;
        }

        /* Glass Tab Animations */
        .glass-tab {
          position: relative;
          padding: 8px 20px;
          border-radius: 100px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          transition: all 400ms cubic-bezier(0.34, 1.56, 0.64, 1);
          color: #6B655C;
          z-index: 2;
        }
        .glass-tab:hover {
          color: #1F2B4D;
        }
        .glass-tab.active {
          color: #1F2B4D;
        }
        .glass-tab-indicator {
          position: absolute;
          inset: 4px;
          background: #FFFFFF;
          border: 1px solid var(--line);
          border-radius: 100px;
          box-shadow: 0 2px 10px -4px rgba(31, 43, 77, 0.15);
          z-index: -1;
          transition: all 400ms cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `}</style>
      
      {/* Header & Glass Navigation */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 mb-4 rounded-full bg-white text-[#1F2B4D] border border-[#EAE7E0] text-[10px] font-bold uppercase tracking-widest shadow-sm font-mono">
            <BarChart3 size={12} className="text-[#0F766E]" />
            Live Intel
          </div>
          <h1 className="text-4xl lg:text-5xl font-black text-[#1F2B4D] tracking-tight">
            Workforce Analytics
          </h1>
          <p className="text-[#6B655C] mt-3 max-w-xl text-[15px] font-medium leading-relaxed">
            Real-time organizational insights, attendance patterns, and executive financial spend analytics.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          {/* Glass Tab Navigation */}
          <div className="flex items-center bg-[rgba(31,43,77,0.03)] p-1.5 rounded-[100px] border border-[rgba(31,43,77,0.06)] relative isolate backdrop-blur-md overflow-x-auto max-w-full [scrollbar-width:none]">
            {['overview', 'demographics', 'attendance'].concat(isAdmin ? ['payroll'] : []).concat(['exports']).map(tabKey => (
              <button
                key={tabKey}
                onClick={() => setActiveTab(tabKey)}
                className={`glass-tab shrink-0 ${activeTab === tabKey ? 'active' : ''}`}
              >
                {activeTab === tabKey && <div className="glass-tab-indicator layout-id-tab" />}
                {tabKey}
              </button>
            ))}
          </div>

          <button
            onClick={() => fetchAnalyticsData(true)}
            disabled={loading}
            className="shrink-0 flex items-center justify-center w-12 h-12 rounded-full bg-white border border-[#EAE7E0] text-[#1F2B4D] shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
            title="Refresh Data"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin text-[#0F766E]' : ''} />
          </button>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <DoppelrandCard hoverable={true}>
              <div className="flex items-center justify-between h-full">
                <div>
                  <span className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-[#6B655C]">Total Headcount</span>
                  <h3 className="text-4xl font-black text-[#1F2B4D] mt-2 tracking-tight">{summary?.activeHeadcount ?? 0}</h3>
                  <span className="text-xs text-[#0F766E] font-semibold mt-2 block flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0F766E]"></span>
                    Active Employees
                  </span>
                </div>
                <div className="w-14 h-14 rounded-[18px] bg-white border border-[#EAE7E0] shadow-sm text-[#1F2B4D] flex items-center justify-center shrink-0">
                  <Users size={24} strokeWidth={1.5} />
                </div>
              </div>
            </DoppelrandCard>

            <DoppelrandCard hoverable={true}>
              <div className="flex items-center justify-between h-full">
                <div>
                  <span className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-[#6B655C]">Attendance Rate</span>
                  <h3 className="text-4xl font-black text-[#1F2B4D] mt-2 tracking-tight">{summary?.attendanceRate ?? 100}%</h3>
                  <span className="text-xs text-[#1F2B4D] opacity-80 font-semibold mt-2 block flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#1F2B4D]"></span>
                    Current Month
                  </span>
                </div>
                <div className="w-14 h-14 rounded-[18px] bg-white border border-[#EAE7E0] shadow-sm text-[#1F2B4D] flex items-center justify-center shrink-0">
                  <CalendarCheck size={24} strokeWidth={1.5} />
                </div>
              </div>
            </DoppelrandCard>

            <DoppelrandCard hoverable={true}>
              <div className="flex items-center justify-between h-full">
                <div>
                  <span className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-[#6B655C]">Benefit Plans</span>
                  <h3 className="text-4xl font-black text-[#1F2B4D] mt-2 tracking-tight">{summary?.activeBenefitEnrollments ?? 0}</h3>
                  <span className="text-xs text-[#6366F1] font-semibold mt-2 block flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#6366F1]"></span>
                    Active Enrollments
                  </span>
                </div>
                <div className="w-14 h-14 rounded-[18px] bg-white border border-[#EAE7E0] shadow-sm text-[#6366F1] flex items-center justify-center shrink-0">
                  <HeartHandshake size={24} strokeWidth={1.5} />
                </div>
              </div>
            </DoppelrandCard>

            {isAdmin ? (
              <DoppelrandCard hoverable={true}>
                <div className="flex items-center justify-between h-full">
                  <div>
                    <span className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-[#6B655C]">Monthly Payroll</span>
                    <h3 className="text-4xl font-black text-[#1F2B4D] mt-2 tracking-tight">₹{(summary?.latestPayrollSpend ?? 0).toLocaleString()}</h3>
                    <span className="text-xs text-[#D97706] font-semibold mt-2 block flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]"></span>
                      Gross Spend
                    </span>
                  </div>
                  <div className="w-14 h-14 rounded-[18px] bg-white border border-[#EAE7E0] shadow-sm text-[#D97706] flex items-center justify-center shrink-0">
                    <DollarSign size={24} strokeWidth={1.5} />
                  </div>
                </div>
              </DoppelrandCard>
            ) : (
              <DoppelrandCard hoverable={true}>
                <div className="flex items-center justify-between h-full">
                  <div>
                    <span className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-[#6B655C]">Departments</span>
                    <h3 className="text-4xl font-black text-[#1F2B4D] mt-2 tracking-tight">{summary?.departmentCount ?? 0}</h3>
                    <span className="text-xs text-[#6B655C] font-semibold mt-2 block flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#6B655C]"></span>
                      Active Units
                    </span>
                  </div>
                  <div className="w-14 h-14 rounded-[18px] bg-white border border-[#EAE7E0] shadow-sm text-[#1F2B4D] flex items-center justify-center shrink-0">
                    <Building2 size={24} strokeWidth={1.5} />
                  </div>
                </div>
              </DoppelrandCard>
            )}
          </>
        )}
      </div>

      {/* TAB 1: OVERVIEW (Asymmetrical Bento Grid) */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-4 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]">
          <DoppelrandCard className="lg:col-span-5">
            <h3 className="text-xl font-bold text-[#1F2B4D] mb-6 flex items-center gap-2">
              <PieChartIcon size={20} className="text-[#0F766E]" strokeWidth={1.5} />
              Headcount Distribution
            </h3>
            <div className="flex-1 min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 20, right: 40, left: 40, bottom: 20 }}>
                  <Pie
                    data={demographics.byDepartment}
                    dataKey="count"
                    nameKey="department"
                    cx="55%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    stroke="none"
                    label={({ department, count }) => `${department}: ${count}`}
                    labelLine={false}
                  >
                    {demographics.byDepartment.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontFamily: 'Plus Jakarta Sans', fontSize: '13px', fontWeight: '500' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </DoppelrandCard>

          <DoppelrandCard className="lg:col-span-7">
            <h3 className="text-xl font-bold text-[#1F2B4D] mb-6 flex items-center gap-2">
              <CalendarCheck size={20} className="text-[#D97706]" strokeWidth={1.5} />
              Monthly Attendance Snapshot
            </h3>
            <div className="flex-1 min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={attendance.byStatus} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EAE7E0" />
                  <XAxis dataKey="status" axisLine={false} tickLine={false} tick={{ fill: '#6B655C', fontSize: 12, fontFamily: 'JetBrains Mono' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B655C', fontSize: 12, fontFamily: 'JetBrains Mono' }} />
                  <Tooltip cursor={{ fill: 'rgba(31,43,77,0.03)' }} />
                  <Bar dataKey="count" fill="#1F2B4D" radius={[12, 12, 0, 0]} maxBarSize={60} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </DoppelrandCard>
        </div>
      )}

      {/* TAB 2: DEMOGRAPHICS */}
      {activeTab === 'demographics' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-4 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]">
          <DoppelrandCard>
            <h3 className="text-xl font-bold text-[#1F2B4D] mb-6">Headcount by Department</h3>
            <div className="flex-1 min-h-[340px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={demographics.byDepartment} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#EAE7E0" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#6B655C', fontSize: 12, fontFamily: 'JetBrains Mono' }} />
                  <YAxis dataKey="department" type="category" width={100} axisLine={false} tickLine={false} tick={{ fill: '#1F2B4D', fontSize: 13, fontWeight: 600 }} />
                  <Tooltip cursor={{ fill: 'rgba(31,43,77,0.03)' }} />
                  <Bar dataKey="count" fill="#0F766E" radius={[0, 12, 12, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </DoppelrandCard>

          <DoppelrandCard>
            <h3 className="text-xl font-bold text-[#1F2B4D] mb-6">Headcount by Office Location</h3>
            <div className="flex-1 min-h-[340px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={demographics.byOffice} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EAE7E0" />
                  <XAxis dataKey="officeName" axisLine={false} tickLine={false} tick={{ fill: '#1F2B4D', fontSize: 13, fontWeight: 600 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B655C', fontSize: 12, fontFamily: 'JetBrains Mono' }} />
                  <Tooltip cursor={{ fill: 'rgba(31,43,77,0.03)' }} />
                  <Bar dataKey="count" fill="#6366F1" radius={[12, 12, 0, 0]} maxBarSize={60} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </DoppelrandCard>
        </div>
      )}

      {/* TAB 3: ATTENDANCE */}
      {activeTab === 'attendance' && (
        <div className="mt-4 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]">
          <DoppelrandCard>
            <h3 className="text-xl font-bold text-[#1F2B4D] mb-8">Monthly Attendance Status Breakdown ({attendance.period})</h3>
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={attendance.byStatus} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EAE7E0" />
                  <XAxis dataKey="status" axisLine={false} tickLine={false} tick={{ fill: '#1F2B4D', fontSize: 14, fontWeight: 600 }} dy={12} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B655C', fontSize: 12, fontFamily: 'JetBrains Mono' }} />
                  <Tooltip cursor={{ fill: 'rgba(31,43,77,0.03)' }} />
                  <Legend wrapperStyle={{ paddingTop: '30px', fontFamily: 'Plus Jakarta Sans', fontSize: '13px', fontWeight: '500' }} />
                  <Bar dataKey="count" fill="#1F2B4D" radius={[16, 16, 0, 0]} maxBarSize={100} name="Recorded Days" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </DoppelrandCard>
        </div>
      )}

      {/* TAB 4: FINANCIALS (ADMIN ONLY) */}
      {activeTab === 'payroll' && isAdmin && (
        <div className="mt-4 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]">
          <DoppelrandCard>
            <h3 className="text-xl font-bold text-[#1F2B4D] mb-8">12-Month Payroll Spend Trend (INR)</h3>
            <div className="h-[440px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={payroll.payrollTrend} margin={{ top: 20, right: 20, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EAE7E0" vertical={false} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#6B655C', fontSize: 12, fontFamily: 'JetBrains Mono' }} dy={12} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B655C', fontSize: 12, fontFamily: 'JetBrains Mono' }} tickFormatter={(val) => `₹${(val/1000)}k`} />
                  <Tooltip formatter={(val) => `₹${Number(val).toLocaleString()}`} cursor={{ fill: 'rgba(31,43,77,0.03)' }} />
                  <Legend wrapperStyle={{ paddingTop: '30px', fontFamily: 'Plus Jakarta Sans', fontSize: '13px', fontWeight: '500' }} iconType="circle" />
                  <Bar dataKey="grossSalary" fill="#1F2B4D" name="Gross Salary" radius={[8, 8, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="netSalary" fill="#0F766E" name="Net Salary" radius={[8, 8, 0, 0]} maxBarSize={40} />
                  <Line type="monotone" dataKey="avgSalary" stroke="#D97706" strokeWidth={4} dot={{ strokeWidth: 2, r: 4, fill: '#fff' }} name="Avg. Salary/Emp" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </DoppelrandCard>
        </div>
      )}

      {/* TAB 5: CSV REPORTS CENTER */}
      {activeTab === 'exports' && (
        <div className="mt-4 flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]">
          <DoppelrandCard>
            <div className="mb-8 max-w-2xl">
              <h3 className="text-2xl font-black text-[#1F2B4D] mb-2 tracking-tight">Report Export Hub</h3>
              <p className="text-[#6B655C] font-medium leading-relaxed">Download structured, aggregate report data in standard CSV format for external analysis, auditing, or importing into other BI tools.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              
              <div className="bg-[#FAF9F6] border border-[#EAE7E0] rounded-[24px] p-6 flex flex-col justify-between hover:-translate-y-1 transition-transform duration-500 hover:shadow-md">
                <div>
                  <div className="w-12 h-12 rounded-[16px] bg-white border border-[#EAE7E0] shadow-sm flex items-center justify-center mb-5">
                    <FileSpreadsheet size={24} className="text-[#0F766E]" strokeWidth={1.5} />
                  </div>
                  <h4 className="font-bold text-[#1F2B4D] text-lg leading-tight">Demographics<br/>Report</h4>
                  <p className="text-xs text-[#6B655C] mt-2 leading-relaxed font-medium">Headcount totals aggregated by department and office location.</p>
                </div>
                <button
                  onClick={() => handleExportCSV('demographics')}
                  disabled={exporting}
                  className="mt-6 w-full flex items-center justify-center gap-2 bg-white hover:bg-[#FAF9F6] text-[#1F2B4D] border border-[#EAE7E0] shadow-sm font-bold rounded-[14px] py-3 text-[13px] transition-colors"
                >
                  <Download size={16} /> Export CSV
                </button>
              </div>

              <div className="bg-[#FAF9F6] border border-[#EAE7E0] rounded-[24px] p-6 flex flex-col justify-between hover:-translate-y-1 transition-transform duration-500 hover:shadow-md">
                <div>
                  <div className="w-12 h-12 rounded-[16px] bg-white border border-[#EAE7E0] shadow-sm flex items-center justify-center mb-5">
                    <FileSpreadsheet size={24} className="text-[#D97706]" strokeWidth={1.5} />
                  </div>
                  <h4 className="font-bold text-[#1F2B4D] text-lg leading-tight">Attendance<br/>Report</h4>
                  <p className="text-xs text-[#6B655C] mt-2 leading-relaxed font-medium">Monthly attendance status totals (Present, Absent, Leave).</p>
                </div>
                <button
                  onClick={() => handleExportCSV('attendance')}
                  disabled={exporting}
                  className="mt-6 w-full flex items-center justify-center gap-2 bg-white hover:bg-[#FAF9F6] text-[#1F2B4D] border border-[#EAE7E0] shadow-sm font-bold rounded-[14px] py-3 text-[13px] transition-colors"
                >
                  <Download size={16} /> Export CSV
                </button>
              </div>

              <div className="bg-[#FAF9F6] border border-[#EAE7E0] rounded-[24px] p-6 flex flex-col justify-between hover:-translate-y-1 transition-transform duration-500 hover:shadow-md">
                <div>
                  <div className="w-12 h-12 rounded-[16px] bg-white border border-[#EAE7E0] shadow-sm flex items-center justify-center mb-5">
                    <FileSpreadsheet size={24} className="text-[#6366F1]" strokeWidth={1.5} />
                  </div>
                  <h4 className="font-bold text-[#1F2B4D] text-lg leading-tight">Benefits<br/>Report</h4>
                  <p className="text-xs text-[#6B655C] mt-2 leading-relaxed font-medium">Active employee benefit coverage counts by category.</p>
                </div>
                <button
                  onClick={() => handleExportCSV('benefits')}
                  disabled={exporting}
                  className="mt-6 w-full flex items-center justify-center gap-2 bg-white hover:bg-[#FAF9F6] text-[#1F2B4D] border border-[#EAE7E0] shadow-sm font-bold rounded-[14px] py-3 text-[13px] transition-colors"
                >
                  <Download size={16} /> Export CSV
                </button>
              </div>

              {isAdmin && (
                <div className="bg-slate-900 border border-slate-800 rounded-[24px] p-6 flex flex-col justify-between hover:-translate-y-1 transition-transform duration-500 hover:shadow-lg hover:shadow-slate-900/20">
                  <div>
                    <div className="w-12 h-12 rounded-[16px] bg-slate-800/80 border border-slate-700 shadow-sm flex items-center justify-center mb-5">
                      <FileSpreadsheet size={24} className="text-emerald-400" strokeWidth={1.5} />
                    </div>
                    <h4 className="font-bold text-white text-lg leading-tight">Payroll Financials<br/>Report</h4>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed font-medium">Monthly gross/net salary and statutory deductions.</p>
                  </div>
                  <button
                    onClick={() => handleExportCSV('payroll')}
                    disabled={exporting}
                    className="mt-6 w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-900 border-none shadow-sm font-bold rounded-[14px] py-3 text-[13px] transition-colors"
                  >
                    <Download size={16} /> Export Financial CSV
                  </button>
                </div>
              )}

            </div>
          </DoppelrandCard>
        </div>
      )}

    </div>
  );
};

export default WorkforceAnalytics;
