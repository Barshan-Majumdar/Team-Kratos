import React, { useState, useEffect } from 'react';
import { hasPermission } from '../lib/permissions';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { 
  Clock, 
  Check, 
  Calendar, 
  X, 
  Search, 
  Briefcase, 
  DollarSign, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  Plus, 
  Filter,
  FileText,
  ChevronDown
} from 'lucide-react';
import { TableSkeleton } from '../components/ui/Skeleton';
import { motion, AnimatePresence } from 'framer-motion';

const CustomSelect = ({ value, onChange, options, placeholder, bg = "bg-[#FAF8F5]" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(o => String(o.id) === String(value));

  return (
    <div className="relative w-full min-w-0">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-3 py-2 ${bg} border border-[#EAE7E0] text-[#1F2B4D] text-xs font-bold rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1F2B4D] flex items-center justify-between gap-2 overflow-hidden text-left shadow-2xs`}
      >
        <span className="truncate flex-1">
          {selectedOption ? selectedOption.name : placeholder}
        </span>
        <ChevronDown size={14} className={`shrink-0 transition-transform text-[#6B655C] ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-1 z-40 bg-white border border-[#EAE7E0] rounded-xl shadow-lg max-h-48 overflow-y-auto w-full p-1 space-y-0.5">
            <button
              type="button"
              onClick={() => { onChange(''); setIsOpen(false); }}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors truncate ${
                !value ? 'bg-[#1F2B4D] text-white' : 'text-[#6B655C] hover:bg-[#FAF8F5]'
              }`}
            >
              {placeholder}
            </button>
            {options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => { onChange(opt.id); setIsOpen(false); }}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors truncate ${
                  String(value) === String(opt.id) ? 'bg-[#1F2B4D] text-white' : 'text-[#1F2B4D] hover:bg-[#FAF8F5]'
                }`}
              >
                {opt.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const Timesheet = ({ user }) => {
  const [timesheets, setTimesheets] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'Submitted' | 'Approved' | 'Rejected'
  const [billableFilter, setBillableFilter] = useState('ALL'); // 'ALL' | 'BILLABLE' | 'NON_BILLABLE'

  // Modal & Inline Form states
  const [showAddModal, setShowAddModal] = useState(false);
  const [projectId, setProjectId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [hours, setHours] = useState('');
  const [description, setDescription] = useState('');
  const [isBillable, setIsBillable] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const isAdmin = hasPermission(user, 'view_all_employees');
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const [tsRes, projRes] = await Promise.all([
        axios.get(`${apiBase}/api/projects/timesheets`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${apiBase}/api/projects`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setTimesheets(Array.isArray(tsRes.data) ? tsRes.data : []);
      setProjects(Array.isArray(projRes.data) ? projRes.data : []);
    } catch (err) {
      toast.error('Failed to load timesheet data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleLogHours = async (e) => {
    e.preventDefault();
    if (!projectId || !hours || !date) {
      toast.error('Please select a project, date, and enter hours.');
      return;
    }
    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      await axios.post(`${apiBase}/api/projects/timesheets`, {
        projectId, date, hours, description, isBillable
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('🎉 Hours logged successfully');
      setShowAddModal(false);
      setHours('');
      setDescription('');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to log hours');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${apiBase}/api/projects/timesheets/${id}/status`, {
        status: 'Approved'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Timesheet entry approved');
      fetchData();
    } catch (err) {
      toast.error('Failed to approve timesheet');
    }
  };

  // Metrics math
  const totalHours = timesheets.reduce((acc, t) => acc + Number(t.hours || 0), 0);
  const billableHours = timesheets.filter(t => t.isBillable).reduce((acc, t) => acc + Number(t.hours || 0), 0);
  const billablePercentage = totalHours > 0 ? Math.round((billableHours / totalHours) * 100) : 0;
  const pendingApprovalsCount = timesheets.filter(t => t.status === 'Submitted').length;

  // Project distribution math
  const projectHoursMap = timesheets.reduce((acc, t) => {
    const name = t.project?.name || 'General Work';
    acc[name] = (acc[name] || 0) + Number(t.hours || 0);
    return acc;
  }, {});

  const projectDistribution = Object.entries(projectHoursMap)
    .map(([name, hrs]) => ({ name, hrs, pct: totalHours > 0 ? Math.round((hrs / totalHours) * 100) : 0 }))
    .sort((a, b) => b.hrs - a.hrs);

  // Filtered timesheets
  const filteredTimesheets = timesheets.filter((t) => {
    const matchesSearch = 
      (t.project?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.user?.displayName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    const matchesBillable = 
      billableFilter === 'ALL' ? true :
      billableFilter === 'BILLABLE' ? t.isBillable : !t.isBillable;

    return matchesSearch && matchesStatus && matchesBillable;
  });

  // Animation Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { 
      opacity: 1, 
      y: 0,
      transition: { type: 'spring', stiffness: 260, damping: 20 }
    }
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 }
  };

  if (loading) return (
    <div className="w-full min-h-full flex flex-col gap-4 p-3 sm:p-5 md:p-6">
      <div className="animate-pulse space-y-2">
        <div className="h-6 w-36 bg-[#EAE7E0] rounded-lg" />
        <div className="h-3.5 w-64 bg-[#F4F1EA] rounded" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-[#FAF8F5] border border-[#EAE7E0] rounded-2xl animate-pulse" />)}
      </div>
      <div className="double-bezel-outer bg-[#F4F1EA] p-1 rounded-[16px]">
        <div className="double-bezel-inner bg-white min-h-[350px] p-4 rounded-[14px]">
          <TableSkeleton rows={5} cols={5} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full min-h-full flex flex-col gap-3.5 sm:gap-4 p-3 sm:p-5 md:p-6">
      
      {/* ── TOP EXECUTIVE HEADER ── */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="flex flex-col min-[600px]:flex-row min-[600px]:items-center justify-between gap-3 pb-3 border-b border-[#EAE7E0] w-full"
      >
        <div>
          <h1 className="font-serif font-bold text-lg sm:text-2xl md:text-3xl text-[#1F2B4D] tracking-tight leading-tight flex items-center gap-2.5">
            <div className="p-2 bg-white rounded-xl shadow-2xs border border-[#EAE7E0]">
              <Clock className="text-[#1F2B4D] w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <span>Timesheets & Time Tracking</span>
          </h1>
          <p className="text-[#6B655C] mt-1 text-xs sm:text-sm font-medium">
            Log client project hours, audit billable utilization, and manage approval workflows.
          </p>
        </div>
        
        {/* Sweep Animation Button - Premium Hover Motion */}
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="relative overflow-hidden group inline-flex items-center justify-center gap-1.5 bg-white border border-[#EAE7E0] text-[#1F2B4D] px-4 py-2 sm:py-2.5 rounded-xl text-xs font-display font-bold uppercase tracking-wider shadow-2xs transition-all duration-300 hover:border-[#1F2B4D] active:scale-95 whitespace-nowrap shrink-0 w-full min-[600px]:w-auto"
        >
          {/* Sweep Background */}
          <span className="absolute inset-0 bg-[#1F2B4D] translate-y-[100%] group-hover:translate-y-0 transition-transform duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) z-0" />
          
          <Plus size={15} className="relative z-10 text-[#1F2B4D] group-hover:text-white transition-colors duration-300 shrink-0" />
          <span className="relative z-10 group-hover:text-white transition-colors duration-300">Log Hours</span>
        </button>
      </motion.div>

      {/* ── TOP 4 KPI SUMMARY CARDS (FULL DESKTOP WIDTH) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5 w-full">
        {/* Card 1 */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-[#EAE7E0] shadow-2xs flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[9.5px] sm:text-[10.5px] font-display font-bold uppercase tracking-wider text-[#6B655C]">Total Hours Logged</span>
            <div className="p-1.5 bg-[#FAF8F5] rounded-xl border border-[#EAE7E0] text-[#1F2B4D]">
              <Clock size={16} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-bold text-[#1F2B4D] tracking-tight">{totalHours}h</span>
            <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-0.5"><TrendingUp size={12}/> Active</span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-[#EAE7E0] shadow-2xs flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[9.5px] sm:text-[10.5px] font-display font-bold uppercase tracking-wider text-[#6B655C]">Billable Ratio</span>
            <div className="p-1.5 bg-[#FAF8F5] rounded-xl border border-[#EAE7E0] text-emerald-600">
              <DollarSign size={16} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-bold text-[#1F2B4D] tracking-tight">{billablePercentage}%</span>
            <span className="text-[10px] text-[#6B655C] font-medium">({billableHours}h billable)</span>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-[#EAE7E0] shadow-2xs flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[9.5px] sm:text-[10.5px] font-display font-bold uppercase tracking-wider text-[#6B655C]">Pending Approvals</span>
            <div className="p-1.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-600">
              <AlertCircle size={16} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-bold text-[#1F2B4D] tracking-tight">{pendingApprovalsCount}</span>
            <span className="text-[10px] text-amber-700 font-medium">Requires Action</span>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-[#EAE7E0] shadow-2xs flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[9.5px] sm:text-[10.5px] font-display font-bold uppercase tracking-wider text-[#6B655C]">Active Projects</span>
            <div className="p-1.5 bg-[#FAF8F5] rounded-xl border border-[#EAE7E0] text-[#1F2B4D]">
              <Briefcase size={16} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-bold text-[#1F2B4D] tracking-tight">{projectDistribution.length || projects.length}</span>
            <span className="text-[10px] text-[#6B655C] font-medium">Projects tracked</span>
          </div>
        </div>
      </div>

      {/* ── DESKTOP SPLIT GRID (8 COLS TABLE + 4 COLS SIDEBAR) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4 w-full flex-1">
        
        {/* LEFT COLUMN: TIMESHEET ENTRIES TABLE (8 COLS) */}
        <div className="lg:col-span-8 flex flex-col gap-3">
          
          {/* Controls & Filter Bar */}
          <div className="bg-white p-2.5 sm:p-3 rounded-2xl border border-[#EAE7E0] shadow-2xs flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 w-full">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6B655C]" />
              <input 
                type="text"
                placeholder="Search project, employee, description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-[#FAF8F5] border border-[#EAE7E0] rounded-xl text-xs text-[#1F2B4D] font-medium focus:ring-2 focus:ring-[#1F2B4D]"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-[#FAF8F5] p-1 rounded-xl border border-[#EAE7E0]">
              {['ALL', 'Submitted', 'Approved'].map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-display font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                    statusFilter === status ? 'bg-white text-[#1F2B4D] shadow-2xs border border-[#EAE7E0]' : 'text-[#6B655C] hover:text-[#1F2B4D]'
                  }`}
                >
                  {status === 'ALL' ? 'All' : status}
                </button>
              ))}
            </div>
          </div>

          {/* Main Table Container (Zero Sliding table-fixed w-full) */}
          <motion.div 
            initial="hidden" 
            animate="show" 
            variants={containerVariants}
            className="double-bezel-outer bg-[#F4F1EA] p-1 rounded-[18px] flex-1 flex flex-col"
          >
            <div className="double-bezel-inner bg-white rounded-[16px] overflow-hidden shadow-2xs w-full flex-1 flex flex-col">
              <table className="w-full table-fixed text-left border-collapse">
                <thead>
                  <tr className="bg-[#FAF9F6] border-b border-[#EAE7E0] text-[8px] min-[400px]:text-[9px] min-[540px]:text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wide">
                    <th className={`py-2.5 sm:py-3 px-1.5 min-[400px]:px-2 ${isAdmin ? 'w-[14%]' : 'w-[18%]'}`}>Date</th>
                    {isAdmin && <th className="py-2.5 sm:py-3 px-1.5 min-[400px]:px-2 w-[16%]">Employee</th>}
                    <th className={`py-2.5 sm:py-3 px-1.5 min-[400px]:px-2 ${isAdmin ? 'w-[26%]' : 'w-[42%]'}`}>
                      <span className="hidden min-[480px]:inline">Project & Log</span>
                      <span className="inline min-[480px]:hidden">Project</span>
                    </th>
                    <th className={`py-2.5 sm:py-3 px-1.5 min-[400px]:px-2 ${isAdmin ? 'w-[10%]' : 'w-[12%]'}`}>Hours</th>
                    <th className={`py-2.5 sm:py-3 px-1.5 min-[400px]:px-2 ${isAdmin ? 'w-[11%]' : 'w-[14%]'}`}>Type</th>
                    <th className={`py-2.5 sm:py-3 px-1.5 min-[400px]:px-2 text-center ${isAdmin ? 'w-[12%]' : 'w-[14%]'}`}>Status</th>
                    {isAdmin && <th className="py-2.5 sm:py-3 px-1.5 min-[400px]:px-2 w-[11%] text-right">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F4F1EA] text-xs">
                  <AnimatePresence>
                    {filteredTimesheets.map((entry) => (
                      <motion.tr 
                        key={entry.id} 
                        variants={itemVariants}
                        className="hover:bg-[#FAF9F6] transition-colors"
                      >
                        <td className="py-2 sm:py-2.5 px-1.5 min-[400px]:px-2">
                          <div className="flex items-center gap-1 text-[9.5px] min-[400px]:text-[11px] sm:text-xs font-semibold text-[#1F2B4D] truncate">
                            <Calendar size={11} className="text-[#6B655C] shrink-0" />
                            <span className="truncate">{new Date(entry.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</span>
                          </div>
                        </td>
                        {isAdmin && (
                          <td className="py-2 sm:py-2.5 px-1.5 min-[400px]:px-2 text-[9.5px] min-[400px]:text-[11px] sm:text-xs font-bold text-[#1F2B4D] truncate">
                            {entry.user?.displayName || 'Unknown'}
                          </td>
                        )}
                        <td className="py-2 sm:py-2.5 px-1.5 min-[400px]:px-2">
                          <div className="text-[9.5px] min-[400px]:text-[11px] sm:text-xs font-bold text-[#1F2B4D] truncate">{entry.project?.name || 'General Work'}</div>
                          {entry.description && (
                            <div className="text-[8.5px] min-[400px]:text-[9.5px] text-[#6B655C] font-medium truncate" title={entry.description}>
                              {entry.description}
                            </div>
                          )}
                        </td>
                        <td className="py-2 sm:py-2.5 px-1.5 min-[400px]:px-2 text-[9.5px] min-[400px]:text-[11px] sm:text-xs font-extrabold text-[#1F2B4D] truncate">
                          {entry.hours}h
                        </td>
                        <td className="py-2 sm:py-2.5 px-1.5 min-[400px]:px-2">
                          <span className={`inline-flex px-1 min-[400px]:px-1.5 py-0.5 rounded-full text-[7.5px] min-[400px]:text-[8.5px] font-display font-bold uppercase tracking-wider truncate ${
                            entry.isBillable ? 'bg-indigo-50 text-indigo-800 border border-indigo-200' : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}>
                            {entry.isBillable ? 'Billable' : 'Non-Bill'}
                          </span>
                        </td>
                        <td className="py-2 sm:py-2.5 px-1.5 min-[400px]:px-2 text-center">
                          <span className={`inline-flex items-center justify-center gap-1 px-1 min-[400px]:px-1.5 py-0.5 rounded-full text-[7.5px] min-[400px]:text-[8.5px] font-display font-bold uppercase tracking-wider shrink-0 ${
                            entry.status === 'Approved' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                            entry.status === 'Rejected' ? 'bg-rose-50 text-rose-800 border border-rose-200' : 
                            'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}>
                            {entry.status === 'Approved' && <div className="w-1 h-1 rounded-full bg-emerald-500 shrink-0" />}
                            {entry.status === 'Rejected' && <div className="w-1 h-1 rounded-full bg-rose-500 shrink-0" />}
                            {entry.status === 'Submitted' && <div className="w-1 h-1 rounded-full bg-amber-500 shrink-0" />}
                            <span>{entry.status}</span>
                          </span>
                        </td>
                        {isAdmin && (
                          <td className="py-2 sm:py-2.5 px-1.5 min-[400px]:px-2 text-right">
                            {entry.status === 'Submitted' && (
                              <button 
                                type="button"
                                onClick={() => handleApprove(entry.id)} 
                                className="p-1 text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-lg transition-colors shadow-2xs inline-flex shrink-0" 
                                title="Approve"
                              >
                                <Check size={12} strokeWidth={3} />
                              </button>
                            )}
                          </td>
                        )}
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                  {filteredTimesheets.length === 0 && (
                    <tr>
                      <td colSpan={isAdmin ? 7 : 5} className="p-8 text-center">
                        <div className="flex flex-col items-center justify-center gap-1.5">
                          <div className="w-10 h-10 rounded-xl bg-[#FAF8F5] flex items-center justify-center text-[#6B655C] border border-[#EAE7E0]">
                            <Clock size={20} />
                          </div>
                          <p className="text-[#1F2B4D] font-serif font-bold text-sm">No Timesheet Records Found</p>
                          <p className="text-[#6B655C] text-xs font-medium">Log your first timesheet entry to populate history.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>

        {/* RIGHT COLUMN: QUICK LOG FORM & PROJECT DISTRIBUTION WIDGET (4 COLS) */}
        <div className="lg:col-span-4 flex flex-col gap-3.5 min-w-0">
          
          {/* Quick Log Form Widget */}
          <div className="bg-white border border-[#EAE7E0] rounded-2xl p-4 shadow-2xs flex flex-col min-w-0">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#F4F1EA]">
              <div className="p-1.5 bg-[#FAF8F5] rounded-lg border border-[#EAE7E0] shadow-2xs">
                <Plus className="w-4 h-4 text-[#1F2B4D]" />
              </div>
              <h2 className="font-serif font-bold text-base text-[#1F2B4D]">Quick Log Hours</h2>
            </div>

            <form onSubmit={handleLogHours} className="space-y-2.5 min-w-0">
              <div className="min-w-0">
                <label className="block text-[9.5px] font-display font-bold text-[#6B655C] mb-1 uppercase tracking-wider">Project</label>
                <CustomSelect
                  value={projectId}
                  onChange={setProjectId}
                  options={projects}
                  placeholder="-- Choose Project --"
                  bg="bg-[#FAF8F5]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-2">
                <div>
                  <label className="block text-[9.5px] font-display font-bold text-[#6B655C] mb-1 uppercase tracking-wider">Date</label>
                  <input 
                    type="date" 
                    required 
                    value={date} 
                    onChange={(e) => setDate(e.target.value)} 
                    className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#EAE7E0] text-[#1F2B4D] text-xs font-bold rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1F2B4D]" 
                  />
                </div>
                <div>
                  <label className="block text-[9.5px] font-display font-bold text-[#6B655C] mb-1 uppercase tracking-wider">Hours</label>
                  <input 
                    type="number" 
                    step="0.5" 
                    required 
                    value={hours} 
                    onChange={(e) => setHours(e.target.value)} 
                    className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#EAE7E0] text-[#1F2B4D] text-xs font-bold rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1F2B4D]" 
                    placeholder="e.g. 8" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9.5px] font-display font-bold text-[#6B655C] mb-1 uppercase tracking-wider">Description</label>
                <textarea 
                  rows="2" 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#EAE7E0] text-[#1F2B4D] text-xs font-medium rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1F2B4D] resize-none" 
                  placeholder="Task breakdown..."
                />
              </div>

              <div className="flex items-center gap-2 p-2 bg-[#FAF8F5] rounded-xl border border-[#EAE7E0]">
                <input 
                  type="checkbox" 
                  id="quick-billable" 
                  checked={isBillable} 
                  onChange={(e) => setIsBillable(e.target.checked)} 
                  className="w-3.5 h-3.5 text-[#1F2B4D] rounded focus:ring-[#1F2B4D] cursor-pointer" 
                />
                <label htmlFor="quick-billable" className="text-xs font-bold text-[#1F2B4D] cursor-pointer">
                  Billable to Client
                </label>
              </div>

              <button 
                type="submit" 
                disabled={submitting}
                className="w-full py-2 bg-[#1F2B4D] hover:bg-[#141C33] disabled:opacity-50 text-white font-display font-bold text-xs rounded-xl shadow-2xs transition-all flex items-center justify-center gap-1.5 whitespace-nowrap"
              >
                {submitting ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" /> : <CheckCircle2 size={14} className="shrink-0" />}
                <span>{submitting ? 'Saving...' : 'Submit Entry'}</span>
              </button>
            </form>
          </div>

          {/* Project Hours Distribution Card */}
          <div className="bg-white border border-[#EAE7E0] rounded-2xl p-4 shadow-2xs flex-1 flex flex-col">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#F4F1EA]">
              <div className="p-1.5 bg-[#FAF8F5] rounded-lg border border-[#EAE7E0] shadow-2xs">
                <Briefcase className="w-4 h-4 text-[#1F2B4D]" />
              </div>
              <h2 className="font-serif font-bold text-base text-[#1F2B4D]">Project Breakdown</h2>
            </div>

            {projectDistribution.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-4 text-center text-[#6B655C]">
                <Briefcase size={28} className="opacity-30 mb-1" />
                <span className="text-xs font-medium">No project hours logged yet.</span>
              </div>
            ) : (
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[300px] pr-1">
                {projectDistribution.map((pd, idx) => (
                  <div key={pd.name} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-[#1F2B4D] truncate pr-2">{pd.name}</span>
                      <span className="font-mono text-[11px] font-bold text-[#6B655C] shrink-0">{pd.hrs}h ({pd.pct}%)</span>
                    </div>
                    <div className="w-full bg-[#FAF8F5] border border-[#EAE7E0] h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all ${
                          idx % 3 === 0 ? 'bg-[#1F2B4D]' : idx % 3 === 1 ? 'bg-indigo-600' : 'bg-emerald-600'
                        }`}
                        style={{ width: `${Math.max(pd.pct, 4)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Premium Add Modal (Fallback) */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 bg-[#1F2B4D]/30 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
            <motion.div 
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="bg-white rounded-[20px] max-w-md w-full p-4 sm:p-6 shadow-xl border border-[#EAE7E0] max-h-[92vh] overflow-y-auto relative"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#F4F1EA] mb-3">
                <h2 className="font-serif font-bold text-base sm:text-xl text-[#1F2B4D]">Log Time</h2>
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="p-1.5 text-[#6B655C] hover:text-[#1F2B4D] bg-[#FAF8F5] rounded-lg transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleLogHours} className="space-y-3 min-w-0">
                <div className="min-w-0">
                  <label className="block text-[10px] font-display font-bold text-[#6B655C] mb-1 uppercase tracking-wider">Project</label>
                  <CustomSelect
                    value={projectId}
                    onChange={setProjectId}
                    options={projects}
                    placeholder="-- Select Project --"
                    bg="bg-white"
                  />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-display font-bold text-[#6B655C] mb-1 uppercase tracking-wider">Date</label>
                    <input 
                      type="date" 
                      required 
                      value={date} 
                      onChange={(e) => setDate(e.target.value)} 
                      className="w-full px-3 py-2 bg-white border border-[#EAE7E0] text-[#1F2B4D] text-xs font-bold rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1F2B4D]" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-display font-bold text-[#6B655C] mb-1 uppercase tracking-wider">Hours</label>
                    <input 
                      type="number" 
                      step="0.5" 
                      required 
                      value={hours} 
                      onChange={(e) => setHours(e.target.value)} 
                      className="w-full px-3 py-2 bg-white border border-[#EAE7E0] text-[#1F2B4D] text-xs font-bold rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1F2B4D]" 
                      placeholder="e.g. 8" 
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-[10px] font-display font-bold text-[#6B655C] mb-1 uppercase tracking-wider">Description</label>
                  <textarea 
                    rows="3" 
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)} 
                    className="w-full px-3 py-2 bg-white border border-[#EAE7E0] text-[#1F2B4D] text-xs font-medium rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1F2B4D] resize-none" 
                    placeholder="Briefly describe your work..."
                  />
                </div>
                
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-[#FAF8F5] border border-[#EAE7E0]">
                  <input 
                    type="checkbox" 
                    id="modal-billable" 
                    checked={isBillable} 
                    onChange={(e) => setIsBillable(e.target.checked)} 
                    className="w-4 h-4 text-[#1F2B4D] rounded focus:ring-[#1F2B4D] cursor-pointer" 
                  />
                  <div>
                    <label htmlFor="modal-billable" className="text-xs font-bold text-[#1F2B4D] cursor-pointer block leading-none">Billable Hours</label>
                    <span className="text-[10px] font-medium text-[#6B655C] mt-0.5 block">This time will be invoiced to the client.</span>
                  </div>
                </div>
                
                <div className="pt-2 flex flex-col-reverse sm:flex-row gap-2 border-t border-[#F4F1EA]">
                  <button 
                    type="button" 
                    onClick={() => setShowAddModal(false)} 
                    className="w-full sm:w-auto flex-1 px-4 py-2 border border-[#EAE7E0] bg-white text-[#1F2B4D] text-xs font-display font-bold rounded-xl hover:bg-[#FAF8F5] transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={submitting}
                    className="w-full sm:w-auto flex-1 px-5 py-2 bg-[#1F2B4D] hover:bg-[#141C33] text-white text-xs font-display font-bold rounded-xl shadow-2xs transition-all flex items-center justify-center gap-1.5"
                  >
                    {submitting ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" /> : <CheckCircle2 size={14} className="shrink-0" />}
                    <span>{submitting ? 'Saving...' : 'Save Timesheet'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default Timesheet;
