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
    <div ref={containerRef} className="w-full min-h-full flex flex-col gap-3.5 sm:gap-4 p-3 sm:p-5 md:p-6 bg-[#FAF9F6] font-sans">
      
      {/* ─── Page Header ─── */}
      <div className="cinematic-header flex flex-col min-[480px]:flex-row min-[480px]:items-center justify-between gap-2 pb-2 border-b border-[#EAE7E0] w-full">
        <div>
          <h1 className="font-serif font-bold text-lg sm:text-2xl md:text-3xl text-[#1F2B4D] tracking-tight leading-tight flex items-center gap-2">
            <IndianRupee className="text-[#1F2B4D] w-5 h-5 sm:w-6 sm:h-6" />
            <span>Payroll & Compensation</span>
          </h1>
          <p className="text-[#6B655C] text-xs sm:text-sm font-medium mt-0.5">
            Manage payroll runs, salary advances, and official payslip records.
          </p>
        </div>
      </div>

      {errorMsg && <Alert type="error" message={errorMsg} />}
      {successMsg && <Alert type="success" message={successMsg} />}

      {/* ─── Generate Payroll Panel (Admin) ─── */}
      {isAdmin && (
        <div className="cinematic-generate ambient-float w-full">
          <div className="p-4 sm:p-5 bg-white rounded-2xl border border-[#EAE7E0] shadow-2xs w-full">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="font-serif font-bold text-base sm:text-lg text-[#1F2B4D] tracking-tight flex items-center gap-2">
                  <Zap size={18} className="text-[#1F2B4D]" />
                  <span>Generate Monthly Payroll</span>
                </h2>
                <p className="text-[#6B655C] text-xs font-medium mt-0.5">
                  Calculates based on Base Salary, active attendance, and approved advances.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center w-full md:w-auto">
                <input 
                  type="month" 
                  value={genMonth} 
                  onChange={(e) => setGenMonth(e.target.value)} 
                  className="w-full sm:w-44 px-3 py-2 text-xs font-bold text-[#1F2B4D] bg-[#FAF8F5] border border-[#EAE7E0] rounded-xl outline-none focus:ring-2 focus:ring-[#1F2B4D]" 
                />
                <button 
                  onClick={handleGeneratePayroll} 
                  disabled={loading} 
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#1F2B4D] hover:bg-[#141C33] text-white text-xs font-display font-bold uppercase tracking-wider rounded-xl transition-all shadow-2xs whitespace-nowrap disabled:opacity-50"
                >
                  <Zap size={14} />
                  <span>{loading ? 'Processing...' : 'Run Payroll Engine'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 sm:gap-4 w-full">
        
        {/* ─── Salary Advance Request (Employee) ─── */}
        {!isAdmin && (
          <div className="cinematic-side ambient-float lg:col-span-1 h-full w-full">
            <div className="p-4 sm:p-5 bg-white rounded-2xl border border-[#EAE7E0] shadow-2xs h-full flex flex-col justify-between">
              <div>
                <h3 className="font-serif font-bold text-base sm:text-lg text-[#1F2B4D] tracking-tight flex items-center gap-2 mb-1">
                  <IndianRupee size={18} className="text-emerald-600" />
                  <span>Request Advance</span>
                </h3>
                <p className="text-xs text-[#6B655C] font-medium mb-4">Advances are auto-deducted from your selected month's payslip.</p>
                <form onSubmit={handleRequestAdvance} className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider mb-1">Amount (₹)</label>
                    <input 
                      type="number" required value={advanceAmt} onChange={e => setAdvanceAmt(e.target.value)} 
                      className="w-full px-3 py-2 text-xs font-bold text-[#1F2B4D] bg-[#FAF8F5] border border-[#EAE7E0] rounded-xl outline-none focus:ring-2 focus:ring-[#1F2B4D]" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider mb-1">Deduction Month</label>
                    <input 
                      type="month" required value={advanceMonth} onChange={e => setAdvanceMonth(e.target.value)} 
                      className="w-full px-3 py-2 text-xs font-bold text-[#1F2B4D] bg-[#FAF8F5] border border-[#EAE7E0] rounded-xl outline-none focus:ring-2 focus:ring-[#1F2B4D]" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider mb-1">Reason</label>
                    <input 
                      type="text" required value={advanceReason} onChange={e => setAdvanceReason(e.target.value)} 
                      className="w-full px-3 py-2 text-xs font-bold text-[#1F2B4D] bg-[#FAF8F5] border border-[#EAE7E0] rounded-xl outline-none focus:ring-2 focus:ring-[#1F2B4D]" 
                    />
                  </div>
                  <button 
                    type="submit" disabled={loading} 
                    className="w-full mt-2 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-display font-bold uppercase tracking-wider rounded-xl transition-all shadow-2xs disabled:opacity-50"
                  >
                    Submit Request
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* ─── Pending Advances (Admin) ─── */}
        {isAdmin && (
          <div className="cinematic-side ambient-float lg:col-span-1 h-full w-full">
            <div className="p-4 sm:p-5 bg-white rounded-2xl border border-[#EAE7E0] shadow-2xs h-full flex flex-col">
              <h3 className="font-serif font-bold text-base sm:text-lg text-[#1F2B4D] tracking-tight flex items-center gap-2 mb-3">
                <Clock size={18} className="text-[#1F2B4D]" />
                <span>Pending Advances</span>
              </h3>
              <div className="space-y-2.5 max-h-96 overflow-y-auto [&::-webkit-scrollbar]:hidden pr-1 flex-1">
                {dataLoading ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-[#1F2B4D]/20 border-t-[#1F2B4D] rounded-full animate-spin"></div>
                    <p className="text-[10px] text-[#6B655C] mt-2 font-bold tracking-wider uppercase">Checking advances...</p>
                  </div>
                ) : advances.filter(a => a.status === 'Pending').length === 0 ? (
                  <p className="text-[#6B655C] text-xs font-medium text-center py-6">No pending advances.</p>
                ) : null}
                {advances.filter(a => a.status === 'Pending').map(adv => (
                  <div 
                    key={adv.id} 
                    className="p-3 bg-[#FAF8F5] border border-[#EAE7E0] rounded-xl flex flex-col gap-2"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-xs text-[#1F2B4D]">{adv.user?.displayName}</p>
                        <p className="text-[10px] text-[#6B655C] font-bold">Deduct: {adv.monthDeduction}</p>
                      </div>
                      <p className="font-bold text-xs text-emerald-700 font-mono">₹{adv.amount}</p>
                    </div>
                    
                    {/* Risk Badge */}
                    <div>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-display font-bold uppercase tracking-wider border shadow-2xs ${
                        adv.riskLabel === 'HIGH' ? 'bg-rose-50 text-rose-800 border-rose-200' :
                        adv.riskLabel === 'MEDIUM' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                        'bg-emerald-50 text-emerald-800 border-emerald-200'
                      }`}>
                        <AlertTriangle size={10} />
                        Risk: {adv.riskScore != null ? `${adv.riskScore}% (${adv.riskLabel})` : 'N/A'}
                      </span>
                    </div>

                    <p className="text-xs text-[#6B655C] italic font-medium">"{adv.reason}"</p>
                    <div className="flex gap-2 pt-1">
                      <button 
                        onClick={() => handleAdvanceStatus(adv.id, 'Approved')} 
                        className="flex-1 inline-flex items-center justify-center gap-1 text-[10px] font-display font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200 py-1.5 rounded-lg hover:bg-emerald-100 transition-all shadow-2xs"
                      >
                        <ShieldCheck size={12} />
                        Approve
                      </button>
                      <button 
                        onClick={() => handleAdvanceStatus(adv.id, 'Rejected')} 
                        className="flex-1 inline-flex items-center justify-center gap-1 text-[10px] font-display font-bold uppercase tracking-wider text-rose-800 bg-rose-50 border border-rose-200 py-1.5 rounded-lg hover:bg-rose-100 transition-all shadow-2xs"
                      >
                        <X size={12} />
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
        <div className="cinematic-table lg:col-span-2 h-full w-full">
          <div className="p-4 sm:p-5 bg-white rounded-2xl border border-[#EAE7E0] shadow-2xs h-full flex flex-col">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2.5 pb-2 border-b border-[#EAE7E0]">
              <h3 className="font-serif font-bold text-base sm:text-lg text-[#1F2B4D] tracking-tight flex items-center gap-2">
                <FileText size={18} className="text-[#1F2B4D]" />
                <span>{isAdmin ? 'All Generated Payslips' : 'My Payslips'}</span>
              </h3>
              <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                <span className="text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider">Filter:</span>
                <input 
                  type="month" 
                  value={filterMonth} 
                  onChange={(e) => setFilterMonth(e.target.value)} 
                  className="px-2.5 py-1 text-xs font-bold text-[#1F2B4D] bg-[#FAF8F5] border border-[#EAE7E0] rounded-lg outline-none" 
                />
                {filterMonth && (
                  <button onClick={() => setFilterMonth('')} className="text-[10px] font-bold text-[#6B655C] hover:text-[#1F2B4D]">
                    Clear
                  </button>
                )}
                {isAdmin && (
                  <button 
                    onClick={handleGeneratePfChallan} 
                    disabled={loading}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-teal-700 hover:bg-teal-800 text-white text-[10px] font-display font-bold uppercase tracking-wider rounded-lg shadow-2xs transition-all disabled:opacity-50 ml-auto sm:ml-0"
                    title="Generates ECR Challan for PF remittance"
                  >
                    <FileText size={12} /> 
                    <span>Generate ECR</span>
                  </button>
                )}
              </div>
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto [&::-webkit-scrollbar]:hidden w-full">
              <table className="w-full text-left border-collapse min-w-[620px]">
                <thead>
                  <tr className="border-b border-[#EAE7E0] bg-[#FAF8F5] text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider">
                    <th className="py-2.5 px-3">Month</th>
                    {isAdmin && <th className="py-2.5 px-3">Employee</th>}
                    <th className="py-2.5 px-3">Days</th>
                    <th className="py-2.5 px-3">OT</th>
                    <th className="py-2.5 px-3">Deductions</th>
                    <th className="py-2.5 px-3">Gross</th>
                    <th className="py-2.5 px-3">Net Pay</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F4F1EA]">
                  {dataLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="py-3 px-3"><div className="h-3 w-14 bg-slate-100 rounded-full" /></td>
                        {isAdmin && <td className="py-3 px-3"><div className="h-3 w-24 bg-slate-100 rounded-full" /></td>}
                        <td className="py-3 px-3"><div className="h-3 w-8 bg-slate-100 rounded-full" /></td>
                        <td className="py-3 px-3"><div className="h-3 w-10 bg-slate-100 rounded-full" /></td>
                        <td className="py-3 px-3"><div className="h-3 w-14 bg-slate-100 rounded-full" /></td>
                        <td className="py-3 px-3"><div className="h-3 w-16 bg-slate-100 rounded-full" /></td>
                        <td className="py-3 px-3"><div className="h-3 w-16 bg-slate-100 rounded-full" /></td>
                        <td className="py-3 px-3 text-right"><div className="h-5 w-20 bg-slate-100 rounded-full ml-auto" /></td>
                      </tr>
                    ))
                  ) : payrolls.filter(pay => !filterMonth || pay.month === filterMonth).length === 0 ? (
                    <tr><td colSpan="10" className="py-8 text-center text-[#6B655C] text-xs font-medium">No payslips found.</td></tr>
                  ) : (
                    payrolls.filter(pay => !filterMonth || pay.month === filterMonth).map(pay => (
                      <tr 
                        key={pay.id} 
                        className="hover:bg-[#FAF8F5] transition-colors"
                      >
                        <td className="py-3 px-3 font-bold text-xs text-[#1F2B4D] whitespace-nowrap">{pay.month}</td>
                        {isAdmin && <td className="py-3 px-3 text-xs text-[#1F2B4D] font-bold">{pay.user?.displayName}</td>}
                        <td className="py-3 px-3 text-xs text-[#6B655C] font-medium whitespace-nowrap">{pay.payableDays} d</td>
                        <td className="py-3 px-3 text-xs text-[#6B655C] font-medium whitespace-nowrap">
                          {pay.overtimeHours > 0 ? (
                            <span>{pay.overtimeHours.toFixed(1)}h <span className="text-[10px] text-emerald-700 font-bold">(+₹{pay.overtimeBonus.toLocaleString()})</span></span>
                          ) : '0h'}
                        </td>
                        <td className="py-3 px-3 text-xs text-rose-700 font-bold whitespace-nowrap">
                          {pay.lateDeductions > 0 ? `₹${pay.lateDeductions.toLocaleString(undefined, {minimumFractionDigits: 2})}` : '₹0.00'}
                        </td>
                        <td className="py-3 px-3 text-xs text-[#6B655C] font-medium whitespace-nowrap">₹{pay.grossSalary.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                        <td className="py-3 px-3 font-bold text-xs text-emerald-800 font-mono whitespace-nowrap">₹{pay.netSalary.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <button 
                            onClick={() => setSelectedPayslip(pay)}
                            className="inline-flex items-center justify-center gap-1 text-[10px] font-display font-bold text-[#1F2B4D] bg-white border border-[#EAE7E0] hover:border-[#1F2B4D] px-2 py-1 rounded-lg mr-1 transition-all shadow-2xs"
                          >
                            <Eye size={11} /> View
                          </button>
                          <button 
                            onClick={() => downloadPdf(pay.id, pay.month)}
                            className="inline-flex items-center justify-center gap-1 text-[10px] font-display font-bold text-[#1F2B4D] bg-white border border-[#EAE7E0] hover:border-[#1F2B4D] px-2 py-1 rounded-lg transition-all shadow-2xs"
                          >
                            <Download size={11} /> PDF
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile View Cards */}
            <div className="md:hidden flex flex-col gap-3 mt-2">
              {payrolls.filter(pay => !filterMonth || pay.month === filterMonth).length === 0 ? (
                <div className="py-6 text-center text-xs text-[#6B655C] font-medium">No payslips found.</div>
              ) : (
                payrolls.filter(pay => !filterMonth || pay.month === filterMonth).map(pay => (
                  <div 
                    key={pay.id} 
                    className="p-3.5 bg-[#FAF8F5] border border-[#EAE7E0] rounded-xl flex flex-col gap-2 shadow-2xs"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex flex-col">
                        <span className="font-bold text-[#1F2B4D] text-sm sm:text-base">{pay.month}</span>
                        {isAdmin && <span className="text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider">{pay.user?.displayName}</span>}
                      </div>
                      <span className="font-mono font-bold text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full shadow-2xs">
                        ₹{pay.netSalary.toLocaleString(undefined, {minimumFractionDigits: 2})}
                      </span>
                    </div>
                    
                    <div className="bg-white rounded-lg p-2.5 flex justify-between items-center text-xs border border-[#EAE7E0]">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[9px] font-display font-bold text-[#6B655C] uppercase tracking-wider">Gross</span>
                        <span className="font-bold text-[#1F2B4D]">₹{pay.grossSalary.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                      </div>
                      <div className="w-px h-6 bg-[#EAE7E0]"></div>
                      <div className="flex flex-col gap-0.5 items-center">
                        <span className="text-[9px] font-display font-bold text-[#6B655C] uppercase tracking-wider">Overtime</span>
                        <span className="font-bold text-emerald-700">+{pay.overtimeHours.toFixed(1)}h</span>
                      </div>
                      <div className="w-px h-6 bg-[#EAE7E0]"></div>
                      <div className="flex flex-col gap-0.5 items-end">
                        <span className="text-[9px] font-display font-bold text-[#6B655C] uppercase tracking-wider">Days</span>
                        <span className="font-bold text-[#1F2B4D]">{pay.payableDays}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 w-full pt-1">
                      <button 
                        onClick={() => setSelectedPayslip(pay)}
                        className="flex-1 inline-flex items-center justify-center gap-1 text-[10px] font-display font-bold text-[#1F2B4D] bg-white border border-[#EAE7E0] py-1.5 rounded-lg shadow-2xs"
                      >
                        <Eye size={11} /> View Breakup
                      </button>
                      <button 
                        onClick={() => downloadPdf(pay.id, pay.month)}
                        className="flex-1 inline-flex items-center justify-center gap-1 text-[10px] font-display font-bold text-[#1F2B4D] bg-white border border-[#EAE7E0] py-1.5 rounded-lg shadow-2xs"
                      >
                        <Download size={11} /> PDF
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1F2B4D]/30 backdrop-blur-xs p-3 sm:p-4">
          <div className="bg-white rounded-2xl border border-[#EAE7E0] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 sm:p-5 border-b border-[#EAE7E0]">
              <h2 className="font-serif font-bold text-base sm:text-xl text-[#1F2B4D]">Salary Breakup: {selectedPayslip.month}</h2>
              <button 
                onClick={() => setSelectedPayslip(null)} 
                className="p-1.5 rounded-lg bg-[#FAF8F5] border border-[#EAE7E0] text-[#6B655C] hover:text-[#1F2B4D] transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs bg-[#FAF8F5] p-3 rounded-xl border border-[#EAE7E0]">
                <div><span className="text-[#6B655C] font-bold">Employee:</span> <span className="text-[#1F2B4D] font-bold">{selectedPayslip.user?.displayName || 'N/A'}</span></div>
                <div><span className="text-[#6B655C] font-bold">Days Payable:</span> <span className="text-[#1F2B4D] font-bold">{selectedPayslip.payableDays}</span></div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-display font-bold text-[#6B655C] text-[10px] uppercase tracking-wider mb-2 pb-1 border-b border-[#EAE7E0]">Earnings</h4>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between"><span className="text-[#6B655C]">Basic</span><span className="text-[#1F2B4D] font-mono font-bold">₹{selectedPayslip.basicSalary}</span></div>
                    <div className="flex justify-between"><span className="text-[#6B655C]">HRA</span><span className="text-[#1F2B4D] font-mono font-bold">₹{selectedPayslip.hra}</span></div>
                    <div className="flex justify-between"><span className="text-[#6B655C]">Std Allowance</span><span className="text-[#1F2B4D] font-mono font-bold">₹{selectedPayslip.standardAllowance}</span></div>
                    <div className="flex justify-between"><span className="text-[#6B655C]">Fixed Allowance</span><span className="text-[#1F2B4D] font-mono font-bold">₹{selectedPayslip.fixedAllowance}</span></div>
                    <div className="flex justify-between"><span className="text-[#6B655C]">Bonus</span><span className="text-[#1F2B4D] font-mono font-bold">₹{selectedPayslip.performanceBonus}</span></div>
                    <div className="flex justify-between"><span className="text-[#6B655C]">LTA</span><span className="text-[#1F2B4D] font-mono font-bold">₹{selectedPayslip.lta}</span></div>
                    <div className="flex justify-between font-bold mt-2 pt-2 border-t border-[#EAE7E0] text-[#1F2B4D]"><span>Gross Salary</span><span className="font-mono">₹{selectedPayslip.grossSalary}</span></div>
                  </div>
                </div>
                <div>
                  <h4 className="font-display font-bold text-[#6B655C] text-[10px] uppercase tracking-wider mb-2 pb-1 border-b border-[#EAE7E0]">Deductions</h4>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between"><span className="text-[#6B655C]">PF (Employee)</span><span className="text-[#1F2B4D] font-mono font-bold">₹{selectedPayslip.pfEmployee}</span></div>
                    <div className="flex justify-between"><span className="text-[#6B655C]">Professional Tax</span><span className="text-[#1F2B4D] font-mono font-bold">₹{selectedPayslip.professionalTax}</span></div>
                    {selectedPayslip.advanceDeduction > 0 && (
                      <div className="flex justify-between text-rose-700"><span className="font-bold">Advance Recovery</span><span className="font-mono font-bold">₹{selectedPayslip.advanceDeduction}</span></div>
                    )}
                    <div className="flex justify-between font-bold mt-2 pt-2 border-t border-[#EAE7E0] text-[#1F2B4D]"><span>Total Deductions</span><span className="font-mono">₹{selectedPayslip.pfEmployee + selectedPayslip.professionalTax + (selectedPayslip.advanceDeduction || 0)}</span></div>
                  </div>
                  <h4 className="font-display font-bold text-[#6B655C] text-[10px] uppercase tracking-wider mb-2 pb-1 border-b border-[#EAE7E0] mt-4">Employer Contributions</h4>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between"><span className="text-[#6B655C]">PF (Employer)</span><span className="text-[#1F2B4D] font-mono font-bold">₹{selectedPayslip.pfEmployer}</span></div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#EAE7E0] flex justify-between items-center bg-[#FAF8F5] p-3.5 rounded-xl border border-[#EAE7E0]">
                <span className="font-display font-bold text-[#6B655C] uppercase tracking-wider text-[10px]">Net Take Home</span>
                <span className="text-xl sm:text-2xl font-bold font-mono text-emerald-800">₹{selectedPayslip.netSalary}</span>
              </div>

              {/* Compliance Breakdown Section */}
              {(selectedPayslip.bonusBreakdown?.length > 0 || selectedPayslip.deductionBreakdown?.length > 0) && (
                <div className="mt-4 pt-3 border-t border-[#EAE7E0]">
                  <h4 className="font-display font-bold text-[#6B655C] mb-3 text-[10px] uppercase tracking-wider">Attendance Compliance Details</h4>
                  <div className="space-y-3">
                    {/* Overtime Group */}
                    {selectedPayslip.bonusBreakdown?.length > 0 && (
                      <div className="bg-[#FAF8F5] p-3 rounded-xl border border-[#EAE7E0]">
                        <span className="text-[9px] font-display font-bold text-emerald-800 block mb-2 uppercase tracking-wider">Overtime (OT)</span>
                        <div className="space-y-1 max-h-28 overflow-y-auto [&::-webkit-scrollbar]:hidden">
                          {selectedPayslip.bonusBreakdown.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-xs text-[#6B655C] font-medium">
                              <span>{item.date}: {item.hours} hrs</span>
                              <span className="text-emerald-700 font-bold">+₹{item.amount}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Late Arrivals Group */}
                    {selectedPayslip.deductionBreakdown?.filter(d => d.type === 'late_arrival').length > 0 && (
                      <div className="bg-[#FAF8F5] p-3 rounded-xl border border-[#EAE7E0]">
                        <span className="text-[9px] font-display font-bold text-amber-800 block mb-2 uppercase tracking-wider">Late Arrivals</span>
                        <div className="space-y-1 max-h-28 overflow-y-auto [&::-webkit-scrollbar]:hidden">
                          {selectedPayslip.deductionBreakdown.filter(d => d.type === 'late_arrival').map((item, idx) => (
                            <div key={idx} className="flex justify-between text-xs text-[#6B655C] font-medium">
                              <span>{item.date}: {item.minutes} min late</span>
                              <span className="text-rose-700 font-bold">-₹{item.amount}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Early Departures Group */}
                    {selectedPayslip.deductionBreakdown?.filter(d => d.type === 'early_departure').length > 0 && (
                      <div className="bg-[#FAF8F5] p-3 rounded-xl border border-[#EAE7E0]">
                        <span className="text-[9px] font-display font-bold text-rose-800 block mb-2 uppercase tracking-wider">Early Departures</span>
                        <div className="space-y-1 max-h-28 overflow-y-auto [&::-webkit-scrollbar]:hidden">
                          {selectedPayslip.deductionBreakdown.filter(d => d.type === 'early_departure').map((item, idx) => (
                            <div key={idx} className="flex justify-between text-xs text-[#6B655C] font-medium">
                              <span>{item.date}: {item.minutes} min early</span>
                              <span className="text-rose-700 font-bold">-₹{item.amount}</span>
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
