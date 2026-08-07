import React, { useState, useEffect } from 'react';
import { hasPermission } from '../lib/permissions';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { 
  IndianRupee, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  ShieldAlert, 
  RefreshCw, 
  Send, 
  User as UserIcon, 
  FileText, 
  Check, 
  X,
  Wallet,
  Building,
  AlertCircle,
  ChevronRight
} from 'lucide-react';
import { Skeleton } from '../components/ui/Skeleton';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Animation Variants
const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
};

const fadeInUp = {
  hidden: { opacity: 0, y: 30, scale: 0.98 },
  show: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 300, damping: 24, ease: [0.34, 1.56, 0.64, 1] } 
  }
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  show: { 
    opacity: 1, 
    scale: 1, 
    transition: { type: "spring", stiffness: 400, damping: 20 } 
  }
};

// Counter Animation Component
const AnimatedCounter = ({ value }) => {
  const [displayValue, setDisplayValue] = useState(0);
  
  useEffect(() => {
    let start = 0;
    const end = parseInt(value, 10);
    if (start === end) return;
    
    let totalDuration = 1000;
    let incrementTime = (totalDuration / end);
    
    let timer = setInterval(() => {
      start += 1;
      setDisplayValue(start);
      if (start === end) clearInterval(timer);
    }, incrementTime);
    
    return () => clearInterval(timer);
  }, [value]);

  return <span>{displayValue}</span>;
};

const SalaryAdvance = ({ user }) => {
  const [advances, setAdvances] = useState([]);
  const [myAdvances, setMyAdvances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });
  
  // Request Form State
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [monthDeduction, setMonthDeduction] = useState(() => {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    return nextMonth.toISOString().slice(0, 7); // 'YYYY-MM'
  });
  const [submitting, setSubmitting] = useState(false);

  // Admin Filter State
  const [statusFilter, setStatusFilter] = useState('Pending');

  // Modal State for Approve/Reject Notes
  const [selectedAdvance, setSelectedAdvance] = useState(null);
  const [actionType, setActionType] = useState(''); // 'Approved' or 'Rejected'
  const [auditorComments, setAuditorComments] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const isAdminOrManager = hasPermission(user, 'approve_advances');

  const fetchAdvances = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    
    try {
      const myPromise = fetch(`${API_BASE}/api/payroll/my-advances`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const allPromise = isAdminOrManager
        ? fetch(`${API_BASE}/api/payroll/advances`, { headers: { 'Authorization': `Bearer ${token}` } })
        : Promise.resolve(null);

      const [resMy, resAll] = await Promise.all([myPromise, allPromise]);

      if (resMy && resMy.ok) {
        const dataMy = await resMy.json();
        setMyAdvances(Array.isArray(dataMy) ? dataMy : []);
      }
      if (resAll && resAll.ok) {
        const dataAll = await resAll.json();
        setAdvances(Array.isArray(dataAll) ? dataAll : []);
      }
    } catch (e) {
      console.warn('Failed to fetch advances:', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdvances();
  }, [isAdminOrManager]);

  // Request Salary Advance
  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    setStatusMsg({ type: '', text: '' });

    const numAmt = parseFloat(amount);
    if (isNaN(numAmt) || numAmt <= 0) {
      setStatusMsg({ type: 'error', text: 'Please enter a valid amount greater than 0.' });
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/payroll/advance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: numAmt,
          reason,
          monthDeduction
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit advance request');
      }

      setStatusMsg({ type: 'success', text: `Request for ₹${numAmt.toLocaleString()} routed for audit.` });
      setAmount('');
      setReason('');

      setMyAdvances(prev => [data, ...prev]);
      if (isAdminOrManager) {
        setAdvances(prev => [data, ...prev]);
      }
      // Re-fetch in background
      setTimeout(fetchAdvances, 2000);
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  // Admin Update Status
  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAdvance || !actionType) return;

    const targetId = selectedAdvance.id;
    const newStatus = actionType;

    // Optimistically update
    setAdvances(prev => prev.map(a => a.id === targetId ? { ...a, status: newStatus } : a));
    setSelectedAdvance(null);
    setActionType('');
    setAuditorComments('');

    setActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/payroll/advance/${targetId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: newStatus,
          comments: auditorComments
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update status');

      setTimeout(fetchAdvances, 1000);
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message });
      fetchAdvances();
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Approved':
        return <span className="px-3 py-1.5 text-[10px] font-display font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full flex items-center gap-1.5 w-fit shadow-2xs"><CheckCircle size={12} /> Approved</span>;
      case 'Rejected':
        return <span className="px-3 py-1.5 text-[10px] font-display font-bold uppercase tracking-wider bg-rose-50 text-rose-800 border border-rose-200 rounded-full flex items-center gap-1.5 w-fit shadow-2xs"><XCircle size={12} /> Rejected</span>;
      case 'Deducted':
        return <span className="px-3 py-1.5 text-[10px] font-display font-bold uppercase tracking-wider bg-indigo-50 text-indigo-800 border border-indigo-200 rounded-full flex items-center gap-1.5 w-fit shadow-2xs"><Check size={12} /> Deducted</span>;
      default:
        return <span className="px-3 py-1.5 text-[10px] font-display font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200 rounded-full flex items-center gap-1.5 w-fit shadow-2xs"><Clock size={12} /> Pending</span>;
    }
  };

  const getRiskBadge = (score, label) => {
    if (score === undefined || score === null) return null;
    const isHigh = label === 'HIGH' || score >= 70;
    const isMedium = label === 'MEDIUM' || score >= 35;
    
    let colorClass = 'bg-emerald-50 text-emerald-800 border-emerald-200';
    let labelText = 'LOW RISK';
    if (isHigh) {
      colorClass = 'bg-rose-50 text-rose-800 border-rose-200';
      labelText = 'HIGH RISK';
    } else if (isMedium) {
      colorClass = 'bg-amber-50 text-amber-800 border-amber-200';
      labelText = 'MODERATE';
    }

    return (
      <div className={`px-3 py-1.5 text-[10px] font-display font-bold uppercase tracking-wider border rounded-full flex items-center gap-2 w-fit shadow-2xs ${colorClass}`}>
        <div className="relative flex items-center justify-center w-3 h-3">
          {isHigh && <span className="absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-40 animate-ping"></span>}
          <ShieldAlert size={12} className={`relative z-10 ${isHigh ? 'text-rose-600' : isMedium ? 'text-amber-600' : 'text-emerald-600'}`} />
        </div>
        {labelText}
      </div>
    );
  };

  const filteredAdminAdvances = advances.filter(a => {
    if (!statusFilter) return true;
    return a.status === statusFilter;
  });

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto min-h-screen bg-transparent overflow-hidden">
      
      <motion.div 
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="space-y-8"
      >
        {/* ── TOP EXECUTIVE HEADER ── */}
        <motion.div variants={fadeInUp} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-5 border-b border-[#EAE7E0]">
          <div>
            <h1 className="font-serif font-bold text-3xl md:text-4xl text-[#1F2B4D] tracking-tight leading-none flex items-center gap-3">
              <div className="p-2.5 bg-white rounded-xl shadow-sm border border-[#EAE7E0]">
                <Wallet className="text-[#1F2B4D]" size={28} />
              </div>
              Salary Advance
            </h1>
            <p className="text-[#6B655C] mt-2.5 font-medium ml-2">
              Request salary advances and manage automated payroll workflows.
            </p>
          </div>
          <Button 
            onClick={fetchAdvances} 
            className="rounded-full bg-white text-black border border-[#EAE7E0] hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-all duration-300 gap-2 text-xs font-display font-bold shadow-sm hover:-translate-y-0.5 hover:shadow-md"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh Ledger
          </Button>
        </motion.div>

        {/* ── ADMIN KPI SUMMARY CARDS ── */}
        {isAdminOrManager && (
          <motion.div variants={fadeInUp} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Pending Approval */}
            <div className="bg-white border-[2px] border-[#EAE7E0] rounded-[24px] p-6 shadow-sm flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-[0px_24px_48px_-12px_rgba(31,43,77,0.15)] group">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-display font-bold text-[#9A948A] uppercase tracking-wider group-hover:text-amber-700 transition-colors">Pending Review</span>
                <div className="p-2 bg-amber-50 rounded-xl border border-amber-100 group-hover:scale-110 transition-transform">
                  <Clock className="w-4 h-4 text-amber-600" />
                </div>
              </div>
              <div className="mt-5">
                <span className="font-serif text-4xl font-bold text-[#1F2B4D]">
                  <AnimatedCounter value={advances.filter(a => a.status === 'Pending').length} />
                </span>
              </div>
            </div>

            {/* High Risk Requests */}
            <div className="bg-white border-[2px] border-[#EAE7E0] rounded-[24px] p-6 shadow-sm flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-[0px_24px_48px_-12px_rgba(31,43,77,0.15)] group">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-display font-bold text-[#9A948A] uppercase tracking-wider group-hover:text-rose-700 transition-colors">High Risk</span>
                <div className="p-2 bg-rose-50 rounded-xl border border-rose-100 group-hover:scale-110 transition-transform relative">
                  <span className="absolute inset-0 rounded-xl bg-rose-400 opacity-20 animate-ping"></span>
                  <AlertTriangle className="w-4 h-4 text-rose-600 relative z-10" />
                </div>
              </div>
              <div className="mt-5">
                <span className="font-serif text-4xl font-bold text-[#1F2B4D]">
                  <AnimatedCounter value={advances.filter(a => a.status === 'Pending' && (a.riskLabel === 'HIGH' || a.riskScore >= 70)).length} />
                </span>
              </div>
            </div>

            {/* Approved Queue */}
            <div className="bg-white border-[2px] border-[#EAE7E0] rounded-[24px] p-6 shadow-sm flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-[0px_24px_48px_-12px_rgba(31,43,77,0.15)] group">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-display font-bold text-[#9A948A] uppercase tracking-wider group-hover:text-emerald-700 transition-colors">Approved Queue</span>
                <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-100 group-hover:scale-110 transition-transform">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                </div>
              </div>
              <div className="mt-5">
                <span className="font-serif text-4xl font-bold text-[#1F2B4D]">
                  <AnimatedCounter value={advances.filter(a => a.status === 'Approved').length} />
                </span>
              </div>
            </div>

            {/* Fully Settled / Deducted */}
            <div className="bg-white border-[2px] border-[#EAE7E0] rounded-[24px] p-6 shadow-sm flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-[0px_24px_48px_-12px_rgba(31,43,77,0.15)] group">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-display font-bold text-[#9A948A] uppercase tracking-wider group-hover:text-indigo-700 transition-colors">Settled</span>
                <div className="p-2 bg-indigo-50 rounded-xl border border-indigo-100 group-hover:scale-110 transition-transform">
                  <Building className="w-4 h-4 text-indigo-600" />
                </div>
              </div>
              <div className="mt-5">
                <span className="font-serif text-4xl font-bold text-[#1F2B4D]">
                  <AnimatedCounter value={advances.filter(a => a.status === 'Deducted').length} />
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── MAIN CONTENT GRID ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Request Form (4 cols) */}
          <motion.div variants={fadeInUp} className="lg:col-span-4 flex flex-col">
            <div className="bg-[#FAF8F5] border-[2px] border-[#EAE7E0] rounded-[32px] p-6 md:p-8 shadow-sm h-full flex flex-col transition-all duration-500 hover:shadow-lg hover:border-[#D8D4CA]">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-white rounded-xl border border-[#EAE7E0] shadow-2xs">
                  <Send className="w-5 h-5 text-[#1F2B4D]" />
                </div>
                <h2 className="font-serif font-bold text-2xl text-[#1F2B4D]">
                  Request Advance
                </h2>
              </div>
              <p className="text-sm text-[#6B655C] mb-6 font-medium">
                Approved advances are automatically deducted in your selected month's payslip.
              </p>

              <AnimatePresence mode="wait">
                {statusMsg.text && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0, scale: 0.95 }}
                    animate={{ opacity: 1, height: 'auto', scale: 1 }}
                    exit={{ opacity: 0, height: 0, scale: 0.95 }}
                    className={`p-4 rounded-[16px] text-sm font-semibold mb-6 flex items-start gap-3 border shadow-2xs overflow-hidden ${
                      statusMsg.type === 'error' 
                        ? 'bg-white border-rose-200 text-rose-800' 
                        : 'bg-white border-emerald-200 text-emerald-800'
                    }`}
                  >
                    {statusMsg.type === 'error' ? <AlertCircle className="shrink-0 mt-0.5" size={18} /> : <CheckCircle className="shrink-0 mt-0.5" size={18} />}
                    <span className="leading-snug">{statusMsg.text}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleRequestSubmit} className="space-y-6 flex-1 flex flex-col">
                <div className="group">
                  <label className="text-[11px] font-display font-bold text-[#9A948A] uppercase tracking-wider block mb-2 transition-colors group-focus-within:text-[#1F2B4D]">
                    Advance Amount (₹)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <IndianRupee className="h-4 w-4 text-[#9A948A] group-focus-within:text-[#1F2B4D] transition-colors" />
                    </div>
                    <Input
                      type="number"
                      step="any"
                      placeholder="e.g. 15000"
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full pl-10 pr-4 py-3.5 rounded-2xl bg-white border border-[#EAE7E0] text-sm font-bold text-[#1F2B4D] placeholder-[#9A948A] focus:outline-none focus:ring-2 focus:ring-[#1F2B4D] shadow-inner transition-all hover:border-[#CBD5E1]"
                    />
                  </div>
                </div>

                <div className="group">
                  <label className="text-[11px] font-display font-bold text-[#9A948A] uppercase tracking-wider block mb-2 transition-colors group-focus-within:text-[#1F2B4D]">
                    Deduction Month
                  </label>
                  <Input
                    type="month"
                    required
                    value={monthDeduction}
                    onChange={(e) => setMonthDeduction(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-2xl bg-white border border-[#EAE7E0] text-sm font-bold text-[#1F2B4D] focus:outline-none focus:ring-2 focus:ring-[#1F2B4D] shadow-inner transition-all hover:border-[#CBD5E1]"
                  />
                </div>

                <div className="group">
                  <label className="text-[11px] font-display font-bold text-[#9A948A] uppercase tracking-wider block mb-2 transition-colors group-focus-within:text-[#1F2B4D]">
                    Reason / Justification
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Provide context for approval audit..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full text-sm font-medium border border-[#EAE7E0] rounded-2xl p-4 bg-white focus:outline-none focus:ring-2 focus:ring-[#1F2B4D] resize-none shadow-inner text-[#1F2B4D] placeholder-[#9A948A] transition-all hover:border-[#CBD5E1]"
                  />
                </div>

                <div className="pt-4 mt-auto">
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.95 }}
                    type="submit" 
                    disabled={submitting} 
                    className="w-full bg-[#1F2B4D] text-white font-display font-bold text-sm py-4 rounded-[20px] transition-all flex items-center justify-center gap-2 shadow-[0_8px_16px_rgba(31,43,77,0.15)] hover:shadow-[0_16px_32px_rgba(31,43,77,0.25)] relative overflow-hidden group"
                  >
                    <span className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out pointer-events-none"></span>
                    <span className="relative z-10 flex items-center gap-2">
                      {submitting ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
                      {submitting ? 'Authenticating...' : 'Submit Request'}
                    </span>
                  </motion.button>
                </div>
              </form>
            </div>
          </motion.div>

          {/* Right Column: Personal Request History (8 cols) */}
          <motion.div variants={fadeInUp} className="lg:col-span-8 flex flex-col">
            <div className="bg-white border-[2px] border-[#EAE7E0] rounded-[32px] p-6 md:p-8 shadow-sm flex flex-col h-full transition-all duration-500 hover:shadow-lg">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-[#FAF8F5] rounded-xl border border-[#EAE7E0] shadow-2xs">
                  <FileText className="w-5 h-5 text-[#1F2B4D]" />
                </div>
                <div>
                  <h2 className="font-serif font-bold text-2xl text-[#1F2B4D]">
                    My Advance Ledger
                  </h2>
                  <p className="text-xs text-[#6B655C] mt-1 font-medium">Track your requested and settled advances.</p>
                </div>
              </div>

              <div className="overflow-x-auto custom-scrollbar flex-1 border-[2px] border-[#EAE7E0] rounded-[28px] bg-[#FAF8F5] p-2">
                <table className="w-full text-left border-separate border-spacing-y-2">
                  <thead>
                    <tr>
                      <th className="px-5 py-3 text-[10px] font-display font-bold text-[#9A948A] uppercase tracking-wider">Ledger Amount</th>
                      <th className="px-5 py-3 text-[10px] font-display font-bold text-[#9A948A] uppercase tracking-wider">Recovery Month</th>
                      <th className="px-5 py-3 text-[10px] font-display font-bold text-[#9A948A] uppercase tracking-wider">Justification</th>
                      <th className="px-5 py-3 text-[10px] font-display font-bold text-[#9A948A] uppercase tracking-wider">Date Filed</th>
                      <th className="px-5 py-3 text-[10px] font-display font-bold text-[#9A948A] uppercase tracking-wider text-right">Approval Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      Array.from({ length: 4 }).map((_, i) => (
                        <tr key={i} className="bg-white">
                          <td className="px-5 py-5 rounded-l-[16px]"><Skeleton className="h-5 w-24 bg-[#EAE7E0]" /></td>
                          <td className="px-5 py-5"><Skeleton className="h-4 w-20 bg-[#EAE7E0]" /></td>
                          <td className="px-5 py-5"><Skeleton className="h-4 w-32 bg-[#EAE7E0]" /></td>
                          <td className="px-5 py-5"><Skeleton className="h-4 w-20 bg-[#EAE7E0]" /></td>
                          <td className="px-5 py-5 flex justify-end rounded-r-[16px]"><Skeleton className="h-6 w-20 rounded-full bg-[#EAE7E0]" /></td>
                        </tr>
                      ))
                    ) : myAdvances.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="p-16 text-center bg-white rounded-[20px] shadow-sm">
                          <div className="flex flex-col items-center justify-center">
                            <Wallet className="w-12 h-12 text-[#9A948A] mb-4 opacity-50" />
                            <span className="text-[#6B655C] font-bold text-sm font-display tracking-wider uppercase">No ledger entries</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <AnimatePresence>
                        {myAdvances.map((adv, index) => (
                          <motion.tr 
                            key={adv.id} 
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="bg-white hover:bg-[#F0F3F9] transition-colors group shadow-sm hover:shadow-md cursor-pointer"
                          >
                            <td className="px-5 py-5 rounded-l-[20px] border-y border-l border-transparent group-hover:border-[#CBD5E1]">
                              <span className="font-serif font-bold text-[#1F2B4D] text-xl group-hover:text-indigo-700 transition-colors">
                                ₹{adv.amount.toLocaleString()}
                              </span>
                            </td>
                            <td className="px-5 py-5 text-sm font-bold text-[#1F2B4D] border-y border-transparent group-hover:border-[#CBD5E1]">
                              {adv.monthDeduction}
                            </td>
                            <td className="px-5 py-5 text-xs text-[#6B655C] max-w-[200px] truncate font-medium border-y border-transparent group-hover:border-[#CBD5E1]" title={adv.reason}>
                              {adv.reason}
                            </td>
                            <td className="px-5 py-5 text-[11px] font-medium text-[#9A948A] border-y border-transparent group-hover:border-[#CBD5E1]">
                              {new Date(adv.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </td>
                            <td className="px-5 py-5 rounded-r-[20px] border-y border-r border-transparent group-hover:border-[#CBD5E1]">
                              <div className="flex justify-end items-center gap-3">
                                {getStatusBadge(adv.status)}
                                <ChevronRight size={16} className="text-[#9A948A] opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        </div>

        {/* ── ADMIN / MANAGER: GOVERNANCE QUEUE ── */}
        {isAdminOrManager && (
          <motion.div variants={fadeInUp} className="bg-white border-[2px] border-[#EAE7E0] rounded-[32px] p-6 md:p-8 shadow-sm flex flex-col transition-all duration-500 hover:shadow-xl hover:border-[#D8D4CA]">
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-[#F4F1EA]">
              <div>
                <h2 className="font-serif font-bold text-2xl text-[#1F2B4D] flex items-center gap-3">
                  <div className="p-2.5 bg-[#FAF8F5] rounded-xl border border-[#EAE7E0] shadow-2xs">
                    <ShieldAlert className="text-[#1F2B4D]" size={24} /> 
                  </div>
                  Auditor Review Queue
                </h2>
                <p className="text-sm text-[#6B655C] mt-2 font-medium ml-1">
                  Evaluate predictive risk scores and manage salary advance approvals.
                </p>
              </div>

              <div className="flex items-center gap-3 bg-[#FAF8F5] p-2 rounded-2xl border border-[#EAE7E0] shadow-inner">
                <span className="text-[10px] font-display font-bold text-[#9A948A] uppercase tracking-wider pl-3">Queue Filter</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="text-xs font-bold text-[#1F2B4D] bg-white border border-[#EAE7E0] rounded-xl px-5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1F2B4D] shadow-sm cursor-pointer hover:border-[#CBD5E1] transition-colors"
                >
                  <option value="Pending">Pending Audit</option>
                  <option value="Approved">Approved (Awaiting Settlement)</option>
                  <option value="Deducted">Settled / Deducted</option>
                  <option value="Rejected">Rejected</option>
                  <option value="">All Ledger Entries</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto custom-scrollbar mt-6 border-[2px] border-[#EAE7E0] rounded-[28px] bg-[#FAF8F5] p-2">
              <table className="w-full text-left border-separate border-spacing-y-2 min-w-[950px]">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-[10px] font-display font-bold text-[#9A948A] uppercase tracking-wider">Personnel Profile</th>
                    <th className="px-6 py-3 text-[10px] font-display font-bold text-[#9A948A] uppercase tracking-wider">Ledger & Month</th>
                    <th className="px-6 py-3 text-[10px] font-display font-bold text-[#9A948A] uppercase tracking-wider">Risk Telemetry</th>
                    <th className="px-6 py-3 text-[10px] font-display font-bold text-[#9A948A] uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-[10px] font-display font-bold text-[#9A948A] uppercase tracking-wider text-right">Governance Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="bg-white">
                        <td className="px-6 py-5 rounded-l-[16px]"><div className="flex items-center gap-4"><Skeleton className="h-12 w-12 rounded-full bg-[#EAE7E0]" /><div className="space-y-2"><Skeleton className="h-4 w-32 bg-[#EAE7E0]" /><Skeleton className="h-3 w-20 bg-[#EAE7E0]" /></div></div></td>
                        <td className="px-6 py-5"><Skeleton className="h-5 w-24 bg-[#EAE7E0]" /><Skeleton className="h-3 w-24 mt-2 bg-[#EAE7E0]" /></td>
                        <td className="px-6 py-5"><Skeleton className="h-8 w-28 rounded-full bg-[#EAE7E0]" /></td>
                        <td className="px-6 py-5"><Skeleton className="h-8 w-24 rounded-full bg-[#EAE7E0]" /></td>
                        <td className="px-6 py-5 text-right flex justify-end rounded-r-[16px]"><Skeleton className="h-10 w-32 rounded-xl bg-[#EAE7E0]" /></td>
                      </tr>
                    ))
                  ) : filteredAdminAdvances.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="p-16 text-center bg-white rounded-[20px]">
                        <span className="text-[#9A948A] text-sm font-display font-bold uppercase tracking-wider">
                          No records match the active filter criteria ({statusFilter || 'All'}).
                        </span>
                      </td>
                    </tr>
                  ) : (
                    <AnimatePresence>
                      {filteredAdminAdvances.map((adv, index) => (
                        <motion.tr 
                          key={adv.id} 
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.05 }}
                          className="bg-white hover:bg-white transition-all duration-300 group shadow-2xs hover:shadow-md hover:-translate-y-0.5"
                        >
                          
                          {/* Employee Column */}
                          <td className="px-6 py-5 rounded-l-[20px] border-y border-l border-[#F4F1EA] group-hover:border-[#CBD5E1]">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-full bg-[#FAF8F5] border-2 border-[#EAE7E0] flex items-center justify-center font-bold text-sm text-[#1F2B4D] overflow-hidden shrink-0 shadow-sm">
                                {adv.user?.avatar ? <img src={adv.user.avatar} alt="User" className="w-full h-full object-cover" /> : <UserIcon size={18} />}
                              </div>
                              <div>
                                <span className="font-serif font-bold text-[#1F2B4D] text-lg block group-hover:text-indigo-700 transition-colors">
                                  {adv.user?.displayName || 'Unknown'}
                                </span>
                                <span className="text-[11px] font-display font-bold tracking-wider uppercase text-[#9A948A] block mt-0.5">
                                  ID: {adv.user?.employeeId || 'N/A'}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Ledger Column */}
                          <td className="px-6 py-5 border-y border-[#F4F1EA] group-hover:border-[#CBD5E1]">
                            <span className="font-serif font-bold text-[#1F2B4D] text-xl block">₹{adv.amount.toLocaleString()}</span>
                            <span className="text-[11px] font-display font-bold uppercase tracking-wider text-[#9A948A] block mt-1">Deduct: <span className="text-[#6B655C]">{adv.monthDeduction}</span></span>
                          </td>

                          {/* Risk Column */}
                          <td className="px-6 py-5 border-y border-[#F4F1EA] group-hover:border-[#CBD5E1]">
                            {getRiskBadge(adv.riskScore, adv.riskLabel)}
                            {!!(adv.user?.baseSalary && adv.user.baseSalary > 0) && (
                              <span className="text-[10px] font-medium text-[#6B655C] block mt-2 ml-1">
                                Ratio: {((adv.amount / adv.user.baseSalary) * 100).toFixed(1)}% of salary
                              </span>
                            )}
                          </td>

                          {/* Status Column */}
                          <td className="px-6 py-5 border-y border-[#F4F1EA] group-hover:border-[#CBD5E1]">
                            {getStatusBadge(adv.status)}
                          </td>

                          {/* Actions Column */}
                          <td className="px-6 py-5 text-right rounded-r-[20px] border-y border-r border-[#F4F1EA] group-hover:border-[#CBD5E1]">
                            {adv.status === 'Pending' ? (
                              <div className="flex justify-end gap-3">
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => { setSelectedAdvance(adv); setActionType('Approved'); }}
                                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold px-4 py-2.5 rounded-[12px] flex items-center gap-1.5 transition-colors shadow-sm"
                                >
                                  <Check size={16} /> Approve
                                </motion.button>
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => { setSelectedAdvance(adv); setActionType('Rejected'); }}
                                  className="bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold px-4 py-2.5 rounded-[12px] flex items-center gap-1.5 transition-colors shadow-sm"
                                >
                                  <X size={16} /> Reject
                                </motion.button>
                              </div>
                            ) : (
                              <span className="text-[11px] font-display font-bold uppercase tracking-wider text-[#9A948A]">Action Taken</span>
                            )}
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* ── AUDITOR DECISION DIALOG MODAL ── */}
      <AnimatePresence>
        {selectedAdvance && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#1F2B4D]/40 backdrop-blur-md z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="w-full max-w-lg p-8 bg-white border-t border-t-white/40 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] rounded-[32px] relative overflow-hidden"
            >
              {/* Top ambient glow based on action type */}
              <div className={`absolute top-0 left-0 right-0 h-2 w-full ${actionType === 'Approved' ? 'bg-emerald-400' : 'bg-rose-400'}`}></div>

              <div className="flex items-center gap-4 mb-4 mt-2">
                <div className={`p-3 rounded-[16px] border shadow-sm ${actionType === 'Approved' ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                  {actionType === 'Approved' ? <CheckCircle className="w-8 h-8 text-emerald-600" /> : <AlertTriangle className="w-8 h-8 text-rose-600" />}
                </div>
                <h3 className="font-serif font-bold text-3xl text-[#1F2B4D]">
                  {actionType === 'Approved' ? 'Confirm Approval' : 'Reject Request'}
                </h3>
              </div>
              
              <div className="mt-6 p-5 bg-[#FAF8F5] border border-[#EAE7E0] rounded-[24px] text-sm text-[#1F2B4D] font-medium leading-relaxed shadow-inner">
                {actionType === 'Approved' 
                  ? <span>You are approving an advance of <strong className="font-bold font-serif text-xl">₹{selectedAdvance.amount.toLocaleString()}</strong> for <strong>{selectedAdvance.user?.displayName || 'the employee'}</strong>. This amount will be routed for deduction in <strong>{selectedAdvance.monthDeduction}</strong>.</span> 
                  : <span>You are declining the salary advance request for <strong>{selectedAdvance.user?.displayName || 'the employee'}</strong>. This action is final and will notify the user.</span>}
              </div>

              <form onSubmit={handleStatusSubmit} className="space-y-6 mt-8">
                <div className="group">
                  <label className="text-[11px] font-display font-bold text-[#9A948A] uppercase tracking-wider block mb-2 transition-colors group-focus-within:text-[#1F2B4D]">
                    Auditor Notes (Optional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Enter audit rationale for HR records..."
                    value={auditorComments}
                    onChange={(e) => setAuditorComments(e.target.value)}
                    className="w-full text-sm font-medium border border-[#EAE7E0] bg-white rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-[#1F2B4D] resize-none shadow-inner text-[#1F2B4D] transition-colors hover:border-[#CBD5E1]"
                  />
                </div>

                <div className="flex justify-end gap-4 pt-4">
                  <Button
                    type="button"
                    onClick={() => { setSelectedAdvance(null); setActionType(''); }}
                    className="bg-white hover:bg-[#FAF8F5] text-[#1F2B4D] border border-[#EAE7E0] font-display font-bold text-sm px-6 py-3 rounded-[16px] shadow-sm hover:shadow-md transition-all"
                  >
                    Cancel
                  </Button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.95 }}
                    type="submit"
                    disabled={actionLoading}
                    className={`font-display font-bold text-sm px-8 py-3 rounded-[16px] shadow-md transition-all text-white flex items-center justify-center gap-2 ${
                      actionType === 'Approved' ? 'bg-[#1F2B4D] hover:bg-[#141C33]' : 'bg-rose-600 hover:bg-rose-700'
                    }`}
                  >
                    {actionLoading && <RefreshCw size={16} className="animate-spin" />}
                    {actionLoading ? 'Processing...' : `Confirm ${actionType}`}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SalaryAdvance;
