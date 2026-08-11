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
    <div className="p-2.5 sm:p-4 md:p-5 max-w-[1600px] mx-auto min-h-full flex flex-col gap-2.5 sm:gap-3.5 w-full">
      
      <motion.div 
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="space-y-2.5 sm:space-y-3.5 w-full"
      >
        {/* ── TOP EXECUTIVE HEADER ── */}
        <motion.div variants={fadeInUp} className="flex flex-col min-[420px]:flex-row justify-between items-start min-[420px]:items-center gap-2 pb-2.5 border-b border-[#EAE7E0]">
          <div>
            <h1 className="font-serif font-bold text-base min-[380px]:text-lg sm:text-xl md:text-2xl text-[#1F2B4D] tracking-tight leading-tight flex items-center gap-2">
              <div className="p-1.5 bg-white rounded-lg shadow-2xs border border-[#EAE7E0]">
                <Wallet className="text-[#1F2B4D] w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <span>Salary Advance</span>
            </h1>
            <p className="text-[#6B655C] mt-0.5 text-[10px] sm:text-xs font-medium">
              Request salary advances and manage automated payroll workflows.
            </p>
          </div>
          <button 
            type="button"
            onClick={fetchAdvances} 
            className="bg-white hover:bg-[#F0F3F9] text-[#1F2B4D] border border-[#CBD5E1] font-display font-bold px-2.5 sm:px-3.5 py-1.5 rounded-lg sm:rounded-xl transition-all hover:scale-[1.02] active:scale-95 inline-flex items-center justify-center gap-1.5 text-[11px] sm:text-xs shadow-2xs w-full min-[420px]:w-auto whitespace-nowrap"
          >
            <RefreshCw size={13} className={`shrink-0 ${loading ? 'animate-spin' : ''}`} /> <span>Refresh Ledger</span>
          </button>
        </motion.div>

        {/* ── ADMIN KPI SUMMARY CARDS (2x2 Micro Grid) ── */}
        {isAdminOrManager && (
          <motion.div variants={fadeInUp} className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            {/* Pending Review */}
            <div className="p-2.5 sm:p-3 rounded-[12px] sm:rounded-[14px] border border-[#EAE7E0] bg-[#FAF8F5] shadow-2xs flex items-center gap-2 sm:gap-3 hover:shadow-xs transition-all">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center font-bold shrink-0 shadow-2xs">
                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[8.5px] sm:text-[9.5px] font-display font-bold text-[#6B655C] uppercase tracking-wider whitespace-nowrap truncate">Pending Review</div>
                <div className="text-sm sm:text-lg font-serif font-bold text-[#1F2B4D]">
                  <AnimatedCounter value={advances.filter(a => a.status === 'Pending').length} />
                </div>
              </div>
            </div>

            {/* High Risk Requests */}
            <div className="p-2.5 sm:p-3 rounded-[12px] sm:rounded-[14px] border border-[#EAE7E0] bg-[#FAF8F5] shadow-2xs flex items-center gap-2 sm:gap-3 hover:shadow-xs transition-all">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-center font-bold shrink-0 shadow-2xs relative">
                <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[8.5px] sm:text-[9.5px] font-display font-bold text-[#6B655C] uppercase tracking-wider whitespace-nowrap truncate">High Risk</div>
                <div className="text-sm sm:text-lg font-serif font-bold text-[#1F2B4D]">
                  <AnimatedCounter value={advances.filter(a => a.status === 'Pending' && (a.riskLabel === 'HIGH' || a.riskScore >= 70)).length} />
                </div>
              </div>
            </div>

            {/* Approved Queue */}
            <div className="p-2.5 sm:p-3 rounded-[12px] sm:rounded-[14px] border border-[#EAE7E0] bg-[#FAF8F5] shadow-2xs flex items-center gap-2 sm:gap-3 hover:shadow-xs transition-all">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold shrink-0 shadow-2xs">
                <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[8.5px] sm:text-[9.5px] font-display font-bold text-[#6B655C] uppercase tracking-wider whitespace-nowrap truncate">Approved Queue</div>
                <div className="text-sm sm:text-lg font-serif font-bold text-[#1F2B4D]">
                  <AnimatedCounter value={advances.filter(a => a.status === 'Approved').length} />
                </div>
              </div>
            </div>

            {/* Fully Settled / Deducted */}
            <div className="p-2.5 sm:p-3 rounded-[12px] sm:rounded-[14px] border border-[#EAE7E0] bg-[#FAF8F5] shadow-2xs flex items-center gap-2 sm:gap-3 hover:shadow-xs transition-all">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center font-bold shrink-0 shadow-2xs">
                <Building className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[8.5px] sm:text-[9.5px] font-display font-bold text-[#6B655C] uppercase tracking-wider whitespace-nowrap truncate">Settled</div>
                <div className="text-sm sm:text-lg font-serif font-bold text-[#1F2B4D]">
                  <AnimatedCounter value={advances.filter(a => a.status === 'Deducted').length} />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── MAIN CONTENT GRID ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 sm:gap-3.5">
          
          {/* Left Column: Request Form (4 cols) */}
          <motion.div variants={fadeInUp} className="lg:col-span-4 flex flex-col">
            <div className="bg-[#FAF8F5] border border-[#EAE7E0] rounded-[16px] sm:rounded-[20px] p-3.5 sm:p-4 shadow-2xs h-full flex flex-col">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="p-1.5 bg-white rounded-lg border border-[#EAE7E0] shadow-2xs">
                  <Send className="w-4 h-4 text-[#1F2B4D]" />
                </div>
                <h2 className="font-serif font-bold text-base sm:text-lg text-[#1F2B4D]">
                  Request Advance
                </h2>
              </div>
              <p className="text-[10px] sm:text-xs text-[#6B655C] mb-3 font-medium">
                Approved advances are automatically deducted in your selected month's payslip.
              </p>

              <AnimatePresence mode="wait">
                {statusMsg.text && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className={`p-2.5 rounded-xl text-[11px] font-semibold mb-3 flex items-start gap-2 border shadow-2xs overflow-hidden ${
                      statusMsg.type === 'error' 
                        ? 'bg-white border-rose-200 text-rose-800' 
                        : 'bg-white border-emerald-200 text-emerald-800'
                    }`}
                  >
                    {statusMsg.type === 'error' ? <AlertCircle className="shrink-0 mt-0.5" size={15} /> : <CheckCircle className="shrink-0 mt-0.5" size={15} />}
                    <span className="leading-snug">{statusMsg.text}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleRequestSubmit} className="space-y-2.5 flex-1 flex flex-col">
                <div className="group">
                  <label className="text-[9px] sm:text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider block mb-1">
                    Advance Amount (₹)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <IndianRupee className="h-3.5 w-3.5 text-[#9A948A]" />
                    </div>
                    <Input
                      type="number"
                      step="any"
                      placeholder="e.g. 15000"
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 rounded-xl bg-white border border-[#EAE7E0] text-xs font-bold text-[#1F2B4D] focus:outline-none focus:ring-2 focus:ring-[#1F2B4D]"
                    />
                  </div>
                </div>

                <div className="group">
                  <label className="text-[9px] sm:text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider block mb-1">
                    Deduction Month
                  </label>
                  <Input
                    type="month"
                    required
                    value={monthDeduction}
                    onChange={(e) => setMonthDeduction(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#EAE7E0] text-xs font-bold text-[#1F2B4D] focus:outline-none focus:ring-2 focus:ring-[#1F2B4D]"
                  />
                </div>

                <div className="group">
                  <label className="text-[9px] sm:text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider block mb-1">
                    Reason / Justification
                  </label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Context for audit..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full text-xs font-medium border border-[#EAE7E0] rounded-xl p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#1F2B4D] resize-none text-[#1F2B4D] placeholder-[#9A948A]"
                  />
                </div>

                <div className="pt-2 mt-auto">
                  <button 
                    type="submit" 
                    disabled={submitting} 
                    className="w-full bg-[#1F2B4D] hover:bg-[#141C33] text-white font-display font-bold text-xs py-2 sm:py-2.5 rounded-xl transition-all inline-flex items-center justify-center gap-1.5 shadow-2xs whitespace-nowrap"
                  >
                    {submitting ? <RefreshCw size={14} className="animate-spin shrink-0" /> : <Send size={14} className="shrink-0" />}
                    <span>{submitting ? 'Authenticating...' : 'Submit Request'}</span>
                  </button>
                </div>
              </form>
            </div>
          </motion.div>

          {/* Right Column: Personal Request History (8 cols) - Zero Horizontal Sliding Table */}
          <motion.div variants={fadeInUp} className="lg:col-span-8 flex flex-col">
            <div className="bg-white border border-[#EAE7E0] rounded-[16px] sm:rounded-[20px] p-3.5 sm:p-4 shadow-2xs flex flex-col h-full">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-[#FAF8F5] rounded-lg border border-[#EAE7E0] shadow-2xs">
                  <FileText className="w-4 h-4 text-[#1F2B4D]" />
                </div>
                <div>
                  <h2 className="font-serif font-bold text-base sm:text-lg text-[#1F2B4D]">
                    My Advance Ledger
                  </h2>
                  <p className="text-[10px] sm:text-xs text-[#6B655C] font-medium">Track your requested and settled advances.</p>
                </div>
              </div>

              <div className="bg-white border border-[#EAE7E0] rounded-[14px] sm:rounded-[18px] p-0 shadow-2xs overflow-hidden w-full">
                <table className="w-full table-fixed text-left border-collapse">
                  <thead>
                    <tr className="bg-[#FAF8F5] border-b border-[#EAE7E0] text-[8px] sm:text-[9.5px] font-display font-bold text-[#6B655C] uppercase tracking-wider">
                      <th className="p-1 sm:p-3 w-[20%] sm:w-[22%]">Amount</th>
                      <th className="p-1 sm:p-3 w-[15%] sm:w-[20%]">Recovery</th>
                      <th className="p-1 sm:p-3 w-[35%] sm:w-[30%]">Justification</th>
                      <th className="p-1 sm:p-3 w-[15%] sm:w-[15%]">Filed Date</th>
                      <th className="p-1 sm:p-3 w-[15%] sm:w-[13%] text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F4F1EA] text-xs">
                    {loading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          <td className="p-1.5 sm:p-2.5"><Skeleton className="h-3.5 w-full" /></td>
                          <td className="p-1.5 sm:p-2.5"><Skeleton className="h-3.5 w-full" /></td>
                          <td className="p-1.5 sm:p-2.5"><Skeleton className="h-3.5 w-full" /></td>
                          <td className="p-1.5 sm:p-2.5"><Skeleton className="h-3.5 w-full" /></td>
                          <td className="p-1.5 sm:p-2.5 text-right"><Skeleton className="h-5 w-14 rounded-full ml-auto" /></td>
                        </tr>
                      ))
                    ) : myAdvances.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-4 sm:p-5 text-center">
                          <div className="flex flex-col items-center justify-center gap-1.5">
                            <Wallet className="w-8 h-8 text-[#9A948A] opacity-50" />
                            <span className="text-[#6B655C] font-bold text-xs font-display tracking-wider uppercase">No ledger entries</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      myAdvances.map((adv) => (
                        <tr key={adv.id} className="hover:bg-[#FAF9F6] transition-colors">
                          <td className="p-1 sm:p-3 font-serif font-bold text-[#1F2B4D] text-[10px] sm:text-sm break-words">
                            ₹{adv.amount.toLocaleString()}
                          </td>
                          <td className="p-1 sm:p-3 text-[9px] sm:text-xs font-bold text-[#1F2B4D] break-words">
                            {adv.monthDeduction}
                          </td>
                          <td className="p-1 sm:p-3 text-[9px] sm:text-xs text-[#6B655C] font-medium break-words leading-tight" title={adv.reason}>
                            {adv.reason}
                          </td>
                          <td className="p-1 sm:p-3 text-[8.5px] sm:text-[11px] font-medium text-[#9A948A] break-words">
                            {new Date(adv.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                          </td>
                          <td className="p-1 sm:p-3 text-right">
                            <div className="flex justify-end">
                              {getStatusBadge(adv.status)}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        </div>

        {/* ── ADMIN / MANAGER: GOVERNANCE QUEUE ── */}
        {isAdminOrManager && (
          <motion.div variants={fadeInUp} className="bg-white border border-[#EAE7E0] rounded-[16px] sm:rounded-[20px] p-3.5 sm:p-4 shadow-2xs flex flex-col">
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-[#F4F1EA]">
              <div>
                <h2 className="font-serif font-bold text-base sm:text-lg text-[#1F2B4D] flex items-center gap-2">
                  <div className="p-1.5 bg-[#FAF8F5] rounded-lg border border-[#EAE7E0] shadow-2xs">
                    <ShieldAlert className="text-[#1F2B4D]" size={18} /> 
                  </div>
                  <span>Auditor Review Queue</span>
                </h2>
                <p className="text-[10px] sm:text-xs text-[#6B655C] mt-0.5 font-medium">
                  Evaluate predictive risk scores and manage salary advance approvals.
                </p>
              </div>

              <div className="flex items-center gap-2 bg-[#FAF8F5] p-1.5 rounded-xl border border-[#EAE7E0] w-full sm:w-auto">
                <span className="text-[9px] font-display font-bold text-[#6B655C] uppercase tracking-wider pl-2 whitespace-nowrap">Filter:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="text-[11px] font-bold text-[#1F2B4D] bg-white border border-[#EAE7E0] rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-[#1F2B4D] cursor-pointer"
                >
                  <option value="Pending">Pending Audit</option>
                  <option value="Approved">Approved (Awaiting Settlement)</option>
                  <option value="Deducted">Settled / Deducted</option>
                  <option value="Rejected">Rejected</option>
                  <option value="">All Ledger Entries</option>
                </select>
              </div>
            </div>

            {/* Auditor Table - Fit all content without sliding */}
            <div className="bg-white border border-[#EAE7E0] rounded-[14px] sm:rounded-[18px] p-0 shadow-2xs overflow-hidden w-full mt-3">
              <table className="w-full table-fixed text-left border-collapse">
                <thead>
                  <tr className="bg-[#FAF8F5] border-b border-[#EAE7E0] text-[8px] sm:text-[9.5px] font-display font-bold text-[#6B655C] uppercase tracking-wider">
                    <th className="p-1 sm:p-3 w-[25%] sm:w-[25%]">Personnel</th>
                    <th className="p-1 sm:p-3 w-[20%] sm:w-[20%]">Ledger & Month</th>
                    <th className="p-1 sm:p-3 w-[20%] sm:w-[20%]">Risk Telemetry</th>
                    <th className="p-1 sm:p-3 w-[15%] sm:w-[15%]">Status</th>
                    <th className="p-1 sm:p-3 w-[20%] sm:w-[20%] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F4F1EA] text-xs">
                  {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="p-1 sm:p-2.5"><Skeleton className="h-3.5 w-full" /></td>
                        <td className="p-1 sm:p-2.5"><Skeleton className="h-3.5 w-full" /></td>
                        <td className="p-1 sm:p-2.5"><Skeleton className="h-5 w-full rounded-full" /></td>
                        <td className="p-1 sm:p-2.5"><Skeleton className="h-5 w-full rounded-full" /></td>
                        <td className="p-1 sm:p-2.5 text-right"><Skeleton className="h-4 w-12 ml-auto" /></td>
                      </tr>
                    ))
                  ) : filteredAdminAdvances.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-[#6B655C] text-xs font-medium italic">
                        No records match filter criteria ({statusFilter || 'All'}).
                      </td>
                    </tr>
                  ) : (
                    filteredAdminAdvances.map((adv) => (
                      <tr key={adv.id} className="hover:bg-[#FAF9F6] transition-colors">
                        
                        {/* Employee Column */}
                        <td className="p-1 sm:p-3">
                          <div className="flex flex-wrap items-center gap-1 sm:gap-2 min-w-0">
                            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#FAF8F5] border border-[#EAE7E0] flex items-center justify-center font-bold text-[10px] sm:text-xs text-[#1F2B4D] overflow-hidden shrink-0">
                              {adv.user?.avatar ? <img src={adv.user.avatar} alt="User" className="w-full h-full object-cover" /> : <UserIcon size={12} />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="font-serif font-semibold text-[#1F2B4D] text-[9px] sm:text-xs block break-words">
                                {adv.user?.displayName || 'Unknown'}
                              </span>
                              <span className="text-[8px] sm:text-[9px] font-display font-bold tracking-wider uppercase text-[#9A948A] block">
                                ID: {adv.user?.employeeId || 'N/A'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Ledger Column */}
                        <td className="p-1 sm:p-3">
                          <span className="font-serif font-bold text-[#1F2B4D] text-[9.5px] sm:text-sm block break-words">₹{adv.amount.toLocaleString()}</span>
                          <span className="text-[8px] sm:text-[9px] font-display font-bold uppercase tracking-wider text-[#9A948A] block">Deduct: {adv.monthDeduction}</span>
                        </td>
                        {/* Risk Column */}
                        <td className="p-1 sm:p-3">
                          {getRiskBadge(adv.riskScore, adv.riskLabel)}
                        </td>

                        {/* Status Column */}
                        <td className="p-1 sm:p-3">
                          {getStatusBadge(adv.status)}
                        </td>

                        {/* Actions Column */}
                        <td className="p-1 sm:p-3 text-right">
                          {adv.status === 'Pending' ? (
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => { setSelectedAdvance(adv); setActionType('Approved'); }}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-display font-bold text-[9.5px] sm:text-[10px] rounded px-2 py-0.5 transition-all shrink-0"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => { setSelectedAdvance(adv); setActionType('Rejected'); }}
                                className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-display font-bold text-[9.5px] sm:text-[10px] rounded px-2 py-0.5 transition-all shrink-0"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-[9.5px] font-display font-bold uppercase tracking-wider text-[#9A948A]">Action Taken</span>
                          )}
                        </td>
                      </tr>
                    ))
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
          <div className="fixed inset-0 bg-[#1F2B4D]/30 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md p-4 sm:p-6 bg-white border border-[#EAE7E0] shadow-xl rounded-[20px] relative overflow-hidden max-h-[92vh] overflow-y-auto"
            >
              <div className={`absolute top-0 left-0 right-0 h-1.5 w-full ${actionType === 'Approved' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>

              <div className="flex items-center gap-3 mb-3 mt-1">
                <div className={`p-2 rounded-xl border shadow-2xs ${actionType === 'Approved' ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                  {actionType === 'Approved' ? <CheckCircle className="w-5 h-5 text-emerald-600" /> : <AlertTriangle className="w-5 h-5 text-rose-600" />}
                </div>
                <h3 className="font-serif font-bold text-lg sm:text-xl text-[#1F2B4D]">
                  {actionType === 'Approved' ? 'Confirm Approval' : 'Reject Request'}
                </h3>
              </div>
              
              <div className="p-3 bg-[#FAF8F5] border border-[#EAE7E0] rounded-xl text-xs text-[#1F2B4D] font-medium leading-relaxed">
                {actionType === 'Approved' 
                  ? <span>Approving advance of <strong className="font-bold font-serif text-sm">₹{selectedAdvance.amount.toLocaleString()}</strong> for <strong>{selectedAdvance.user?.displayName || 'the employee'}</strong> (Deduction: {selectedAdvance.monthDeduction}).</span> 
                  : <span>Declining salary advance request for <strong>{selectedAdvance.user?.displayName || 'the employee'}</strong>.</span>}
              </div>

              <form onSubmit={handleStatusSubmit} className="space-y-3 mt-4">
                <div>
                  <label className="text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider block mb-1">
                    Auditor Notes (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Enter audit rationale..."
                    value={auditorComments}
                    onChange={(e) => setAuditorComments(e.target.value)}
                    className="w-full text-xs font-medium border border-[#EAE7E0] bg-white rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[#1F2B4D] resize-none text-[#1F2B4D]"
                  />
                </div>

                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => { setSelectedAdvance(null); setActionType(''); }}
                    className="w-full sm:w-auto bg-white hover:bg-[#FAF8F5] text-[#1F2B4D] border border-[#EAE7E0] font-display font-bold text-xs px-4 py-2 rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className={`w-full sm:w-auto font-display font-bold text-xs px-5 py-2 rounded-xl transition-all text-white inline-flex items-center justify-center gap-1.5 ${
                      actionType === 'Approved' ? 'bg-[#1F2B4D] hover:bg-[#141C33]' : 'bg-rose-600 hover:bg-rose-700'
                    }`}
                  >
                    {actionLoading && <RefreshCw size={14} className="animate-spin shrink-0" />}
                    <span>{actionLoading ? 'Processing...' : `Confirm ${actionType}`}</span>
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

export default SalaryAdvance;
