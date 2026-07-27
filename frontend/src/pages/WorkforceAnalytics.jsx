import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
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
  TrendingUp,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';
import toast from 'react-hot-toast';

const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#3B82F6'];

const WorkforceAnalytics = ({ user }) => {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'demographics' | 'attendance' | 'payroll' | 'exports'
  const [summary, setSummary] = useState(null);
  const [demographics, setDemographics] = useState({ byDepartment: [], byOffice: [] });
  const [attendance, setAttendance] = useState({ byStatus: [] });
  const [payroll, setPayroll] = useState({ payrollTrend: [] });
  const [benefits, setBenefits] = useState({ byCategory: [] });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const isAdmin = user?.roleDefinition?.level <= 1 || user?.role === 'Admin' || user?.role === 'SuperAdmin';
  const isManager = user?.roleDefinition?.level <= 2 || user?.role === 'Manager' || isAdmin;
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const fetchAnalyticsData = async (forceRefresh = false) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) return;

      const headers = { 'Authorization': `Bearer ${token}` };
      const refreshQuery = forceRefresh ? '?refresh=true' : '';

      // 1. Fetch KPI Summary
      const summaryRes = await fetch(`${apiBase}/api/analytics/summary${refreshQuery}`, { headers });
      if (summaryRes.ok) setSummary(await summaryRes.json());

      // 2. Fetch Demographics
      const demoRes = await fetch(`${apiBase}/api/analytics/demographics${refreshQuery}`, { headers });
      if (demoRes.ok) setDemographics(await demoRes.json());

      // 3. Fetch Attendance
      const attRes = await fetch(`${apiBase}/api/analytics/attendance${refreshQuery}`, { headers });
      if (attRes.ok) setAttendance(await attRes.json());

      // 4. Fetch Benefits
      const benRes = await fetch(`${apiBase}/api/analytics/benefits${refreshQuery}`, { headers });
      if (benRes.ok) setBenefits(await benRes.json());

      // 5. Fetch Payroll (Admin Only)
      if (isAdmin) {
        const payRes = await fetch(`${apiBase}/api/analytics/payroll${refreshQuery}`, { headers });
        if (payRes.ok) setPayroll(await payRes.json());
      }

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
      <div className="p-8 max-w-4xl mx-auto text-center">
        <Card className="p-12 rounded-3xl border border-slate-200 bg-white flex flex-col items-center gap-4">
          <AlertCircle size={48} className="text-amber-500" />
          <h2 className="text-2xl font-black text-slate-800">Access Restricted</h2>
          <p className="text-slate-500 text-sm max-w-md">
            Workforce Analytics & Reports are reserved for Managers and Executive Administrators.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto min-h-full flex flex-col gap-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2.5">
            <BarChart3 size={28} className="text-indigo-600" />
            Workforce Analytics & Reports
          </h1>
          <p className="text-slate-500 mt-1 text-sm">Real-time organizational insights, attendance patterns, and financial spend analytics.</p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => fetchAnalyticsData(true)}
            variant="outline"
            disabled={loading}
            className="rounded-2xl text-xs font-bold gap-1.5 border-slate-200 text-slate-700 bg-white hover:bg-slate-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh Data
          </Button>

          {/* Tab Navigation */}
          <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded-xl font-bold text-xs transition-all ${
                activeTab === 'overview' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Overview
            </button>

            <button
              onClick={() => setActiveTab('demographics')}
              className={`px-4 py-2 rounded-xl font-bold text-xs transition-all ${
                activeTab === 'demographics' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Demographics
            </button>

            <button
              onClick={() => setActiveTab('attendance')}
              className={`px-4 py-2 rounded-xl font-bold text-xs transition-all ${
                activeTab === 'attendance' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Attendance
            </button>

            {isAdmin && (
              <button
                onClick={() => setActiveTab('payroll')}
                className={`px-4 py-2 rounded-xl font-bold text-xs transition-all ${
                  activeTab === 'payroll' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Financials
              </button>
            )}

            <button
              onClick={() => setActiveTab('exports')}
              className={`px-4 py-2 rounded-xl font-bold text-xs transition-all ${
                activeTab === 'exports' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              CSV Reports
            </button>
          </div>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="p-5 rounded-3xl border border-slate-200/80 bg-white shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Headcount</span>
            <h3 className="text-2xl font-black text-slate-800 mt-1">{summary?.activeHeadcount ?? 0}</h3>
            <span className="text-[10px] text-emerald-600 font-bold mt-1 block">Active Employees</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Users size={24} />
          </div>
        </Card>

        <Card className="p-5 rounded-3xl border border-slate-200/80 bg-white shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Attendance Rate</span>
            <h3 className="text-2xl font-black text-slate-800 mt-1">{summary?.attendanceRate ?? 100}%</h3>
            <span className="text-[10px] text-indigo-600 font-bold mt-1 block">Current Month Average</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CalendarCheck size={24} />
          </div>
        </Card>

        <Card className="p-5 rounded-3xl border border-slate-200/80 bg-white shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Benefit Enrollments</span>
            <h3 className="text-2xl font-black text-slate-800 mt-1">{summary?.activeBenefitEnrollments ?? 0}</h3>
            <span className="text-[10px] text-purple-600 font-bold mt-1 block">Active Coverage Plans</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <HeartHandshake size={24} />
          </div>
        </Card>

        {isAdmin ? (
          <Card className="p-5 rounded-3xl border border-slate-200/80 bg-white shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Monthly Payroll Spend</span>
              <h3 className="text-2xl font-black text-slate-800 mt-1">₹{(summary?.latestPayrollSpend ?? 0).toLocaleString()}</h3>
              <span className="text-[10px] text-amber-600 font-bold mt-1 block">Gross Payroll Spend ({summary?.month})</span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <DollarSign size={24} />
            </div>
          </Card>
        ) : (
          <Card className="p-5 rounded-3xl border border-slate-200/80 bg-white shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Departments</span>
              <h3 className="text-2xl font-black text-slate-800 mt-1">{summary?.departmentCount ?? 0}</h3>
              <span className="text-[10px] text-slate-500 font-bold mt-1 block">Organizational Units</span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center font-bold">
              <Building2 size={24} />
            </div>
          </Card>
        )}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6 rounded-3xl border border-slate-200 bg-white shadow-sm flex flex-col gap-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <PieChartIcon size={20} className="text-indigo-600" />
              Department Headcount Distribution
            </h3>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={demographics.byDepartment}
                    dataKey="count"
                    nameKey="department"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    label={({ department, count }) => `${department}: ${count}`}
                  >
                    {demographics.byDepartment.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-6 rounded-3xl border border-slate-200 bg-white shadow-sm flex flex-col gap-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <CalendarCheck size={20} className="text-emerald-600" />
              Monthly Attendance Status Distribution
            </h3>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={attendance.byStatus}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="status" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#10B981" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: DEMOGRAPHICS */}
      {activeTab === 'demographics' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6 rounded-3xl border border-slate-200 bg-white shadow-sm flex flex-col gap-4">
            <h3 className="text-lg font-bold text-slate-800">Headcount by Department</h3>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={demographics.byDepartment} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" />
                  <YAxis dataKey="department" type="category" width={100} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#6366F1" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-6 rounded-3xl border border-slate-200 bg-white shadow-sm flex flex-col gap-4">
            <h3 className="text-lg font-bold text-slate-800">Headcount by Office Location</h3>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={demographics.byOffice}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="officeName" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8B5CF6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 3: ATTENDANCE */}
      {activeTab === 'attendance' && (
        <Card className="p-6 rounded-3xl border border-slate-200 bg-white shadow-sm flex flex-col gap-4">
          <h3 className="text-lg font-bold text-slate-800">Monthly Attendance Status Breakdown ({attendance.period})</h3>
          <div className="h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attendance.byStatus}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="status" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#10B981" radius={[8, 8, 0, 0]} name="Recorded Days" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* TAB 4: FINANCIALS (ADMIN ONLY) */}
      {activeTab === 'payroll' && isAdmin && (
        <Card className="p-6 rounded-3xl border border-slate-200 bg-white shadow-sm flex flex-col gap-4">
          <h3 className="text-lg font-bold text-slate-800">12-Month Payroll Spend Trend (INR)</h3>
          <div className="h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={payroll.payrollTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(val) => `₹${Number(val).toLocaleString()}`} />
                <Legend />
                <Bar dataKey="grossSalary" fill="#6366F1" name="Gross Salary" radius={[6, 6, 0, 0]} />
                <Bar dataKey="netSalary" fill="#10B981" name="Net Salary" radius={[6, 6, 0, 0]} />
                <Line type="monotone" dataKey="avgSalary" stroke="#F59E0B" strokeWidth={3} name="Average Salary per Employee" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* TAB 5: CSV REPORTS CENTER */}
      {activeTab === 'exports' && (
        <div className="flex flex-col gap-6">
          <Card className="p-6 rounded-3xl border border-slate-200 bg-white shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-1">CSV Report Exporter</h3>
            <p className="text-xs text-slate-500 mb-6">Download structured, aggregate report data in standard CSV format for external analysis.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="p-5 rounded-2xl border border-slate-100 bg-slate-50 flex flex-col justify-between">
                <div>
                  <FileSpreadsheet size={24} className="text-indigo-600 mb-2" />
                  <h4 className="font-bold text-slate-800 text-sm">Demographics Report</h4>
                  <p className="text-xs text-slate-500 mt-1">Headcount totals aggregated by department and office location.</p>
                </div>
                <Button
                  onClick={() => handleExportCSV('demographics')}
                  disabled={exporting}
                  className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs gap-1.5"
                >
                  <Download size={14} /> Download Demographics CSV
                </Button>
              </Card>

              <Card className="p-5 rounded-2xl border border-slate-100 bg-slate-50 flex flex-col justify-between">
                <div>
                  <FileSpreadsheet size={24} className="text-emerald-600 mb-2" />
                  <h4 className="font-bold text-slate-800 text-sm">Attendance Report</h4>
                  <p className="text-xs text-slate-500 mt-1">Monthly attendance status totals (Present, Absent, HalfDay, OnLeave).</p>
                </div>
                <Button
                  onClick={() => handleExportCSV('attendance')}
                  disabled={exporting}
                  className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs gap-1.5"
                >
                  <Download size={14} /> Download Attendance CSV
                </Button>
              </Card>

              <Card className="p-5 rounded-2xl border border-slate-100 bg-slate-50 flex flex-col justify-between">
                <div>
                  <FileSpreadsheet size={24} className="text-purple-600 mb-2" />
                  <h4 className="font-bold text-slate-800 text-sm">Benefits Report</h4>
                  <p className="text-xs text-slate-500 mt-1">Active employee benefit coverage counts by category.</p>
                </div>
                <Button
                  onClick={() => handleExportCSV('benefits')}
                  disabled={exporting}
                  className="mt-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs gap-1.5"
                >
                  <Download size={14} /> Download Benefits CSV
                </Button>
              </Card>

              {isAdmin && (
                <Card className="p-5 rounded-2xl border border-slate-100 bg-slate-50 flex flex-col justify-between">
                  <div>
                    <FileSpreadsheet size={24} className="text-amber-600 mb-2" />
                    <h4 className="font-bold text-slate-800 text-sm">Payroll Financials Report</h4>
                    <p className="text-xs text-slate-500 mt-1">Monthly gross salary, net salary, PF & PT statutory deductions.</p>
                  </div>
                  <Button
                    onClick={() => handleExportCSV('payroll')}
                    disabled={exporting}
                    className="mt-4 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs gap-1.5"
                  >
                    <Download size={14} /> Download Payroll CSV
                  </Button>
                </Card>
              )}
            </div>
          </Card>
        </div>
      )}

    </div>
  );
};

export default WorkforceAnalytics;
