import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';
import { 
  Wallet, 
  Plus, 
  FileText, 
  DollarSign, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Send, 
  Eye, 
  RotateCcw, 
  ShieldAlert, 
  CheckCheck, 
  Filter, 
  Download,
  AlertTriangle,
  Info,
  X,
  Upload
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format, formatDistanceToNow } from 'date-fns';
import { io } from 'socket.io-client';

const CATEGORIES = ['Travel', 'Meals', 'Supplies', 'Software', 'Utilities', 'Training', 'Other'];

const ExpenseManagement = ({ user }) => {
  const [activeTab, setActiveTab] = useState('my-claims'); // 'my-claims' | 'approvals'
  const [approvalSubTab, setApprovalSubTab] = useState('PENDING'); // 'PENDING' | 'APPROVED' | 'SETTLED' | 'REJECTED'
  
  const [myClaims, setMyClaims] = useState([]);
  const [allClaims, setAllClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isResubmitModalOpen, setIsResubmitModalOpen] = useState(false);
  const [selectedClaimForResubmit, setSelectedClaimForResubmit] = useState(null);
  const [selectedReceipt, setSelectedReceipt] = useState(null); // { claimId, mimeType, fileName }
  
  const [selectedClaimForAction, setSelectedClaimForAction] = useState(null); // { claim, action: 'approve'|'reject'|'unapprove' }
  const [adminRemarks, setAdminRemarks] = useState('');
  const [selectedBatchClaimIds, setSelectedBatchClaimIds] = useState([]);

  const [formData, setFormData] = useState({
    title: '',
    category: 'Other',
    amount: '',
    currency: 'INR',
    date: format(new Date(), 'yyyy-MM-dd'),
    description: '',
    receipt: null
  });
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [receiptBlobUrl, setReceiptBlobUrl] = useState(null);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [receiptError, setReceiptError] = useState(null);

  const isAdmin = user?.roleDefinition?.level <= 1 || user?.role === 'Admin' || user?.role === 'SuperAdmin';
  const isManager = user?.roleDefinition?.level <= 2 || user?.role === 'Manager' || isAdmin;

  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const fetchClaims = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) return;

      // 1. Fetch employee's own claims
      const myRes = await fetch(`${apiBase}/api/expenses/my`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (myRes.ok) {
        const myData = await myRes.json();
        setMyClaims(Array.isArray(myData) ? myData : []);
      }

      // 2. Fetch queue if user is Manager or Admin
      if (isManager) {
        const allRes = await fetch(`${apiBase}/api/expenses/all`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (allRes.ok) {
          const allData = await allRes.json();
          setAllClaims(Array.isArray(allData) ? allData : []);
        }
      }
    } catch (err) {
      console.error('Error fetching expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaims();

    // Socket.io Real-time connection
    const socket = io(apiBase, {
      auth: { token: localStorage.getItem('token') }
    });

    socket.on('expense:updated', () => {
      fetchClaims();
      toast.success('Expense status updated in real-time');
    });

    socket.on('expense:settled', ({ count, totalAmount, currency }) => {
      fetchClaims();
      toast.success(`Batch settlement completed: ${count} claims (${currency} ${totalAmount})`);
    });

    return () => {
      socket.disconnect();
    };
  }, [user?.id, isManager]);

  // Authenticated Receipt Fetch to Blob Object URL with AbortController & URL Revocation
  useEffect(() => {
    if (!selectedReceipt) {
      if (receiptBlobUrl) {
        URL.revokeObjectURL(receiptBlobUrl);
        setReceiptBlobUrl(null);
      }
      setReceiptError(null);
      return;
    }

    const controller = new AbortController();
    setReceiptLoading(true);
    setReceiptError(null);

    const token = localStorage.getItem('token');
    fetch(`${apiBase}/api/expenses/${selectedReceipt.claimId}/receipt`, {
      headers: { 'Authorization': `Bearer ${token}` },
      signal: controller.signal
    })
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Failed to load receipt (${res.status})`);
        }
        return res.blob();
      })
      .then((blob) => {
        setReceiptBlobUrl((prevUrl) => {
          if (prevUrl) URL.revokeObjectURL(prevUrl);
          return URL.createObjectURL(blob);
        });
        setReceiptLoading(false);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          console.error('Receipt fetch error:', err);
          setReceiptError(err.message || 'Failed to load receipt');
          setReceiptLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [selectedReceipt]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowed.includes(file.mimetype || file.type)) {
      setFormError('Only images (JPEG, PNG, WebP) and PDF files are allowed');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFormError('File size must not exceed 5MB');
      return;
    }

    setFormError('');
    setFormData({ ...formData, receipt: file });

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => setReceiptPreview(reader.result);
      reader.readAsDataURL(file);
    } else {
      setReceiptPreview('PDF');
    }
  };

  const handleSubmitClaim = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.amount || !formData.date) {
      setFormError('Title, amount, and date are required');
      return;
    }

    setSubmitting(true);
    setFormError('');

    try {
      const token = localStorage.getItem('token');
      const body = new FormData();
      body.append('title', formData.title);
      body.append('category', formData.category);
      body.append('amount', formData.amount);
      body.append('currency', formData.currency);
      body.append('date', formData.date);
      body.append('description', formData.description);
      if (formData.receipt) body.append('receipt', formData.receipt);

      const res = await fetch(`${apiBase}/api/expenses`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit claim');
      }

      setIsSubmitModalOpen(false);
      resetForm();
      toast.success('Expense claim submitted successfully');
      fetchClaims();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResubmitClaim = async (e) => {
    e.preventDefault();
    if (!selectedClaimForResubmit) return;

    setSubmitting(true);
    setFormError('');

    try {
      const token = localStorage.getItem('token');
      const body = new FormData();
      body.append('title', formData.title);
      body.append('category', formData.category);
      body.append('amount', formData.amount);
      body.append('currency', formData.currency);
      body.append('date', formData.date);
      body.append('description', formData.description);
      if (formData.receipt) body.append('receipt', formData.receipt);

      const res = await fetch(`${apiBase}/api/expenses/${selectedClaimForResubmit.id}/resubmit`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
        body
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to resubmit claim');
      }

      setIsResubmitModalOpen(false);
      setSelectedClaimForResubmit(null);
      resetForm();
      toast.success('Claim resubmitted for approval');
      fetchClaims();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleActionConfirm = async () => {
    if (!selectedClaimForAction) return;

    const { claim, action } = selectedClaimForAction;
    const token = localStorage.getItem('token');

    try {
      let endpoint = `${apiBase}/api/expenses/${claim.id}/${action}`;
      let bodyData = action === 'reject' ? { adminRemarks } : {};

      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(bodyData)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `Failed to ${action} claim`);
      }

      setSelectedClaimForAction(null);
      setAdminRemarks('');
      toast.success(`Claim ${action.toUpperCase()} completed successfully`);
      fetchClaims();
    } catch (err) {
      toast.error(err.message || 'Operation failed');
    }
  };

  const handleBatchSettle = async () => {
    if (selectedBatchClaimIds.length === 0) return;

    const token = localStorage.getItem('token');

    try {
      const res = await fetch(`${apiBase}/api/expenses/settle-batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ claimIds: selectedBatchClaimIds })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to settle batch');
      }

      setSelectedBatchClaimIds([]);
      toast.success('Batch reimbursement settled successfully!');
      fetchClaims();
    } catch (err) {
      toast.error(err.message || 'Failed to settle batch');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      category: 'Other',
      amount: '',
      currency: 'INR',
      date: format(new Date(), 'yyyy-MM-dd'),
      description: '',
      receipt: null
    });
    setReceiptPreview(null);
    setFormError('');
  };

  const openResubmitModal = (claim) => {
    setSelectedClaimForResubmit(claim);
    setFormData({
      title: claim.title,
      category: claim.category,
      amount: claim.amount.toString(),
      currency: claim.currency || 'INR',
      date: format(new Date(claim.date), 'yyyy-MM-dd'),
      description: claim.description || '',
      receipt: null
    });
    setIsResubmitModalOpen(true);
  };

  // Metrics Calculations
  const totalSubmittedAmount = myClaims.reduce((sum, c) => sum + Number(c.amount), 0);
  const pendingCount = myClaims.filter(c => c.status === 'PENDING').length;
  const approvedCount = myClaims.filter(c => c.status === 'APPROVED').length;
  const totalSettledAmount = myClaims.filter(c => c.status === 'SETTLED').reduce((sum, c) => sum + Number(c.amount), 0);

  const filteredAllClaims = allClaims.filter(c => c.status === approvalSubTab);

  if (loading) {
    return (
      <div className="p-8 md:p-12 h-full flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
          <p className="text-slate-500 font-medium">Loading Expense Hub...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto min-h-full flex flex-col gap-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2.5">
            <Wallet size={28} className="text-indigo-600" />
            Expense Management & Reimbursement
          </h1>
          <p className="text-slate-500 mt-1 text-sm">Submit receipts, track reimbursement claims, and manage approval queues.</p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => { resetForm(); setIsSubmitModalOpen(true); }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-2 text-sm px-4 py-2 rounded-xl shadow-md shadow-indigo-600/20 flex items-center"
          >
            <Plus size={18} strokeWidth={2.5} /> Submit Expense Claim
          </Button>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab('my-claims')}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'my-claims'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <FileText size={18} /> My Claims ({myClaims.length})
        </button>

        {isManager && (
          <button
            onClick={() => setActiveTab('approvals')}
            className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'approvals'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <CheckCircle size={18} /> Approvals & Settlement Queue ({allClaims.filter(c => c.status === 'PENDING').length} Pending)
          </button>
        )}
      </div>

      {/* TAB 1: MY CLAIMS */}
      {activeTab === 'my-claims' && (
        <div className="space-y-6">
          
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-5 bg-gradient-to-br from-indigo-50 to-indigo-100/50 border-indigo-100 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md">
                <FileText size={22} />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Claims</div>
                <div className="text-2xl font-black text-slate-800">{myClaims.length}</div>
              </div>
            </Card>

            <Card className="p-5 bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-100 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-md">
                <Clock size={22} />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Review</div>
                <div className="text-2xl font-black text-amber-600">{pendingCount}</div>
              </div>
            </Card>

            <Card className="p-5 bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-100 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md">
                <CheckCircle size={22} />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Approved</div>
                <div className="text-2xl font-black text-blue-600">{approvedCount}</div>
              </div>
            </Card>

            <Card className="p-5 bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-100 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md">
                <DollarSign size={22} />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Settled</div>
                <div className="text-xl font-black text-emerald-700">₹{totalSettledAmount.toLocaleString()}</div>
              </div>
            </Card>
          </div>

          {/* Claims List Table */}
          <Card className="p-0 border-slate-200 shadow-sm overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[850px]">
              <thead>
                <tr className="bg-slate-100/70 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                  <th className="p-4">Claim Title & Category</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Receipt</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {myClaims.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                          <Wallet size={28} />
                        </div>
                        <h3 className="text-base font-bold text-slate-800">No Expense Claims Submitted</h3>
                        <p className="text-xs text-slate-400 max-w-sm">
                          You haven't submitted any reimbursement claims yet. Keep track of travel, supplies, and business receipts in one place.
                        </p>
                        <Button
                          onClick={() => { resetForm(); setIsSubmitModalOpen(true); }}
                          className="mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs gap-1.5 px-4 py-2 rounded-xl shadow-md shadow-indigo-600/20"
                        >
                          <Plus size={16} /> Submit Your First Expense Claim
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  myClaims.map((claim) => (
                    <tr key={claim.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-slate-800">{claim.title}</div>
                        <div className="text-xs text-slate-400 flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">{claim.category}</span>
                          {claim.description && <span className="truncate max-w-[250px]">{claim.description}</span>}
                        </div>
                      </td>
                      <td className="p-4 text-xs font-semibold text-slate-600">
                        {format(new Date(claim.date), 'MMM d, yyyy')}
                      </td>
                      <td className="p-4 font-black text-slate-800 text-base">
                        {claim.currency} {Number(claim.amount).toLocaleString()}
                      </td>
                      <td className="p-4">
                        {claim.receiptFileId ? (
                          <button
                            onClick={() => setSelectedReceipt({ claimId: claim.id, mimeType: claim.receiptMimeType, fileName: claim.receiptFileName })}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2.5 py-1 rounded-xl transition-colors"
                          >
                            <Eye size={14} /> View Receipt
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 italic">No receipt</span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                          claim.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                          claim.status === 'APPROVED' ? 'bg-blue-100 text-blue-800' :
                          claim.status === 'SETTLED' ? 'bg-emerald-100 text-emerald-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {claim.status === 'PENDING' && <Clock size={12} />}
                          {claim.status === 'APPROVED' && <CheckCircle size={12} />}
                          {claim.status === 'SETTLED' && <CheckCheck size={12} />}
                          {claim.status === 'REJECTED' && <XCircle size={12} />}
                          {claim.status}
                        </span>
                        {claim.adminRemarks && (
                          <div className="text-[11px] text-red-600 font-medium mt-1">Remarks: {claim.adminRemarks}</div>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        {claim.status === 'REJECTED' && (
                          <Button
                            size="sm"
                            onClick={() => openResubmitModal(claim)}
                            className="gap-1.5 text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white rounded-xl"
                          >
                            <RotateCcw size={14} /> Resubmit
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* TAB 2: APPROVALS & SETTLEMENT QUEUE (MANAGERS & ADMINS) */}
      {activeTab === 'approvals' && isManager && (
        <div className="space-y-6">
          
          {/* Sub-tabs & Batch Settlement Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-2 flex-wrap">
              {['PENDING', 'APPROVED', 'SETTLED', 'REJECTED'].map((st) => {
                const count = allClaims.filter(c => c.status === st).length;
                return (
                  <button
                    key={st}
                    onClick={() => { setApprovalSubTab(st); setSelectedBatchClaimIds([]); }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                      approvalSubTab === st
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <span>{st}</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${approvalSubTab === st ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Batch Settlement Button for Approved Claims */}
            {approvalSubTab === 'APPROVED' && isAdmin && selectedBatchClaimIds.length > 0 && (
              <Button
                onClick={handleBatchSettle}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-2 px-4 py-2 rounded-xl shadow-md shadow-emerald-600/20 animate-in fade-in"
              >
                <CheckCheck size={16} /> Batch Settle ({selectedBatchClaimIds.length}) Claims
              </Button>
            )}
          </div>

          {/* Approvals Table */}
          <Card className="p-0 border-slate-200 shadow-sm overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[950px]">
              <thead>
                <tr className="bg-slate-100/70 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                  {approvalSubTab === 'APPROVED' && isAdmin && (
                    <th className="p-4 w-10">
                      <input
                        type="checkbox"
                        checked={selectedBatchClaimIds.length > 0 && selectedBatchClaimIds.length === filteredAllClaims.length}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedBatchClaimIds(filteredAllClaims.map(c => c.id));
                          else setSelectedBatchClaimIds([]);
                        }}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </th>
                  )}
                  <th className="p-4">Employee</th>
                  <th className="p-4">Claim Details</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Receipt</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredAllClaims.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 font-medium">No claims in '{approvalSubTab}' status.</td>
                  </tr>
                ) : (
                  filteredAllClaims.map((claim) => {
                    const isSelfClaim = claim.userId === user?.id;

                    return (
                      <tr key={claim.id} className="hover:bg-slate-50/50 transition-colors">
                        {approvalSubTab === 'APPROVED' && isAdmin && (
                          <td className="p-4">
                            <input
                              type="checkbox"
                              checked={selectedBatchClaimIds.includes(claim.id)}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedBatchClaimIds(prev => [...prev, claim.id]);
                                else setSelectedBatchClaimIds(prev => prev.filter(id => id !== claim.id));
                              }}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                          </td>
                        )}

                        <td className="p-4">
                          <div className="flex items-center gap-2.5">
                            <Avatar src={claim.user?.avatar} name={claim.user?.displayName} className="w-8 h-8 rounded-full shrink-0" />
                            <div>
                              <div className="font-bold text-slate-800 text-xs">{claim.user?.displayName}</div>
                              <div className="text-[11px] text-slate-400">{claim.user?.department || 'Team'}</div>
                            </div>
                          </div>
                        </td>

                        <td className="p-4">
                          <div className="font-bold text-slate-800">{claim.title}</div>
                          <div className="text-xs text-slate-500 flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">{claim.category}</span>
                            <span>{format(new Date(claim.date), 'MMM d, yyyy')}</span>
                          </div>
                        </td>

                        <td className="p-4 font-black text-slate-800 text-base">
                          {claim.currency} {Number(claim.amount).toLocaleString()}
                        </td>

                        <td className="p-4">
                          {claim.receiptFileId ? (
                            <button
                              onClick={() => setSelectedReceipt({ claimId: claim.id, mimeType: claim.receiptMimeType, fileName: claim.receiptFileName })}
                              className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2.5 py-1 rounded-xl transition-colors"
                            >
                              <Eye size={14} /> Receipt
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400 italic">None</span>
                          )}
                        </td>

                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            claim.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                            claim.status === 'APPROVED' ? 'bg-blue-100 text-blue-800' :
                            claim.status === 'SETTLED' ? 'bg-emerald-100 text-emerald-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {claim.status}
                          </span>
                        </td>

                        <td className="p-4 text-right">
                          {claim.status === 'PENDING' && (
                            <div className="flex items-center justify-end gap-2">
                              {isSelfClaim ? (
                                <span className="text-xs font-semibold text-slate-400 italic" title="Self-approval blocked. Forwarded to superior manager.">
                                  Forwarded (Self-claim)
                                </span>
                              ) : (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => setSelectedClaimForAction({ claim, action: 'approve' })}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl px-3 py-1"
                                  >
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setSelectedClaimForAction({ claim, action: 'reject' })}
                                    className="text-red-600 hover:bg-red-50 border-red-200 font-bold text-xs rounded-xl px-3 py-1"
                                  >
                                    Reject
                                  </Button>
                                </>
                              )}
                            </div>
                          )}

                          {claim.status === 'APPROVED' && isAdmin && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedClaimForAction({ claim, action: 'unapprove' })}
                              className="text-slate-600 hover:bg-slate-100 border-slate-300 font-semibold text-xs rounded-xl"
                            >
                              Unapprove
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* Submit / Resubmit Claim Modal */}
      {(isSubmitModalOpen || isResubmitModalOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/80">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Wallet size={20} className="text-indigo-600" />
                {isResubmitModalOpen ? 'Resubmit Expense Claim' : 'Submit Expense Claim'}
              </h2>
              <button onClick={() => { setIsSubmitModalOpen(false); setIsResubmitModalOpen(false); }} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={isResubmitModalOpen ? handleResubmitClaim : handleSubmitClaim} className="p-6 space-y-4 overflow-y-auto">
              {formError && (
                <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl border border-red-200 flex items-center gap-2">
                  <Info size={14} className="shrink-0" /> {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Claim Title</label>
                <Input 
                  value={formData.title} 
                  onChange={e => setFormData({ ...formData, title: e.target.value })} 
                  placeholder="e.g. Flight to Mumbai Townhall"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-slate-700 font-medium bg-white"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Expense Date</label>
                  <Input 
                    type="date" 
                    value={formData.date} 
                    onChange={e => setFormData({ ...formData, date: e.target.value })} 
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Currency</label>
                  <Input 
                    value={formData.currency} 
                    onChange={e => setFormData({ ...formData, currency: e.target.value })} 
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Amount</label>
                  <Input 
                    type="number" 
                    step="0.01"
                    min="0.01"
                    value={formData.amount} 
                    onChange={e => setFormData({ ...formData, amount: e.target.value })} 
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Additional context or notes for approver..."
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-slate-700 font-medium"
                />
              </div>

              {/* Receipt File Uploader */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Receipt Attachment (Max 5MB)</label>
                <input 
                  type="file" 
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={handleFileChange}
                  className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />

                {receiptPreview && (
                  <div className="mt-3 p-2 bg-slate-50 border border-slate-200 rounded-xl">
                    {receiptPreview === 'PDF' ? (
                      <div className="text-xs font-bold text-slate-700 flex items-center gap-2">
                        <FileText size={16} className="text-red-500" /> PDF Document attached
                      </div>
                    ) : (
                      <img src={receiptPreview} alt="Receipt Preview" className="h-32 object-contain rounded-lg mx-auto" />
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <Button type="button" variant="ghost" onClick={() => { setIsSubmitModalOpen(false); setIsResubmitModalOpen(false); }} className="text-slate-600 font-semibold">
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 shadow-md shadow-indigo-600/20">
                  {submitting ? 'Submitting...' : isResubmitModalOpen ? 'Resubmit Claim' : 'Submit Claim'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Action Modal (Approve / Reject / Unapprove) */}
      {selectedClaimForAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-800 capitalize">
              {selectedClaimForAction.action} Expense Claim
            </h3>
            <p className="text-xs text-slate-500">
              Claim: <strong>{selectedClaimForAction.claim.title}</strong> ({selectedClaimForAction.claim.currency} {Number(selectedClaimForAction.claim.amount).toLocaleString()})
            </p>

            {selectedClaimForAction.action === 'reject' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Rejection Remarks</label>
                <textarea
                  rows={3}
                  value={adminRemarks}
                  onChange={e => setAdminRemarks(e.target.value)}
                  placeholder="Reason for rejecting this claim..."
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none text-sm text-slate-700 font-medium"
                  required
                />
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => setSelectedClaimForAction(null)} className="text-slate-600 font-semibold">
                Cancel
              </Button>
              <Button
                onClick={handleActionConfirm}
                className={`font-bold text-white px-5 ${
                  selectedClaimForAction.action === 'reject' ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                Confirm {selectedClaimForAction.action}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Protected Receipt Lightbox Viewer Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <span className="font-bold text-slate-800 text-sm">{selectedReceipt.fileName || 'Receipt Attachment'}</span>
              <button onClick={() => setSelectedReceipt(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 flex-1 overflow-auto flex items-center justify-center bg-slate-900/5 min-h-[400px]">
              {receiptLoading ? (
                <div className="flex flex-col items-center gap-2 py-12">
                  <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                  <span className="text-xs font-semibold text-slate-500">Loading protected receipt...</span>
                </div>
              ) : receiptError ? (
                <div className="flex flex-col items-center gap-2 py-12 text-red-600">
                  <AlertTriangle size={36} />
                  <span className="text-sm font-bold">{receiptError}</span>
                  <span className="text-xs text-slate-400">Please check your permissions or try again later.</span>
                </div>
              ) : selectedReceipt.mimeType === 'application/pdf' ? (
                <iframe
                  src={receiptBlobUrl}
                  className="w-full h-[600px] rounded-xl border border-slate-200"
                  title="Receipt PDF"
                />
              ) : (
                receiptBlobUrl && (
                  <img
                    src={receiptBlobUrl}
                    alt="Receipt Attachment"
                    className="max-h-[650px] object-contain rounded-xl shadow-md"
                  />
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseManagement;
