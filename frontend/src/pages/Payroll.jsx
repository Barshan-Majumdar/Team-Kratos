import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { FileText, IndianRupee, Download, PlusCircle, Eye, X } from 'lucide-react';
import { API_BASE } from '../lib/api';
import Alert from '../components/ui/Alert';

const Payroll = ({ user }) => {
  const [loading, setLoading] = useState(false);
  const [payrolls, setPayrolls] = useState([]);
  const [advances, setAdvances] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // Advance form state
  const [advanceAmt, setAdvanceAmt] = useState('');
  const [advanceReason, setAdvanceReason] = useState('');
  const [advanceMonth, setAdvanceMonth] = useState('2026-07');
  
  const isAdmin = user?.role === 'Admin';
  const [genMonth, setGenMonth] = useState('2026-07');
  const [filterMonth, setFilterMonth] = useState('');
  const [selectedPayslip, setSelectedPayslip] = useState(null);

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
    fetchPayrolls();
    fetchAdvances();
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
    
    // Optimistic UI Update for instant feedback
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
      fetchAdvances();
      setSuccessMsg(`Advance ${status.toLowerCase()} successfully!`);
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
      setSuccessMsg(`Successfully payed to all employees!`);
      fetchPayrolls();
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

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 md:space-y-8">
      <h1 className="text-3xl font-bold text-slate-800">Payroll & Compensation</h1>

      {errorMsg && <Alert type="error" message={errorMsg} />}
      {successMsg && <Alert type="success" message={successMsg} />}

      {isAdmin && (
        <Card className="p-6 bg-gradient-to-br from-indigo-50 to-white border-indigo-100 shadow-indigo-100/50">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-indigo-900 mb-1">Generate Monthly Payroll</h2>
              <p className="text-slate-500 text-sm mb-4 md:mb-0">Automatically calculates based on Base Salary, active attendance, and approved advances.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center w-full md:w-auto">
              <Input type="month" value={genMonth} onChange={(e) => setGenMonth(e.target.value)} className="w-full sm:w-48 bg-white" />
              <Button onClick={handleGeneratePayroll} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white whitespace-nowrap justify-center w-full sm:w-auto">
                {loading ? 'Processing...' : 'Run Payroll Engine'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Salary Advance Request (Employee) */}
        {!isAdmin && (
          <Card className="p-6 lg:col-span-1">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <IndianRupee size={20} className="text-emerald-500" /> Request Advance
            </h3>
            <p className="text-xs text-slate-500 mb-4">Advances will be automatically deducted from your selected month's payslip.</p>
            <form onSubmit={handleRequestAdvance} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Amount (₹)</label>
                <input type="number" required value={advanceAmt} onChange={e => setAdvanceAmt(e.target.value)} className="w-full p-2 border rounded-md focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Deduction Month</label>
                <input type="month" required value={advanceMonth} onChange={e => setAdvanceMonth(e.target.value)} className="w-full p-2 border rounded-md focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Reason</label>
                <input type="text" required value={advanceReason} onChange={e => setAdvanceReason(e.target.value)} className="w-full p-2 border rounded-md focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                Submit Request
              </Button>
            </form>
          </Card>
        )}

        {/* Salary Advances Approval (Admin) */}
        {isAdmin && (
          <Card className="p-6 lg:col-span-1">
            <h3 className="text-xl font-bold mb-4">Pending Advances</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
              {advances.filter(a => a.status === 'Pending').length === 0 ? <p className="text-slate-500">No pending advances.</p> : null}
              {advances.filter(a => a.status === 'Pending').map(adv => (
                <div key={adv.id} className="border border-slate-100 p-4 rounded-xl">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-bold text-slate-800">{adv.user?.displayName}</p>
                      <p className="text-xs text-slate-500">Deduct: {adv.monthDeduction}</p>
                    </div>
                    <p className="font-bold text-emerald-600">₹{adv.amount}</p>
                  </div>
                  <p className="text-sm text-slate-600 italic mb-3">"{adv.reason}"</p>
                  <div className="flex gap-2">
                    <button onClick={() => handleAdvanceStatus(adv.id, 'Approved')} className="flex-1 text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 py-1.5 rounded transition-colors">Approve</button>
                    <button onClick={() => handleAdvanceStatus(adv.id, 'Rejected')} className="flex-1 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 py-1.5 rounded transition-colors">Reject</button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Payslips Table */}
        <Card className="p-6 lg:col-span-2">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <FileText size={20} className="text-slate-500" /> {isAdmin ? 'All Generated Payslips' : 'My Payslips'}
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-500">Month of Pay:</span>
              <input 
                type="month" 
                value={filterMonth} 
                onChange={(e) => setFilterMonth(e.target.value)} 
                className="p-1.5 border border-slate-200 rounded-md text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
              />
              {filterMonth && (
                <button onClick={() => setFilterMonth('')} className="text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors">
                  Clear
                </button>
              )}
            </div>
          </div>
          <div className="hidden md:block overflow-x-auto custom-scrollbar">
            <table className="w-full text-left min-w-[600px]">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="pb-3 text-sm font-bold text-slate-400">Month</th>
                  {isAdmin && <th className="pb-3 text-sm font-bold text-slate-400">Employee</th>}
                  <th className="pb-3 text-sm font-bold text-slate-400">Days Present</th>
                  <th className="pb-3 text-sm font-bold text-slate-400">Gross</th>
                  <th className="pb-3 text-sm font-bold text-slate-400">Net Pay</th>
                  <th className="pb-3 text-sm font-bold text-slate-400 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {payrolls.filter(pay => !filterMonth || pay.month === filterMonth).length === 0 ? (
                  <tr><td colSpan="6" className="py-4 text-center text-slate-500">No payslips found.</td></tr>
                ) : (
                  payrolls.filter(pay => !filterMonth || pay.month === filterMonth).map(pay => (
                    <tr key={pay.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 font-semibold text-slate-800">{pay.month}</td>
                      {isAdmin && <td className="py-3 text-sm text-slate-600">{pay.user?.displayName}</td>}
                      <td className="py-3 text-sm text-slate-600">{pay.payableDays} days</td>
                      <td className="py-3 text-sm text-slate-600">₹{pay.grossSalary.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                      <td className="py-3 font-bold text-emerald-600">₹{pay.netSalary.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                      <td className="py-3 text-right">
                        <button 
                          onClick={() => setSelectedPayslip(pay)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-indigo-600 transition-colors px-2 py-1 rounded mr-2"
                        >
                          <Eye size={14} /> View
                        </button>
                        <button 
                          onClick={() => downloadPdf(pay.id, pay.month)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-indigo-600 transition-colors px-2 py-1 rounded"
                        >
                          <Download size={14} /> PDF
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
              <div className="py-4 text-center text-sm text-slate-500">No payslips found.</div>
            ) : (
              payrolls.filter(pay => !filterMonth || pay.month === filterMonth).map(pay => (
                <div key={pay.id} className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm flex flex-col gap-3 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-indigo-400"></div>
                  
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-800 text-lg">{pay.month}</span>
                      {isAdmin && <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">{pay.user?.displayName}</span>}
                    </div>
                    <span className="font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100 text-sm">
                      ₹{pay.netSalary.toLocaleString(undefined, {minimumFractionDigits: 2})}
                    </span>
                  </div>
                  
                  <div className="bg-slate-50 rounded-lg p-3 flex justify-between items-center text-sm border border-slate-100 mt-1">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gross Salary</span>
                      <span className="font-semibold text-slate-700">₹{pay.grossSalary.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                    </div>
                    <div className="w-px h-8 bg-slate-200/60"></div>
                    <div className="flex flex-col gap-1 items-end">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Days Present</span>
                      <span className="font-semibold text-slate-700">{pay.payableDays}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 w-full mt-2">
                    <button 
                      onClick={() => setSelectedPayslip(pay)}
                      className="flex-1 flex items-center justify-center gap-1.5 text-[11px] sm:text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 py-2.5 rounded-lg transition-colors border border-indigo-100 shadow-sm"
                    >
                      <Eye size={14} /> View Breakup
                    </button>
                    <button 
                      onClick={() => downloadPdf(pay.id, pay.month)}
                      className="flex-1 flex items-center justify-center gap-1.5 text-[11px] sm:text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 py-2.5 rounded-lg transition-colors border border-slate-200 shadow-sm"
                    >
                      <Download size={14} /> Download PDF
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

      </div>

      {/* Payslip Modal */}
      {selectedPayslip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">Salary Breakup: {selectedPayslip.month}</h2>
              <button onClick={() => setSelectedPayslip(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                <div><span className="text-slate-500 font-semibold">Employee:</span> {selectedPayslip.user?.displayName || 'N/A'}</div>
                <div><span className="text-slate-500 font-semibold">Days Payable:</span> {selectedPayslip.payableDays}</div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-bold text-slate-700 mb-2 border-b pb-1">Earnings</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between"><span>Basic</span><span>₹{selectedPayslip.basicSalary}</span></div>
                    <div className="flex justify-between"><span>HRA</span><span>₹{selectedPayslip.hra}</span></div>
                    <div className="flex justify-between"><span>Std Allowance</span><span>₹{selectedPayslip.standardAllowance}</span></div>
                    <div className="flex justify-between"><span>Fixed Allowance</span><span>₹{selectedPayslip.fixedAllowance}</span></div>
                    <div className="flex justify-between"><span>Bonus</span><span>₹{selectedPayslip.performanceBonus}</span></div>
                    <div className="flex justify-between"><span>LTA</span><span>₹{selectedPayslip.lta}</span></div>
                    <div className="flex justify-between font-bold mt-2 pt-2 border-t text-slate-800"><span>Gross Salary</span><span>₹{selectedPayslip.grossSalary}</span></div>
                  </div>
                </div>
                <div>
                  <h4 className="font-bold text-slate-700 mb-2 border-b pb-1">Deductions</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between"><span>PF (Employee)</span><span>₹{selectedPayslip.pfEmployee}</span></div>
                    <div className="flex justify-between"><span>Professional Tax</span><span>₹{selectedPayslip.professionalTax}</span></div>
                    <div className="flex justify-between font-bold mt-2 pt-2 border-t text-slate-800"><span>Total Deductions</span><span>₹{selectedPayslip.pfEmployee + selectedPayslip.professionalTax}</span></div>
                  </div>
                  <h4 className="font-bold text-slate-700 mb-2 border-b pb-1 mt-4">Employer Contributions</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between"><span>PF (Employer)</span><span>₹{selectedPayslip.pfEmployer}</span></div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-200 flex justify-between items-center bg-indigo-50 p-4 rounded-lg">
                <span className="font-bold text-slate-700 uppercase tracking-wider">Net Take Home</span>
                <span className="text-2xl font-black text-indigo-700">₹{selectedPayslip.netSalary}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payroll;
