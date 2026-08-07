import React, { useState, useEffect, useRef } from 'react';
import { hasPermission } from '../lib/permissions';
import { FileText, IndianRupee, Download, Eye, X, Zap, Clock, ShieldCheck, AlertTriangle } from 'lucide-react';
import { API_BASE } from '../lib/api';
import Alert from '../components/ui/Alert';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

const Payroll = ({ user }) => {
  const containerRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [payrolls, setPayrolls] = useState([]);
  const [advances, setAdvances] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // Advance form state
  const [advanceAmt, setAdvanceAmt] = useState('');
  const [advanceReason, setAdvanceReason] = useState('');
  const [advanceMonth, setAdvanceMonth] = useState('2026-07');
  
  const isAdmin = hasPermission(user, 'generate_payroll');
  const [genMonth, setGenMonth] = useState('2026-07');
  const [filterMonth, setFilterMonth] = useState('');
  const [selectedPayslip, setSelectedPayslip] = useState(null);

  // ─── GSAP Cinematic Entrance & Ambient Breathing ───
  useGSAP(() => {
    if (dataLoading) return;

    const tl = gsap.timeline({ defaults: { ease: "power2.out" } });

    tl.fromTo('.cinematic-header',
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.9 }
    )
    .fromTo('.cinematic-generate',
      { opacity: 0, y: 25 },
      { opacity: 1, y: 0, duration: 0.8 },
      "-=0.6"
    )
    .fromTo('.cinematic-side',
      { opacity: 0, y: 25 },
      { opacity: 1, y: 0, duration: 0.8, stagger: 0.1 },
      "-=0.5"
    )
    .fromTo('.cinematic-table',
      { opacity: 0, y: 25 },
      { opacity: 1, y: 0, duration: 0.8 },
      "-=0.5"
    );

    // Ambient float on key panels
    gsap.to('.ambient-float', {
      y: "-=3",
      duration: 5,
      ease: "sine.inOut",
      yoyo: true,
      repeat: -1,
      delay: 1.5,
      stagger: 0.4
    });

  }, { scope: containerRef, dependencies: [dataLoading] });

  const fetchPayrolls = async () => {
    try {
      const url = isAdmin ? `${API_BASE}/api/payroll/all` : `${API_BASE}/api/payroll/me`;
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setPayrolls(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
  };

  const fetchAdvances = async () => {
    if (!isAdmin) return;
    try {
      const res = await fetch(`${API_BASE}/api/payroll/advances`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setAdvances(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    setDataLoading(true);
    Promise.all([fetchPayrolls(), fetchAdvances()]).finally(() => setDataLoading(false));
  }, [isAdmin]);

  const handleRequestAdvance = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetch(`${API_BASE}/api/payroll/advance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ amount: parseFloat(advanceAmt), reason: advanceReason, monthDeduction: advanceMonth })
      });
      if (!res.ok) {
        const data = await res.json().catch(()=>({}));
        throw new Error(data.error || 'Failed to request advance');
      }
      setSuccessMsg('Advance requested successfully!');
      setAdvanceAmt('');
      setAdvanceReason('');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (error) {
      setErrorMsg(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdvanceStatus = async (id, status) => {
    setErrorMsg('');
    setSuccessMsg('');
    
    // Optimistic UI Update
    setAdvances(prev => prev.map(a => a.id === id ? { ...a, status } : a));

    try {
      const res = await fetch(`${API_BASE}/api/payroll/advance/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status })
      });
      if (!res.ok) {
        const data = await res.json().catch(()=>({}));
        throw new Error(data.error || 'Failed to update status');
      }
      
      // Auto-recalculate payroll for this specific user so the Net Pay deduction instantly reflects on the UI
      const updatedAdvance = advances.find(a => a.id === id);
      if (updatedAdvance) {
        await fetch(`${API_BASE}/api/payroll/generate/${updatedAdvance.monthDeduction}?userId=${updatedAdvance.userId}`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
      }

      fetchAdvances();
      fetchPayrolls();
      setSuccessMsg(`Advance ${status.toLowerCase()} successfully! Payroll recalculated.`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (error) {
      setErrorMsg(error.message);
    }
  };

  const handleGeneratePayroll = async () => {
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetch(`${API_BASE}/api/payroll/generate/${genMonth}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate payroll');
      setSuccessMsg(data.message || `Successfully processed payroll!`);
      fetchPayrolls();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (error) {
      setErrorMsg(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePfChallan = async () => {
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetch(`${API_BASE}/api/statutory-filings/pf-challan`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify({ month: filterMonth || '2026-07' })
      });
      if (!res.ok) {
        const data = await res.json().catch(()=>({}));
        throw new Error(data.error || 'Failed to generate PF Challan');
      }
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PF_Challan_ECR_${filterMonth || '2026-07'}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      setSuccessMsg('PF Challan ECR Generated successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (error) {
      setErrorMsg(error.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadPdf = async (id, month) => {
    try {
      const res = await fetch(`${API_BASE}/api/payroll/${id}/pdf`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!res.ok) throw new Error('Failed to download PDF');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payslip_${month}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch(e) {
      alert(e.message);
    }
  };

  // Reusable style constants
  const glassPanel = "bg-white/90 backdrop-blur-sm ring-1 ring-slate-100 rounded-[24px] shadow-[0_4px_24px_rgba(148,163,184,0.04)]";
  const springHover = "transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-[1.02] hover:-translate-y-2 hover:shadow-[0_20px_60px_rgba(100,116,139,0.1)] hover:border-white";
  const panelHoverLight = "transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(100,116,139,0.08)]";

  return (
    <div ref={containerRef} className="p-4 md:p-8 lg:p-12 max-w-7xl mx-auto space-y-8 bg-[#FAF9F6] min-h-screen font-sans">
      
      {/* ─── Page Header ─── */}
      <div className="cinematic-header">
        <h1 className="text-[32px] font-extrabold text-slate-700 tracking-tight leading-none mb-1">Payroll & Compensation</h1>
        <p className="text-slate-500 text-[14px] font-medium tracking-tight">Manage payroll runs, salary advances, and payslip records.</p>
      </div>

      {errorMsg && <Alert type="error" message={errorMsg} />}
      {successMsg && <Alert type="success" message={successMsg} />}

      {/* ─── Generate Payroll Panel (Admin) ─── */}
      {isAdmin && (
        <div className="cinematic-generate ambient-float">
          <div className={`p-7 ${glassPanel} ${springHover}`}>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
            <div>
              <h2 className="text-[20px] font-extrabold text-slate-700 tracking-tight flex items-center gap-2 mb-1">
                <Zap size={20} strokeWidth={2.5} className="text-slate-400" />
                Generate Monthly Payroll
              </h2>
              <p className="text-slate-500 text-[13px] font-medium">Calculates based on Base Salary, active attendance, and approved advances.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center w-full md:w-auto">
              <input 
                type="month" 
                value={genMonth} 
                onChange={(e) => setGenMonth(e.target.value)} 
                className="w-full sm:w-48 px-3 py-2.5 text-[13px] font-semibold text-slate-600 bg-white/80 ring-1 ring-slate-100 rounded-[12px] outline-none focus:ring-2 focus:ring-slate-300 transition-all duration-300" 
              />
              <button 
                onClick={handleGeneratePayroll} 
                disabled={loading} 
                className="group inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-700 text-white text-[13px] font-bold rounded-full ring-1 ring-slate-600 shadow-sm transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-[1.05] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(51,65,85,0.25)] active:scale-95 disabled:opacity-50 disabled:hover:scale-100 whitespace-nowrap"
              >
                <Zap size={14} strokeWidth={3} className="transition-transform duration-300 group-hover:rotate-12" />
                {loading ? 'Processing...' : 'Run Payroll Engine'}
              </button>
            </div>
          </div>
        </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* ─── Salary Advance Request (Employee) ─── */}
        {!isAdmin && (
          <div className="cinematic-side ambient-float lg:col-span-1 h-full">
            <div className={`p-7 h-full ${glassPanel} ${springHover}`}>
            <h3 className="text-[20px] font-extrabold text-slate-700 tracking-tight flex items-center gap-2 mb-1">
              <IndianRupee size={20} strokeWidth={2.5} className="text-emerald-400" />
              Request Advance
            </h3>
            <p className="text-[12px] text-slate-400 font-medium mb-5">Advances are auto-deducted from your selected month's payslip.</p>
            <form onSubmit={handleRequestAdvance} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 tracking-[0.1em] uppercase mb-1.5">Amount (₹)</label>
                <input 
                  type="number" required value={advanceAmt} onChange={e => setAdvanceAmt(e.target.value)} 
                  className="w-full px-3 py-2.5 text-[14px] font-semibold text-slate-700 bg-white/80 ring-1 ring-slate-100 rounded-[12px] outline-none focus:ring-2 focus:ring-emerald-200 transition-all duration-300" 
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 tracking-[0.1em] uppercase mb-1.5">Deduction Month</label>
                <input 
                  type="month" required value={advanceMonth} onChange={e => setAdvanceMonth(e.target.value)} 
                  className="w-full px-3 py-2.5 text-[14px] font-semibold text-slate-700 bg-white/80 ring-1 ring-slate-100 rounded-[12px] outline-none focus:ring-2 focus:ring-emerald-200 transition-all duration-300" 
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 tracking-[0.1em] uppercase mb-1.5">Reason</label>
                <input 
                  type="text" required value={advanceReason} onChange={e => setAdvanceReason(e.target.value)} 
                  className="w-full px-3 py-2.5 text-[14px] font-semibold text-slate-700 bg-white/80 ring-1 ring-slate-100 rounded-[12px] outline-none focus:ring-2 focus:ring-emerald-200 transition-all duration-300" 
                />
              </div>
              <button 
                type="submit" disabled={loading} 
                className="group w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-[13px] font-bold rounded-full ring-1 ring-emerald-500 shadow-sm transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-[1.03] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(16,185,129,0.3)] active:scale-95 disabled:opacity-50"
              >
                Submit Request
              </button>
            </form>
          </div>
          </div>
        )}

        {/* ─── Pending Advances (Admin) ─── */}
        {isAdmin && (
          <div className="cinematic-side ambient-float lg:col-span-1 h-full">
            <div className={`p-7 h-full flex flex-col ${glassPanel} ${panelHoverLight}`}>
            <h3 className="text-[20px] font-extrabold text-slate-700 tracking-tight flex items-center gap-2 mb-5">
              <Clock size={20} strokeWidth={2.5} className="text-slate-400" />
              Pending Advances
            </h3>
            <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar pr-1">
              {dataLoading ? (
                <div className="flex flex-col items-center justify-center py-10">
                  <div className="w-7 h-7 border-[3px] border-slate-100 border-t-slate-500 rounded-full animate-spin"></div>
                  <p className="text-[11px] text-slate-400 mt-3 font-bold tracking-[0.1em] uppercase">Checking advances...</p>
                </div>
              ) : advances.filter(a => a.status === 'Pending').length === 0 ? (
                <p className="text-slate-400 text-[13px] font-medium text-center py-8">No pending advances.</p>
              ) : null}
              {advances.filter(a => a.status === 'Pending').map(adv => (
                <div 
                  key={adv.id} 
                  className="p-4 bg-slate-50/50 backdrop-blur-sm ring-1 ring-slate-100/50 rounded-[16px] transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-[1.02] hover:bg-white hover:shadow-[0_8px_24px_rgba(148,163,184,0.1)] hover:-translate-y-0.5"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-bold text-[14px] text-slate-700">{adv.user?.displayName}</p>
                      <p className="text-[11px] text-slate-400 font-bold tracking-[0.05em]">Deduct: {adv.monthDeduction}</p>
                    </div>
                    <p className="font-black text-[16px] bg-clip-text text-transparent bg-gradient-to-br from-emerald-600 to-emerald-400">₹{adv.amount}</p>
                  </div>
                  
                  {/* Risk Badge */}
                  <div className="mb-2">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ring-1 shadow-sm ${
                      adv.riskLabel === 'HIGH' ? 'bg-rose-50/80 text-rose-600 ring-rose-200/50' :
                      adv.riskLabel === 'MEDIUM' ? 'bg-amber-50/80 text-amber-600 ring-amber-200/50' :
                      'bg-emerald-50/80 text-emerald-600 ring-emerald-200/50'
                    }`}>
                      <AlertTriangle size={10} strokeWidth={3} />
                      Risk: {adv.riskScore != null ? `${adv.riskScore}% (${adv.riskLabel})` : 'N/A'}
                    </span>
                  </div>

                  <p className="text-[13px] text-slate-500 italic mb-3 font-medium">"{adv.reason}"</p>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleAdvanceStatus(adv.id, 'Approved')} 
                      className="group flex-1 inline-flex items-center justify-center gap-1.5 text-[11px] font-bold text-emerald-600 bg-emerald-50/80 ring-1 ring-emerald-200/50 py-2 rounded-full transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-[1.05] hover:bg-emerald-100 hover:shadow-sm active:scale-95"
                    >
                      <ShieldCheck size={12} strokeWidth={3} className="transition-transform duration-300 group-hover:scale-110" />
                      Approve
                    </button>
                    <button 
                      onClick={() => handleAdvanceStatus(adv.id, 'Rejected')} 
                      className="group flex-1 inline-flex items-center justify-center gap-1.5 text-[11px] font-bold text-rose-500 bg-rose-50/80 ring-1 ring-rose-200/50 py-2 rounded-full transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-[1.05] hover:bg-rose-100 hover:shadow-sm active:scale-95"
                    >
                      <X size={12} strokeWidth={3} className="transition-transform duration-300 group-hover:rotate-90" />
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          </div>
        )}

        {/* ─── Payslips Table ─── */}
        <div className="cinematic-table lg:col-span-2 h-full">
          <div className={`p-7 h-full flex flex-col ${glassPanel} ${panelHoverLight}`}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <h3 className="text-[20px] font-extrabold text-slate-700 tracking-tight flex items-center gap-2">
              <FileText size={20} strokeWidth={2.5} className="text-slate-400" />
              {isAdmin ? 'All Generated Payslips' : 'My Payslips'}
            </h3>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-[11px] font-bold text-slate-400 tracking-[0.1em] uppercase">Filter:</span>
              <input 
                type="month" 
                value={filterMonth} 
                onChange={(e) => setFilterMonth(e.target.value)} 
                className="px-3 py-1.5 text-[13px] font-semibold text-slate-600 bg-white/80 ring-1 ring-slate-100 rounded-[10px] outline-none focus:ring-2 focus:ring-slate-200 transition-all duration-300" 
              />
              {filterMonth && (
                <button onClick={() => setFilterMonth('')} className="text-[11px] font-bold text-slate-400 hover:text-slate-600 transition-colors duration-300">
                  Clear
                </button>
              )}
              {isAdmin && (
                <button 
                  onClick={handleGeneratePfChallan} 
                  disabled={loading}
                  className="group inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-teal-600 text-white text-[11px] font-bold rounded-full ring-1 ring-teal-500 shadow-sm transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-[1.05] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(13,148,136,0.3)] active:scale-95 disabled:opacity-50"
                  title="Generates ECR Challan for PF remittance"
                >
                  <FileText size={12} strokeWidth={3} className="transition-transform duration-300 group-hover:rotate-6" /> 
                  Generate ECR
                </button>
              )}
            </div>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100/50">
                  <th className="pb-3 px-3 text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em] whitespace-nowrap">Month</th>
                  {isAdmin && <th className="pb-3 px-3 text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em]">Employee</th>}
                  <th className="pb-3 px-3 text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em] whitespace-nowrap">Days</th>
                  <th className="pb-3 px-3 text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em] whitespace-nowrap">OT</th>
                  <th className="pb-3 px-3 text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em] whitespace-nowrap">Deductions</th>
                  <th className="pb-3 px-3 text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em] whitespace-nowrap">Gross</th>
                  <th className="pb-3 px-3 text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em] whitespace-nowrap">Net Pay</th>
                  <th className="pb-3 px-3 text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em] text-right whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody>
                {dataLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="py-4 px-3"><div className="h-3 w-14 bg-slate-100 rounded-full" /></td>
                      {isAdmin && <td className="py-4 px-3"><div className="h-3 w-24 bg-slate-100 rounded-full" /></td>}
                      <td className="py-4 px-3"><div className="h-3 w-8 bg-slate-100 rounded-full" /></td>
                      <td className="py-4 px-3"><div className="h-3 w-10 bg-slate-100 rounded-full" /></td>
                      <td className="py-4 px-3"><div className="h-3 w-14 bg-slate-100 rounded-full" /></td>
                      <td className="py-4 px-3"><div className="h-3 w-16 bg-slate-100 rounded-full" /></td>
                      <td className="py-4 px-3"><div className="h-3 w-16 bg-slate-100 rounded-full" /></td>
                      <td className="py-4 px-3 text-right"><div className="h-5 w-20 bg-slate-100 rounded-full ml-auto" /></td>
                    </tr>
                  ))
                ) : payrolls.filter(pay => !filterMonth || pay.month === filterMonth).length === 0 ? (
                  <tr><td colSpan="10" className="py-10 text-center text-slate-400 text-[13px] font-bold">No payslips found.</td></tr>
                ) : (
                  payrolls.filter(pay => !filterMonth || pay.month === filterMonth).map(pay => (
                    <tr 
                      key={pay.id} 
                      className="group hover:bg-gradient-to-r hover:from-white hover:to-slate-50/50 hover:shadow-[0_4px_16px_rgba(148,163,184,0.06)] hover:-translate-y-[1px] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] cursor-default"
                    >
                      <td className="py-4 px-3 rounded-l-[12px] font-bold text-[14px] text-slate-700 whitespace-nowrap">{pay.month}</td>
                      {isAdmin && <td className="py-4 px-3 text-[13px] text-slate-500 font-semibold">{pay.user?.displayName}</td>}
                      <td className="py-4 px-3 text-[13px] text-slate-500 font-semibold whitespace-nowrap">{pay.payableDays} d</td>
                      <td className="py-4 px-3 text-[13px] text-slate-500 font-semibold whitespace-nowrap">
                        {pay.overtimeHours > 0 ? (
                          <span>{pay.overtimeHours.toFixed(1)}h <span className="text-[11px] text-emerald-500 font-bold">(+₹{pay.overtimeBonus.toLocaleString()})</span></span>
                        ) : '0h'}
                      </td>
                      <td className="py-4 px-3 text-[13px] text-rose-400 font-bold whitespace-nowrap">
                        {pay.lateDeductions > 0 ? `₹${pay.lateDeductions.toLocaleString(undefined, {minimumFractionDigits: 2})}` : '₹0.00'}
                      </td>
                      <td className="py-4 px-3 text-[13px] text-slate-500 font-semibold whitespace-nowrap">₹{pay.grossSalary.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                      <td className="py-4 px-3 font-black text-[14px] bg-clip-text text-transparent bg-gradient-to-br from-emerald-600 to-emerald-400 whitespace-nowrap">₹{pay.netSalary.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                      <td className="py-4 px-3 rounded-r-[12px] text-right whitespace-nowrap">
                        <button 
                          onClick={() => setSelectedPayslip(pay)}
                          className="group/btn inline-flex items-center justify-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-700 bg-slate-50/50 hover:bg-white ring-1 ring-slate-100/50 hover:ring-slate-200 px-2.5 py-1.5 rounded-full mr-1 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-105 hover:shadow-sm"
                        >
                          <Eye size={12} strokeWidth={2.5} className="transition-transform duration-300 group-hover/btn:scale-110" /> View
                        </button>
                        <button 
                          onClick={() => downloadPdf(pay.id, pay.month)}
                          className="group/btn inline-flex items-center justify-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-700 bg-slate-50/50 hover:bg-white ring-1 ring-slate-100/50 hover:ring-slate-200 px-2.5 py-1.5 rounded-full transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-105 hover:shadow-sm"
                        >
                          <Download size={12} strokeWidth={2.5} className="transition-transform duration-300 group-hover/btn:-translate-y-0.5" /> PDF
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile View */}
          <div className="md:hidden flex flex-col gap-4 mt-4">
            {payrolls.filter(pay => !filterMonth || pay.month === filterMonth).length === 0 ? (
              <div className="py-8 text-center text-[13px] text-slate-400 font-bold">No payslips found.</div>
            ) : (
              payrolls.filter(pay => !filterMonth || pay.month === filterMonth).map(pay => (
                <div 
                  key={pay.id} 
                  className={`p-5 ${glassPanel} flex flex-col gap-3 relative overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-[1.01] hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(148,163,184,0.1)]`}
                >
                  <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-slate-300 to-slate-100 rounded-full"></div>
                  
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-700 text-[18px]">{pay.month}</span>
                      {isAdmin && <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em]">{pay.user?.displayName}</span>}
                    </div>
                    <span className="font-black text-[15px] bg-clip-text text-transparent bg-gradient-to-br from-emerald-600 to-emerald-400 bg-emerald-50/80 ring-1 ring-emerald-200/50 px-3 py-1.5 rounded-full">
                      ₹{pay.netSalary.toLocaleString(undefined, {minimumFractionDigits: 2})}
                    </span>
                  </div>
                  
                  <div className="bg-slate-50/50 backdrop-blur-sm rounded-[14px] p-3.5 flex justify-between items-center text-[13px] ring-1 ring-slate-100/50 mt-1">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em]">Gross</span>
                      <span className="font-semibold text-slate-600">₹{pay.grossSalary.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                    </div>
                    <div className="w-px h-8 bg-slate-100/50"></div>
                    <div className="flex flex-col gap-1 items-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em]">Overtime</span>
                      <span className="font-semibold text-emerald-500">+{pay.overtimeHours.toFixed(1)}h</span>
                    </div>
                    <div className="w-px h-8 bg-slate-100/50"></div>
                    <div className="flex flex-col gap-1 items-end">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em]">Days</span>
                      <span className="font-semibold text-slate-600">{pay.payableDays}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 w-full mt-2">
                    <button 
                      onClick={() => setSelectedPayslip(pay)}
                      className="group flex-1 flex items-center justify-center gap-1.5 text-[11px] font-bold text-slate-600 bg-white/80 ring-1 ring-slate-100 py-2.5 rounded-full transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-[1.03] hover:shadow-sm active:scale-95"
                    >
                      <Eye size={13} strokeWidth={2.5} className="transition-transform duration-300 group-hover:scale-110" /> View Breakup
                    </button>
                    <button 
                      onClick={() => downloadPdf(pay.id, pay.month)}
                      className="group flex-1 flex items-center justify-center gap-1.5 text-[11px] font-bold text-slate-600 bg-white/80 ring-1 ring-slate-100 py-2.5 rounded-full transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-[1.03] hover:shadow-sm active:scale-95"
                    >
                      <Download size={13} strokeWidth={2.5} className="transition-transform duration-300 group-hover:-translate-y-0.5" /> PDF
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        </div>

      </div>

      {/* ─── Payslip Modal ─── */}
      {selectedPayslip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-400/15 backdrop-blur-md p-4">
          <div className={`bg-white/95 backdrop-blur-sm rounded-[24px] ring-1 ring-slate-100 shadow-[0_24px_80px_rgba(100,116,139,0.15)] w-full max-w-2xl max-h-[90vh] overflow-y-auto`}>
            <div className="flex justify-between items-center p-7 border-b border-slate-100/50">
              <h2 className="text-[20px] font-extrabold text-slate-700 tracking-tight">Salary Breakup: {selectedPayslip.month}</h2>
              <button 
                onClick={() => setSelectedPayslip(null)} 
                className="p-2 rounded-full bg-slate-50/50 ring-1 ring-slate-100/50 text-slate-400 hover:text-slate-600 hover:bg-white hover:ring-slate-200 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-110 hover:rotate-90 active:scale-90"
              >
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>
            <div className="p-7">
              <div className="grid grid-cols-2 gap-4 mb-6 text-[13px]">
                <div><span className="text-slate-400 font-bold">Employee:</span> <span className="text-slate-700 font-semibold">{selectedPayslip.user?.displayName || 'N/A'}</span> <span className="text-slate-400 font-mono text-[11px]">({selectedPayslip.user?.employeeId || 'ID N/A'})</span></div>
                <div><span className="text-slate-400 font-bold">Days Payable:</span> <span className="text-slate-700 font-semibold">{selectedPayslip.payableDays}</span></div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-bold text-slate-600 text-[13px] uppercase tracking-[0.05em] mb-3 pb-2 border-b border-slate-100/50">Earnings</h4>
                  <div className="space-y-2 text-[13px]">
                    <div className="flex justify-between"><span className="text-slate-500 font-medium">Basic</span><span className="text-slate-700 font-semibold">₹{selectedPayslip.basicSalary}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500 font-medium">HRA</span><span className="text-slate-700 font-semibold">₹{selectedPayslip.hra}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500 font-medium">Std Allowance</span><span className="text-slate-700 font-semibold">₹{selectedPayslip.standardAllowance}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500 font-medium">Fixed Allowance</span><span className="text-slate-700 font-semibold">₹{selectedPayslip.fixedAllowance}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500 font-medium">Bonus</span><span className="text-slate-700 font-semibold">₹{selectedPayslip.performanceBonus}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500 font-medium">LTA</span><span className="text-slate-700 font-semibold">₹{selectedPayslip.lta}</span></div>
                    <div className="flex justify-between font-bold mt-3 pt-3 border-t border-slate-100/50 text-slate-700"><span>Gross Salary</span><span>₹{selectedPayslip.grossSalary}</span></div>
                  </div>
                </div>
                <div>
                  <h4 className="font-bold text-slate-600 text-[13px] uppercase tracking-[0.05em] mb-3 pb-2 border-b border-slate-100/50">Deductions</h4>
                  <div className="space-y-2 text-[13px]">
                    <div className="flex justify-between"><span className="text-slate-500 font-medium">PF (Employee)</span><span className="text-slate-700 font-semibold">₹{selectedPayslip.pfEmployee}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500 font-medium">Professional Tax</span><span className="text-slate-700 font-semibold">₹{selectedPayslip.professionalTax}</span></div>
                    {selectedPayslip.advanceDeduction > 0 && (
                      <div className="flex justify-between text-rose-400"><span className="font-medium">Advance Recovery</span><span className="font-bold">₹{selectedPayslip.advanceDeduction}</span></div>
                    )}
                    <div className="flex justify-between font-bold mt-3 pt-3 border-t border-slate-100/50 text-slate-700"><span>Total Deductions</span><span>₹{selectedPayslip.pfEmployee + selectedPayslip.professionalTax + (selectedPayslip.advanceDeduction || 0)}</span></div>
                  </div>
                  <h4 className="font-bold text-slate-600 text-[13px] uppercase tracking-[0.05em] mb-3 pb-2 border-b border-slate-100/50 mt-5">Employer Contributions</h4>
                  <div className="space-y-2 text-[13px]">
                    <div className="flex justify-between"><span className="text-slate-500 font-medium">PF (Employer)</span><span className="text-slate-700 font-semibold">₹{selectedPayslip.pfEmployer}</span></div>
                  </div>
                </div>
              </div>

              <div className="mt-7 pt-5 border-t border-slate-100/50 flex justify-between items-center bg-slate-50/50 backdrop-blur-sm p-5 rounded-[16px] ring-1 ring-slate-100/50">
                <span className="font-bold text-slate-500 uppercase tracking-[0.1em] text-[11px]">Net Take Home</span>
                <span className="text-[28px] font-black bg-clip-text text-transparent bg-gradient-to-br from-slate-700 to-slate-400">₹{selectedPayslip.netSalary}</span>
              </div>

              {/* Compliance Breakdown Section */}
              {(selectedPayslip.bonusBreakdown?.length > 0 || selectedPayslip.deductionBreakdown?.length > 0) && (
                <div className="mt-6 pt-5 border-t border-slate-100/50">
                  <h4 className="font-bold text-slate-500 mb-4 text-[11px] uppercase tracking-[0.1em]">Attendance Compliance Details</h4>
                  <div className="space-y-4">
                    {/* Overtime Group */}
                    {selectedPayslip.bonusBreakdown?.length > 0 && (
                      <div className="bg-slate-50/50 p-4 rounded-[14px] ring-1 ring-slate-100/50">
                        <span className="text-[10px] font-bold text-emerald-500 block mb-2.5 uppercase tracking-[0.1em]">Overtime (OT)</span>
                        <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar">
                          {selectedPayslip.bonusBreakdown.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-[12px] text-slate-500 font-medium">
                              <span>{item.date}: {item.hours} hrs</span>
                              <span className="text-emerald-500 font-bold">+₹{item.amount}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Late Arrivals Group */}
                    {selectedPayslip.deductionBreakdown?.filter(d => d.type === 'late_arrival').length > 0 && (
                      <div className="bg-slate-50/50 p-4 rounded-[14px] ring-1 ring-slate-100/50">
                        <span className="text-[10px] font-bold text-amber-500 block mb-2.5 uppercase tracking-[0.1em]">Late Arrivals</span>
                        <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar">
                          {selectedPayslip.deductionBreakdown.filter(d => d.type === 'late_arrival').map((item, idx) => (
                            <div key={idx} className="flex justify-between text-[12px] text-slate-500 font-medium">
                              <span>{item.date}: {item.minutes} min late</span>
                              <span className="text-rose-400 font-bold">-₹{item.amount}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Early Departures Group */}
                    {selectedPayslip.deductionBreakdown?.filter(d => d.type === 'early_departure').length > 0 && (
                      <div className="bg-slate-50/50 p-4 rounded-[14px] ring-1 ring-slate-100/50">
                        <span className="text-[10px] font-bold text-rose-400 block mb-2.5 uppercase tracking-[0.1em]">Early Departures</span>
                        <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar">
                          {selectedPayslip.deductionBreakdown.filter(d => d.type === 'early_departure').map((item, idx) => (
                            <div key={idx} className="flex justify-between text-[12px] text-slate-500 font-medium">
                              <span>{item.date}: {item.minutes} min early</span>
                              <span className="text-rose-400 font-bold">-₹{item.amount}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payroll;
