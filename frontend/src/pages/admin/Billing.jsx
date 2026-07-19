import React, { useState, useEffect } from 'react';
import { CreditCard, Zap, CheckCircle2 } from 'lucide-react';
import { API_BASE } from '../../lib/api';
import Alert from '../../components/ui/Alert';

const Billing = () => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [usage, setUsage] = useState(null);

  useEffect(() => {
    fetchUsage();
  }, []);

  const fetchUsage = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/billing/usage`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!res.ok) throw new Error('Failed to fetch metered usage');
      const data = await res.json();
      setUsage(data);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleSubscribe = async (planId) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${API_BASE}/api/billing/subscriptions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ planId, totalCount: 12 })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Subscription failed');
      
      setSuccessMsg(`Successfully initiated subscription via Razorpay (Sub ID: ${data.razorpaySubId}). Waiting for webhook verification.`);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <CreditCard size={28} className="text-indigo-600" />
            Billing & Subscriptions
          </h1>
          <p className="text-slate-500 mt-1">
            Manage your Razorpay metered SaaS subscription.
          </p>
        </div>
      </div>

      {errorMsg && <Alert variant="danger">{errorMsg}</Alert>}
      {successMsg && <Alert variant="success">{successMsg}</Alert>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Metered Usage Box */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
            <Zap size={20} className="text-amber-500" />
            Current Metered Usage
          </h3>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
            <span className="text-slate-600 font-medium">Active Employees (Seats)</span>
            <span className="text-2xl font-black text-slate-900">{usage?.activeEmployees || 0}</span>
          </div>
          <p className="text-sm text-slate-500 mt-4">
            Your billing is calculated dynamically based on the number of active employees in your tenant.
          </p>
        </div>

        {/* Subscription Plan Box */}
        <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <CreditCard size={100} />
          </div>
          <h3 className="text-lg font-bold text-indigo-900 mb-2 relative z-10">
            Pro Plan (Metered)
          </h3>
          <p className="text-indigo-700 font-medium mb-6 relative z-10">
            ₹100 / employee / month
          </p>
          <ul className="space-y-3 mb-8 relative z-10">
            <li className="flex items-center gap-2 text-indigo-800 text-sm font-medium">
              <CheckCircle2 size={16} className="text-indigo-600" /> Multi-Entity Support
            </li>
            <li className="flex items-center gap-2 text-indigo-800 text-sm font-medium">
              <CheckCircle2 size={16} className="text-indigo-600" /> Statutory Filings (PF/PT)
            </li>
            <li className="flex items-center gap-2 text-indigo-800 text-sm font-medium">
              <CheckCircle2 size={16} className="text-indigo-600" /> Dedicated Account Manager
            </li>
          </ul>
          
          <button
            disabled={true}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-colors relative z-10 disabled:opacity-50 cursor-not-allowed"
          >
            Coming Soon
          </button>
        </div>

      </div>
    </div>
  );
};

export default Billing;
