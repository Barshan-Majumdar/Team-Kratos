import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
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
  TrendingUp,
  Info,
  Mail,
  Inbox
} from 'lucide-react';
import { Skeleton } from '../components/ui/Skeleton';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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

  // Email Box View State
  const [viewingEmailAdvance, setViewingEmailAdvance] = useState(null);

  const isAdminOrManager = user?.roleDefinition?.level <= 2 || user?.role === 'Admin' || user?.role === 'CEO' || user?.role === 'Manager' || user?.customRole === 'SuperAdmin';

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

      setStatusMsg({ type: 'success', text: `Salary advance request for ₹${numAmt.toLocaleString()} submitted successfully!` });
      setAmount('');
      setReason('');

      // Optimistically insert new request into local state immediately
      setMyAdvances(prev => [data, ...prev]);
      if (isAdminOrManager) {
        setAdvances(prev => [data, ...prev]);
      }
      fetchAdvances();
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  // Admin Update Status (Approve / Reject)
  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAdvance || !actionType) return;

    const targetId = selectedAdvance.id;
    const newStatus = actionType;

    // Optimistically update local state immediately
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
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update status');
      }

      fetchAdvances();
    } catch (err) {
      alert(err.message);
      fetchAdvances();
    } finally {
      setActionLoading(false);
    }
  };

  // Helper Badge Colors & Text
  const getStatusBadge = (status) => {
    switch (status) {
      case 'Approved':
        return <span className="px-2.5 py-1 text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full flex items-center gap-1 w-fit"><CheckCircle size={12} /> Approved</span>;
      case 'Rejected':
        return <span className="px-2.5 py-1 text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 rounded-full flex items-center gap-1 w-fit"><XCircle size={12} /> Rejected</span>;
      case 'Deducted':
        return <span className="px-2.5 py-1 text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full flex items-center gap-1 w-fit"><Check size={12} /> Deducted from Payroll</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 rounded-full flex items-center gap-1 w-fit"><Clock size={12} /> Pending Review</span>;
    }
  };

  const getRiskBadge = (score, label) => {
    if (score === undefined || score === null) return null;
    let colorClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    let icon = '🟢';
    if (label === 'HIGH' || score >= 70) {
      colorClass = 'bg-rose-50 text-rose-700 border-rose-200';
      icon = '🔴';
    } else if (label === 'MEDIUM' || score >= 35) {
      colorClass = 'bg-amber-50 text-amber-700 border-amber-200';
      icon = '🟡';
    }

    return (
      <span className={`px-2.5 py-1 text-xs font-bold border rounded-full flex items-center gap-1 w-fit ${colorClass}`}>
        <span>{icon}</span> {label || 'RISK'} ({score}%)
      </span>
    );
  };

  const getRecommendationText = (score, label) => {
    if (label === 'HIGH' || score >= 70) return 'Review Carefully (High Risk)';
    if (label === 'MEDIUM' || score >= 35) return 'Review History (Moderate Risk)';
    return 'Approve (Low Risk)';
  };

  const filteredAdminAdvances = advances.filter(a => {
    if (!statusFilter) return true;
    return a.status === statusFilter;
  });

  return (
    <div className="p-4 md:p-8 lg:p-12 max-w-7xl mx-auto space-y-8">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
            <IndianRupee className="text-emerald-500" size={36} /> Salary Advance Portal
          </h1>
          <p className="text-slate-500 mt-1 text-sm md:text-base">
            Request salary advances and manage automated payroll deduction workflows.
          </p>
        </div>
        <Button onClick={fetchAdvances} variant="outline" className="rounded-full gap-2 text-sm font-semibold shrink-0">
          <RefreshCw size={16} /> Refresh
        </Button>
      </div>

      {/* Admin KPI Summary Bar */}
      {isAdminOrManager && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-5 bg-gradient-to-br from-amber-50/60 to-white border-slate-200/60 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Pending Approval</span>
            <span className="text-3xl font-extrabold text-amber-700">{advances.filter(a => a.status === 'Pending').length}</span>
          </Card>
          <Card className="p-5 bg-gradient-to-br from-rose-50/60 to-white border-slate-200/60 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">High Risk Requests</span>
            <span className="text-3xl font-extrabold text-rose-600">{advances.filter(a => a.status === 'Pending' && (a.riskLabel === 'HIGH' || a.riskScore >= 70)).length}</span>
          </Card>
          <Card className="p-5 bg-gradient-to-br from-emerald-50/60 to-white border-slate-200/60 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Approved (Awaiting Payroll)</span>
            <span className="text-3xl font-extrabold text-emerald-700">{advances.filter(a => a.status === 'Approved').length}</span>
          </Card>
          <Card className="p-5 bg-gradient-to-br from-indigo-50/60 to-white border-slate-200/60 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Deducted from Payroll</span>
            <span className="text-3xl font-extrabold text-indigo-900">{advances.filter(a => a.status === 'Deducted').length}</span>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Request Form (Employee) */}
        <Card className="p-6 lg:col-span-1 border-slate-200/60 shadow-sm h-fit">
          <h2 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2">
            <Send size={20} className="text-emerald-500" /> Request Salary Advance
          </h2>
          <p className="text-xs text-slate-500 mb-6">
            Approved advances are automatically deducted from your salary in your selected month's payslip.
          </p>

          {statusMsg.text && (
            <div className={`p-3 rounded-lg text-xs font-semibold mb-4 flex items-center gap-2 ${statusMsg.type === 'error' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
              {statusMsg.type === 'error' ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
              <span>{statusMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleRequestSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Amount (₹)
              </label>
              <Input
                type="number"
                step="any"
                placeholder="e.g. 15000"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Deduction Month
              </label>
              <Input
                type="month"
                required
                value={monthDeduction}
                onChange={(e) => setMonthDeduction(e.target.value)}
                className="w-full"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Reason / Justification
              </label>
              <textarea
                rows={3}
                required
                placeholder="e.g. Medical emergency"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full text-sm font-medium border border-slate-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none"
              />
            </div>

            <Button 
              type="submit" 
              disabled={submitting} 
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {submitting ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
              {submitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          </form>
        </Card>

        {/* My Advance History (Employee) */}
        <Card className="p-6 lg:col-span-2 border-slate-200/60 shadow-sm flex flex-col">
          <h2 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2">
            <FileText size={20} className="text-indigo-500" /> My Advance Requests
          </h2>
          <p className="text-xs text-slate-500 mb-6">
            Track the status of your requested salary advances.
          </p>

          <div className="overflow-x-auto custom-scrollbar flex-1">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200/60">
                <tr>
                  <th className="p-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Amount</th>
                  <th className="p-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Deduction Month</th>
                  <th className="p-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Reason</th>
                  <th className="p-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Requested On</th>
                  <th className="p-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="p-3"><Skeleton className="h-4 w-20" /></td>
                      <td className="p-3"><Skeleton className="h-4 w-24" /></td>
                      <td className="p-3"><Skeleton className="h-4 w-36" /></td>
                      <td className="p-3"><Skeleton className="h-4 w-24" /></td>
                      <td className="p-3 text-right"><Skeleton className="h-6 w-16 ml-auto rounded-full" /></td>
                    </tr>
                  ))
                ) : myAdvances.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-slate-400 text-sm">
                      No salary advance requests found.
                    </td>
                  </tr>
                ) : (
                  myAdvances.map(adv => (
                    <tr key={adv.id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-bold text-slate-800 text-sm">
                        ₹{adv.amount.toLocaleString()}
                      </td>
                      <td className="p-3 text-sm font-semibold text-slate-600">
                        {adv.monthDeduction}
                      </td>
                      <td className="p-3 text-sm text-slate-600 max-w-xs truncate" title={adv.reason}>
                        {adv.reason}
                      </td>
                      <td className="p-3 text-xs text-slate-400">
                        {new Date(adv.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end">{getStatusBadge(adv.status)}</div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Admin Review & Approval Queue Section */}
      {isAdminOrManager && (
        <Card className="p-6 border-slate-200/60 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200/60 pb-4">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                <ShieldAlert className="text-indigo-600" size={24} /> Admin Approval & Risk Audit Queue
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Evaluate predictive risk scores and approve or reject salary advance requests across your organisation.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Filter:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="Pending">Pending Review</option>
                <option value="Approved">Approved (Pending Settlement)</option>
                <option value="Deducted">Deducted from Payroll</option>
                <option value="Rejected">Rejected</option>
                <option value="">All Advances</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left min-w-[900px]">
              <thead className="bg-slate-50 border-b border-slate-200/60">
                <tr>
                  <th className="p-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Employee</th>
                  <th className="p-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Amount & Month</th>
                  <th className="p-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Risk Evaluation</th>
                  <th className="p-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Recommendation</th>
                  <th className="p-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="p-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="p-3"><div className="flex items-center gap-3"><Skeleton className="h-9 w-9 rounded-full" /><div className="space-y-1"><Skeleton className="h-4 w-28" /><Skeleton className="h-3 w-16" /></div></div></td>
                      <td className="p-3"><Skeleton className="h-4 w-20" /><Skeleton className="h-3 w-24 mt-1" /></td>
                      <td className="p-3"><Skeleton className="h-6 w-24 rounded-full" /></td>
                      <td className="p-3"><Skeleton className="h-4 w-32" /></td>
                      <td className="p-3"><Skeleton className="h-6 w-16 rounded-full" /></td>
                      <td className="p-3 text-right"><Skeleton className="h-8 w-24 ml-auto rounded-lg" /></td>
                    </tr>
                  ))
                ) : filteredAdminAdvances.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-12 text-center text-slate-400 text-sm">
                      No salary advances match the selected filter ({statusFilter || 'All'}).
                    </td>
                  </tr>
                ) : (
                  filteredAdminAdvances.map(adv => (
                    <tr key={adv.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-600 overflow-hidden shrink-0">
                            {adv.user?.avatar ? <img src={adv.user.avatar} alt="User" className="w-full h-full object-cover" /> : <UserIcon size={14} />}
                          </div>
                          <div>
                            <span className="font-bold text-slate-800 text-sm block">{adv.user?.displayName || 'Unknown Employee'}</span>
                            <span className="text-xs text-slate-400 block">ID: {adv.user?.employeeId || 'N/A'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="font-extrabold text-slate-800 text-sm block">₹{adv.amount.toLocaleString()}</span>
                        <span className="text-xs text-slate-500 block">Deduction: {adv.monthDeduction}</span>
                      </td>
                      <td className="p-3">
                        {getRiskBadge(adv.riskScore, adv.riskLabel)}
                        {!!(adv.user?.baseSalary && adv.user.baseSalary > 0) && (
                          <span className="text-[11px] text-slate-400 block mt-1">
                            Ratio: {((adv.amount / adv.user.baseSalary) * 100).toFixed(1)}% of salary
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-xs font-semibold text-slate-600">
                        {getRecommendationText(adv.riskScore, adv.riskLabel)}
                      </td>
                      <td className="p-3">
                        {getStatusBadge(adv.status)}
                      </td>
                      <td className="p-3 text-right">
                        {adv.status === 'Pending' ? (
                          <div className="flex justify-end gap-2">
                            <Button
                              onClick={() => { setSelectedAdvance(adv); setActionType('Approved'); }}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1"
                            >
                              <Check size={14} /> Approve
                            </Button>
                            <Button
                              onClick={() => { setSelectedAdvance(adv); setActionType('Rejected'); }}
                              className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1"
                            >
                              <X size={14} /> Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">No action required</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Auditor Decision Dialog */}
      {selectedAdvance && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6 bg-white shadow-xl rounded-2xl space-y-4">
            <h3 className="text-xl font-bold text-slate-800">
              {actionType === 'Approved' ? 'Confirm Salary Advance Approval' : 'Reject Salary Advance Request'}
            </h3>
            <p className="text-sm text-slate-500">
              {actionType === 'Approved' 
                ? `You are approving an advance of ₹${selectedAdvance.amount.toLocaleString()} for ${selectedAdvance.user?.displayName || 'the employee'}. This amount will be deducted during ${selectedAdvance.monthDeduction} payroll.` 
                : `You are rejecting the salary advance request for ${selectedAdvance.user?.displayName || 'the employee'}.`}
            </p>

            <form onSubmit={handleStatusSubmit} className="space-y-4 pt-2">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Auditor Notes / Comments
                </label>
                <textarea
                  rows={3}
                  placeholder="Enter audit rationale..."
                  value={auditorComments}
                  onChange={(e) => setAuditorComments(e.target.value)}
                  className="w-full text-sm font-medium border border-slate-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  onClick={() => { setSelectedAdvance(null); setActionType(''); }}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-2"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={actionLoading}
                  className={actionType === 'Approved' ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2' : 'bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 py-2'}
                >
                  {actionLoading ? 'Processing...' : `Confirm ${actionType}`}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

export default SalaryAdvance;
