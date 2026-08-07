import React, { useState, useEffect } from 'react';
import { hasPermission } from '../lib/permissions';
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
import { Skeleton, StatCardSkeleton, CardSkeleton } from '../components/ui/Skeleton';

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

  const isAdmin = hasPermission(user, 'manage_expenses');
  const isManager = hasPermission(user, 'manage_expenses');

  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const fetchClaims = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) return;

      const promises = [
        fetch(`${apiBase}/api/expenses/my`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.ok ? r.json() : []),
        isManager ? fetch(`${apiBase}/api/expenses/all`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.ok ? r.json() : []) : Promise.resolve(null)
      ];

      const [myData, allData] = await Promise.all(promises);
      setMyClaims(Array.isArray(myData) ? myData : []);
      if (allData) setAllClaims(Array.isArray(allData) ? allData : []);
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-[#EAE7E0]">
        <div>
          <h1 className="font-serif font-bold text-3xl md:text-4xl text-[#1F2B4D] tracking-tight leading-none flex items-center gap-3">
            <Wallet size={28} className="text-[#1F2B4D]" />
            Expense Management & Reimbursement
          </h1>
          <p className="text-[#6B655C] mt-1.5 text-xs md:text-sm font-medium">Submit receipts, track reimbursement claims, and manage approval queues.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => { resetForm(); setIsSubmitModalOpen(true); }}
            className="bg-[#F0F3F9] hover:bg-[#E2E8F0] text-[#1F2B4D] border border-[#CBD5E1] font-display font-bold px-4.5 py-2.5 rounded-xl transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-2 text-xs shadow-xs"
          >
            <Plus size={16} strokeWidth={2.5} /> Submit Expense Claim
          </button>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex border-b border-[#EAE7E0] gap-6">
        <button
          type="button"
          onClick={() => setActiveTab('my-claims')}
          className={`pb-3 text-xs font-display font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'my-claims'
              ? 'border-[#1F2B4D] text-[#1F2B4D]'
              : 'border-transparent text-[#6B655C] hover:text-[#1F2B4D]'
          }`}
        >
          <FileText size={16} /> My Claims ({myClaims.length})
        </button>

        {isManager && (
          <button
            type="button"
            onClick={() => setActiveTab('approvals')}
            className={`pb-3 text-xs font-display font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'approvals'
                ? 'border-[#1F2B4D] text-[#1F2B4D]'
                : 'border-transparent text-[#6B655C] hover:text-[#1F2B4D]'
            }`}
          >
            <CheckCircle size={16} /> Approvals & Settlement Queue ({allClaims.filter(c => c.status === 'PENDING').length} Pending)
          </button>
        )}
      </div>

      {/* TAB 1: MY CLAIMS */}
      {activeTab === 'my-claims' && (
        <div className="space-y-6">
          
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {loading ? (
              <>
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
              </>
            ) : (
              <>
            <div className="p-5 rounded-[20px] border border-[#EAE7E0] bg-[#FAF8F5] shadow-xs flex items-center gap-4 hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-xl bg-[#F0F3F9] text-[#1F2B4D] border border-[#CBD5E1] flex items-center justify-center font-bold shadow-2xs">
                <FileText size={20} />
              </div>
              <div>
                <div className="text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider">Total Claims</div>
                <div className="text-2xl font-serif font-bold text-[#1F2B4D]">{myClaims.length}</div>
              </div>
            </div>

            <div className="p-5 rounded-[20px] border border-[#EAE7E0] bg-[#FAF8F5] shadow-xs flex items-center gap-4 hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center font-bold shadow-2xs">
                <Clock size={20} />
              </div>
              <div>
                <div className="text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider">Pending Review</div>
                <div className="text-2xl font-serif font-bold text-amber-700">{pendingCount}</div>
              </div>
            </div>

            <div className="p-5 rounded-[20px] border border-[#EAE7E0] bg-[#FAF8F5] shadow-xs flex items-center gap-4 hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center font-bold shadow-2xs">
                <CheckCircle size={20} />
              </div>
              <div>
                <div className="text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider">Approved</div>
                <div className="text-2xl font-serif font-bold text-blue-700">{approvedCount}</div>
              </div>
            </div>

            <div className="p-5 rounded-[20px] border border-[#EAE7E0] bg-[#FAF8F5] shadow-xs flex items-center gap-4 hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold shadow-2xs">
                <DollarSign size={20} />
              </div>
              <div>
                <div className="text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider">Total Settled</div>
                <div className="text-xl font-serif font-bold text-emerald-800">₹{totalSettledAmount.toLocaleString()}</div>
              </div>
            </div>
            </>
            )}
          </div>

          {/* Claims List Table */}
          <div className="bg-white border border-[#EAE7E0] rounded-[20px] p-0 shadow-xs overflow-hidden overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[850px]">
              <thead>
                <tr className="bg-[#FAF8F5] border-b border-[#EAE7E0] text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider">
                  <th className="p-4">Claim Title & Category</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Receipt</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4F1EA] text-xs">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="p-4"><Skeleton className="h-4 w-36" /></td>
                      <td className="p-4"><Skeleton className="h-4 w-20" /></td>
                      <td className="p-4"><Skeleton className="h-4 w-16" /></td>
                      <td className="p-4"><Skeleton className="h-4 w-14" /></td>
                      <td className="p-4"><Skeleton className="h-6 w-20 rounded-full" /></td>
                      <td className="p-4 text-right"><Skeleton className="h-4 w-16 ml-auto" /></td>
                    </tr>
                  ))
                ) : myClaims.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="w-14 h-14 rounded-2xl bg-[#F0F3F9] text-[#1F2B4D] border border-[#CBD5E1] flex items-center justify-center font-bold">
                          <Wallet size={28} />
                        </div>
                        <h3 className="text-base font-serif font-bold text-[#1F2B4D]">No Expense Claims Submitted</h3>
                        <p className="text-xs text-[#6B655C] max-w-sm font-medium">
                          You haven't submitted any reimbursement claims yet. Keep track of travel, supplies, and business receipts in one place.
                        </p>
                        <button
                          type="button"
                          onClick={() => { resetForm(); setIsSubmitModalOpen(true); }}
                          className="mt-2 bg-[#F0F3F9] hover:bg-[#E2E8F0] text-[#1F2B4D] border border-[#CBD5E1] font-display font-bold text-xs gap-1.5 px-4 py-2 rounded-xl shadow-xs"
                        >
                          <Plus size={16} /> Submit Your First Expense Claim
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  myClaims.map((claim) => (
                    <tr key={claim.id} className="hover:bg-[#FAF9F6] transition-colors">
                      <td className="p-4">
                        <div className="font-serif font-bold text-[#1F2B4D] text-sm">{claim.title}</div>
                        <div className="text-xs text-[#6B655C] flex items-center gap-2 mt-0.5">
                          <span className="px-2 py-0.5 rounded-md bg-[#FAF9F6] text-[#6B655C] font-display font-bold text-[10px] uppercase border border-[#EAE7E0]">{claim.category}</span>
                          {claim.description && <span className="truncate max-w-[250px] font-medium">{claim.description}</span>}
                        </div>
                      </td>
                      <td className="p-4 text-xs font-medium text-[#6B655C]">
                        {format(new Date(claim.date), 'MMM d, yyyy')}
                      </td>
                      <td className="p-4 font-serif font-bold text-[#1F2B4D] text-base">
                        {claim.currency} {Number(claim.amount).toLocaleString()}
                      </td>
                      <td className="p-4">
                        {claim.receiptFileId ? (
                          <button
                            type="button"
                            onClick={() => setSelectedReceipt({ claimId: claim.id, mimeType: claim.receiptMimeType, fileName: claim.receiptFileName })}
                            className="inline-flex items-center gap-1.5 text-xs font-display font-bold text-[#1F2B4D] hover:bg-[#E2E8F0] bg-[#F0F3F9] px-3 py-1 rounded-xl transition-all border border-[#CBD5E1] shadow-xs"
                          >
                            <Eye size={13} /> View Receipt
                          </button>
                        ) : (
                          <span className="text-xs text-[#9A948A] italic">No receipt</span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-display font-bold uppercase tracking-wider border ${
                          claim.status === 'PENDING' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                          claim.status === 'APPROVED' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                          claim.status === 'SETTLED' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                          'bg-rose-50 text-rose-800 border-rose-200'
                        }`}>
                          {claim.status === 'PENDING' && <Clock size={11} />}
                          {claim.status === 'APPROVED' && <CheckCircle size={11} />}
                          {claim.status === 'SETTLED' && <CheckCheck size={11} />}
                          {claim.status === 'REJECTED' && <XCircle size={11} />}
                          {claim.status}
                        </span>
                        {claim.adminRemarks && (
                          <div className="text-[11px] text-rose-600 font-medium mt-1">Remarks: {claim.adminRemarks}</div>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        {claim.status === 'REJECTED' && (
                          <button
                            type="button"
                            onClick={() => openResubmitModal(claim)}
                            className="inline-flex items-center gap-1.5 text-xs font-display font-bold bg-[#1F2B4D] hover:bg-[#141C33] text-white rounded-xl px-3 py-1.5 transition-all shadow-xs"
                          >
                            <RotateCcw size={13} /> Resubmit
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: APPROVALS & SETTLEMENT QUEUE (MANAGERS & ADMINS) */}
      {activeTab === 'approvals' && isManager && (
        <div className="space-y-6">
          
          {/* Sub-tabs & Batch Settlement Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#FAF8F5] p-3 rounded-[20px] border border-[#EAE7E0]">
            <div className="flex items-center gap-2 flex-wrap">
              {['PENDING', 'APPROVED', 'SETTLED', 'REJECTED'].map((st) => {
                const count = allClaims.filter(c => c.status === st).length;
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => { setApprovalSubTab(st); setSelectedBatchClaimIds([]); }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-display font-bold transition-all flex items-center gap-2 border ${
                      approvalSubTab === st
                        ? 'bg-[#F0F3F9] text-[#1F2B4D] border-[#CBD5E1] shadow-xs'
                        : 'bg-white text-[#6B655C] hover:bg-[#FAF8F5] border-[#EAE7E0]'
                    }`}
                  >
                    <span>{st}</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${approvalSubTab === st ? 'bg-[#1F2B4D]/10 text-[#1F2B4D]' : 'bg-[#FAF8F5] text-[#6B655C]'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Batch Settlement Button for Approved Claims */}
            {approvalSubTab === 'APPROVED' && isAdmin && selectedBatchClaimIds.length > 0 && (
              <button
                type="button"
                onClick={handleBatchSettle}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-display font-bold text-xs gap-2 px-4 py-2 rounded-xl shadow-xs transition-all flex items-center"
              >
                <CheckCheck size={16} /> Batch Settle ({selectedBatchClaimIds.length}) Claims
              </button>
            )}
          </div>

          {/* Approvals Table */}
          <div className="bg-white border border-[#EAE7E0] rounded-[20px] p-0 shadow-xs overflow-hidden overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[950px]">
              <thead>
                <tr className="bg-[#FAF8F5] border-b border-[#EAE7E0] text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider">
                  {approvalSubTab === 'APPROVED' && isAdmin && (
                    <th className="p-4 w-10">
                      <input
                        type="checkbox"
                        checked={selectedBatchClaimIds.length > 0 && selectedBatchClaimIds.length === filteredAllClaims.length}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedBatchClaimIds(filteredAllClaims.map(c => c.id));
                          else setSelectedBatchClaimIds([]);
                        }}
                        className="rounded border-[#EAE7E0] text-[#1F2B4D] focus:ring-[#1F2B4D]/10"
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
              <tbody className="divide-y divide-[#F4F1EA] text-xs">
                {filteredAllClaims.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-[#6B655C] font-medium italic">No claims in '{approvalSubTab}' status.</td>
                  </tr>
                ) : (
                  filteredAllClaims.map((claim) => {
                    const isSelfClaim = claim.userId === user?.id;

                    return (
                      <tr key={claim.id} className="hover:bg-[#FAF9F6] transition-colors">
                        {approvalSubTab === 'APPROVED' && isAdmin && (
                          <td className="p-4">
                            <input
                              type="checkbox"
                              checked={selectedBatchClaimIds.includes(claim.id)}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedBatchClaimIds(prev => [...prev, claim.id]);
                                else setSelectedBatchClaimIds(prev => prev.filter(id => id !== claim.id));
                              }}
                              className="rounded border-[#EAE7E0] text-[#1F2B4D] focus:ring-[#1F2B4D]/10"
                            />
                          </td>
                        )}

                        <td className="p-4">
                          <div className="flex items-center gap-2.5">
                            <Avatar src={claim.user?.avatar} name={claim.user?.displayName} className="w-8 h-8 rounded-full shrink-0" />
                            <div>
                              <div className="font-serif font-bold text-[#1F2B4D] text-xs">{claim.user?.displayName}</div>
                              <div className="text-[11px] text-[#6B655C] font-medium">{claim.user?.department || 'Team'}</div>
                            </div>
                          </div>
                        </td>

                        <td className="p-4">
                          <div className="font-serif font-bold text-[#1F2B4D] text-sm">{claim.title}</div>
                          <div className="text-xs text-[#6B655C] flex items-center gap-2 mt-0.5">
                            <span className="px-2 py-0.5 rounded-md bg-[#FAF9F6] text-[#6B655C] font-display font-bold text-[10px] uppercase border border-[#EAE7E0]">{claim.category}</span>
                            <span className="font-medium">{format(new Date(claim.date), 'MMM d, yyyy')}</span>
                          </div>
                        </td>

                        <td className="p-4 font-serif font-bold text-[#1F2B4D] text-base">
                          {claim.currency} {Number(claim.amount).toLocaleString()}
                        </td>

                        <td className="p-4">
                          {claim.receiptFileId ? (
                            <button
                              type="button"
                              onClick={() => setSelectedReceipt({ claimId: claim.id, mimeType: claim.receiptMimeType, fileName: claim.receiptFileName })}
                              className="inline-flex items-center gap-1.5 text-xs font-display font-bold text-[#1F2B4D] hover:bg-[#E2E8F0] bg-[#F0F3F9] px-3 py-1 rounded-xl transition-all border border-[#CBD5E1] shadow-xs"
                            >
                              <Eye size={13} /> Receipt
                            </button>
                          ) : (
                            <span className="text-xs text-[#9A948A] italic">None</span>
                          )}
                        </td>

                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-display font-bold uppercase tracking-wider border ${
                            claim.status === 'PENDING' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                            claim.status === 'APPROVED' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                            claim.status === 'SETTLED' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                            'bg-rose-50 text-rose-800 border-rose-200'
                          }`}>
                            {claim.status}
                          </span>
                        </td>

                        <td className="p-4 text-right">
                          {claim.status === 'PENDING' && (
                            <div className="flex items-center justify-end gap-2">
                              {isSelfClaim ? (
                                <span className="text-xs font-medium text-[#9A948A] italic" title="Self-approval blocked. Forwarded to superior manager.">
                                  Forwarded (Self-claim)
                                </span>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => setSelectedClaimForAction({ claim, action: 'approve' })}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-display font-bold text-xs rounded-xl px-3 py-1.5 shadow-xs transition-all"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setSelectedClaimForAction({ claim, action: 'reject' })}
                                    className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-display font-bold text-xs rounded-xl px-3 py-1.5 shadow-xs transition-all"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                            </div>
                          )}

                          {claim.status === 'APPROVED' && isAdmin && (
                            <button
                              type="button"
                              onClick={() => setSelectedClaimForAction({ claim, action: 'unapprove' })}
                              className="bg-[#F0F3F9] hover:bg-[#E2E8F0] text-[#1F2B4D] border border-[#CBD5E1] font-display font-bold text-xs rounded-xl px-3 py-1.5 shadow-xs transition-all"
                            >
                              Unapprove
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Submit / Resubmit Claim Modal */}
      {(isSubmitModalOpen || isResubmitModalOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1F2B4D]/20 backdrop-blur-xs p-4">
          <div className="bg-white rounded-[24px] border border-[#EAE7E0] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-[#EAE7E0] bg-[#FAF8F5]">
              <h2 className="font-serif font-bold text-xl text-[#1F2B4D] flex items-center gap-2">
                <Wallet size={18} className="text-[#1F2B4D]" />
                {isResubmitModalOpen ? 'Resubmit Expense Claim' : 'Submit Expense Claim'}
              </h2>
              <button type="button" onClick={() => { setIsSubmitModalOpen(false); setIsResubmitModalOpen(false); }} className="p-1.5 text-[#6B655C] hover:text-[#1F2B4D] hover:bg-[#EAE7E0] rounded-xl transition-colors">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={isResubmitModalOpen ? handleResubmitClaim : handleSubmitClaim} className="p-6 space-y-4 overflow-y-auto">
              {formError && (
                <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200 flex items-center gap-2 font-medium">
                  <Info size={14} className="shrink-0 text-rose-600" /> {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-display font-bold text-[#6B655C] uppercase tracking-wider mb-1.5">Claim Title</label>
                <input 
                  value={formData.title} 
                  onChange={e => setFormData({ ...formData, title: e.target.value })} 
                  placeholder="e.g. Flight to Mumbai Townhall"
                  required
                  className="w-full p-2.5 border border-[#EAE7E0] rounded-xl focus:ring-2 focus:ring-[#1F2B4D]/10 focus:border-[#1F2B4D] outline-none text-xs font-medium text-[#1F2B4D]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-display font-bold text-[#6B655C] uppercase tracking-wider mb-1.5">Category</label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="w-full p-2.5 border border-[#EAE7E0] rounded-xl focus:ring-2 focus:ring-[#1F2B4D]/10 focus:border-[#1F2B4D] outline-none text-xs text-[#1F2B4D] font-medium bg-white"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-display font-bold text-[#6B655C] uppercase tracking-wider mb-1.5">Expense Date</label>
                  <input 
                    type="date" 
                    value={formData.date} 
                    onChange={e => setFormData({ ...formData, date: e.target.value })} 
                    required
                    className="w-full p-2.5 border border-[#EAE7E0] rounded-xl focus:ring-2 focus:ring-[#1F2B4D]/10 focus:border-[#1F2B4D] outline-none text-xs font-medium text-[#1F2B4D]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-display font-bold text-[#6B655C] uppercase tracking-wider mb-1.5">Currency</label>
                  <input 
                    value={formData.currency} 
                    onChange={e => setFormData({ ...formData, currency: e.target.value })} 
                    required
                    className="w-full p-2.5 border border-[#EAE7E0] rounded-xl focus:ring-2 focus:ring-[#1F2B4D]/10 focus:border-[#1F2B4D] outline-none text-xs font-medium text-[#1F2B4D]"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-display font-bold text-[#6B655C] uppercase tracking-wider mb-1.5">Amount</label>
                  <input 
                    type="number" 
                    step="0.01"
                    min="0.01"
                    value={formData.amount} 
                    onChange={e => setFormData({ ...formData, amount: e.target.value })} 
                    placeholder="0.00"
                    required
                    className="w-full p-2.5 border border-[#EAE7E0] rounded-xl focus:ring-2 focus:ring-[#1F2B4D]/10 focus:border-[#1F2B4D] outline-none text-xs font-medium text-[#1F2B4D]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-display font-bold text-[#6B655C] uppercase tracking-wider mb-1.5">Description (Optional)</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Additional context or notes for approver..."
                  className="w-full p-3 border border-[#EAE7E0] rounded-xl focus:ring-2 focus:ring-[#1F2B4D]/10 focus:border-[#1F2B4D] outline-none text-xs text-[#1F2B4D] font-medium"
                />
              </div>

              {/* Receipt File Uploader */}
              <div>
                <label className="block text-xs font-display font-bold text-[#6B655C] uppercase tracking-wider mb-1.5">Receipt Attachment (Max 5MB)</label>
                <input 
                  type="file" 
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={handleFileChange}
                  className="block w-full text-xs text-[#6B655C] file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-display file:font-bold file:bg-[#F0F3F9] file:text-[#1F2B4D] hover:file:bg-[#E2E8F0]"
                />

                {receiptPreview && (
                  <div className="mt-3 p-2 bg-[#FAF8F5] border border-[#EAE7E0] rounded-xl">
                    {receiptPreview === 'PDF' ? (
                      <div className="text-xs font-display font-bold text-[#1F2B4D] flex items-center gap-2">
                        <FileText size={16} className="text-rose-600" /> PDF Document attached
                      </div>
                    ) : (
                      <img src={receiptPreview} alt="Receipt Preview" className="h-32 object-contain rounded-lg mx-auto" />
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-[#EAE7E0]">
                <button 
                  type="button" 
                  onClick={() => { setIsSubmitModalOpen(false); setIsResubmitModalOpen(false); }} 
                  className="px-4 py-2 rounded-xl text-xs font-display font-bold text-[#6B655C] bg-white border border-[#EAE7E0] hover:bg-[#FAF8F5] transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submitting} 
                  className="bg-[#F0F3F9] hover:bg-[#E2E8F0] text-[#1F2B4D] border border-[#CBD5E1] px-5 py-2 rounded-xl font-display font-bold text-xs transition-all hover:scale-[1.02] active:scale-95 shadow-xs disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : isResubmitModalOpen ? 'Resubmit Claim' : 'Submit Claim'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Action Modal (Approve / Reject / Unapprove) */}
      {selectedClaimForAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1F2B4D]/20 backdrop-blur-xs p-4">
          <div className="bg-white rounded-[24px] border border-[#EAE7E0] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 p-6 space-y-4">
            <h3 className="font-serif font-bold text-lg text-[#1F2B4D] capitalize">
              {selectedClaimForAction.action} Expense Claim
            </h3>
            <p className="text-xs text-[#6B655C] font-medium">
              Claim: <strong className="text-[#1F2B4D] font-serif">{selectedClaimForAction.claim.title}</strong> ({selectedClaimForAction.claim.currency} {Number(selectedClaimForAction.claim.amount).toLocaleString()})
            </p>

            {selectedClaimForAction.action === 'reject' && (
              <div>
                <label className="block text-xs font-display font-bold text-[#6B655C] uppercase tracking-wider mb-1.5">Rejection Remarks</label>
                <textarea
                  rows={3}
                  value={adminRemarks}
                  onChange={e => setAdminRemarks(e.target.value)}
                  placeholder="Reason for rejecting this claim..."
                  className="w-full p-3 border border-[#EAE7E0] rounded-xl focus:ring-2 focus:ring-rose-500/10 focus:border-rose-500 outline-none text-xs text-[#1F2B4D] font-medium"
                  required
                />
              </div>
            )}

            <div className="flex justify-end gap-2.5 pt-2">
              <button 
                type="button" 
                onClick={() => setSelectedClaimForAction(null)} 
                className="px-4 py-2 rounded-xl text-xs font-display font-bold text-[#6B655C] bg-white border border-[#EAE7E0] hover:bg-[#FAF8F5] transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleActionConfirm}
                className={`font-display font-bold text-xs px-5 py-2 rounded-xl transition-all shadow-xs ${
                  selectedClaimForAction.action === 'reject' ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'bg-[#F0F3F9] hover:bg-[#E2E8F0] text-[#1F2B4D] border border-[#CBD5E1]'
                }`}
              >
                Confirm {selectedClaimForAction.action}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Protected Receipt Lightbox Viewer Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1F2B4D]/30 backdrop-blur-xs p-4">
          <div className="bg-white rounded-[24px] border border-[#EAE7E0] shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-[#EAE7E0] bg-[#FAF8F5]">
              <span className="font-serif font-bold text-[#1F2B4D] text-sm">{selectedReceipt.fileName || 'Receipt Attachment'}</span>
              <button type="button" onClick={() => setSelectedReceipt(null)} className="p-1.5 text-[#6B655C] hover:text-[#1F2B4D] rounded-xl hover:bg-[#EAE7E0] transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-4 flex-1 overflow-auto flex items-center justify-center bg-[#FAF9F6] min-h-[400px]">
              {receiptLoading ? (
                <div className="flex flex-col items-center gap-2 py-12">
                  <div className="w-8 h-8 border-4 border-[#EAE7E0] border-t-[#1F2B4D] rounded-full animate-spin"></div>
                  <span className="text-xs font-display font-bold text-[#6B655C]">Loading protected receipt...</span>
                </div>
              ) : receiptError ? (
                <div className="flex flex-col items-center gap-2 py-12 text-rose-600">
                  <AlertTriangle size={32} />
                  <span className="text-sm font-serif font-bold">{receiptError}</span>
                  <span className="text-xs text-[#6B655C]">Please check your permissions or try again later.</span>
                </div>
              ) : selectedReceipt.mimeType === 'application/pdf' ? (
                <iframe
                  src={receiptBlobUrl}
                  className="w-full h-[600px] rounded-xl border border-[#EAE7E0]"
                  title="Receipt PDF"
                />
              ) : (
                receiptBlobUrl && (
                  <img
                    src={receiptBlobUrl}
                    alt="Receipt Attachment"
                    className="max-h-[650px] object-contain rounded-xl shadow-xs"
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
