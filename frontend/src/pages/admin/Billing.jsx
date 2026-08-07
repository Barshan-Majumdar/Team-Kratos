import React, { useState, useEffect, useRef } from 'react';
import { CreditCard, Zap, CheckCircle2, Receipt, ArrowUpRight, CheckCircle, AlertCircle, TrendingUp, Building2, HardDrive, Activity, Users, Shield, Plus } from 'lucide-react';
import { API_BASE } from '../../lib/api';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

const Billing = () => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [usage, setUsage] = useState(null);
  const containerRef = useRef(null);

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

  useGSAP(() => {
    gsap.fromTo('.gsap-billing-stagger', 
      { opacity: 0, y: 30 }, 
      { opacity: 1, y: 0, duration: 0.8, stagger: 0.1, ease: 'power3.out' }
    );
  }, { scope: containerRef });

  const cardStyle = "bg-white rounded-[24px] border border-[#EAE7E0] w-full h-full p-6 md:p-8 flex flex-col relative overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-500";

  return (
    <div ref={containerRef} className="w-full px-4 md:px-8 lg:px-12 py-8 min-h-screen font-sans bg-[#FAF9F6] space-y-10">
      
      {/* Header */}
      <div className="gsap-billing-stagger opacity-0 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white border border-[#EAE7E0] shadow-sm rounded-[14px] flex items-center justify-center text-[#1F2B4D]">
            <CreditCard size={24} strokeWidth={2.5} />
          </div>
          <h1 className="text-[36px] md:text-[40px] font-bold text-[#1D1B16] tracking-tighter leading-none">
            Billing & Enterprise Usage
          </h1>
        </div>
        <p className="text-[#6B655C] text-[15px] font-medium tracking-tight">
          Manage your organization's subscription, resource limits, and financial history.
        </p>
      </div>

      {errorMsg && (
        <div className="gsap-billing-stagger opacity-0 p-5 rounded-2xl font-semibold text-[14px] flex items-center gap-3 bg-rose-50 text-rose-700 border border-rose-200">
          <AlertCircle size={20} strokeWidth={2.5} />
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="gsap-billing-stagger opacity-0 p-5 rounded-2xl font-semibold text-[14px] flex items-center gap-3 bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]">
          <CheckCircle size={20} strokeWidth={2.5} />
          {successMsg}
        </div>
      )}

      {/* Primary Grid: Metrics & Plan */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* Metered Usage Box */}
        <div className="gsap-billing-stagger opacity-0 xl:col-span-8 h-fit">
          <div className={cardStyle}>
            <div className="flex justify-between items-start mb-8">
              <h2 className="text-[20px] font-bold text-[#1D1B16] tracking-tight">
                Current Metered Usage
              </h2>
              <span className="px-4 py-1.5 bg-[#ECFDF5] text-[#065F46] text-[13px] font-bold rounded-full border border-[#A7F3D0] flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#059669] animate-pulse"></div>
                Active Status
              </span>
            </div>

            <div className="flex flex-col md:flex-row gap-6 mb-8">
              {/* Card 1: Active Employees */}
              <div className="group flex-1 p-6 rounded-[20px] bg-[#FAF9F6] border border-[#EAE7E0] transition-all duration-300 hover:border-[#D9D6CE] relative overflow-hidden flex flex-col justify-center">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full blur-2xl -mr-10 -mt-10 transition-transform duration-500 group-hover:scale-110"></div>
                <div className="relative z-10">
                  <div className="w-10 h-10 rounded-xl bg-white border border-[#EAE7E0] shadow-sm flex items-center justify-center mb-4 text-[#1F2B4D]">
                    <Users size={20} strokeWidth={2.5} />
                  </div>
                  <span className="text-[#6B655C] text-[13px] font-bold mb-1 block uppercase tracking-wider">
                    Active Seats
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[48px] font-black text-[#1D1B16] tracking-tighter leading-none">
                      {usage?.activeEmployees || 0}
                    </span>
                    <span className="text-[#9A948A] text-[15px] font-bold">employees</span>
                  </div>
                </div>
              </div>
              
              {/* Card 2: Next Invoice (Light Theme) */}
              <div className="group flex-1 p-6 rounded-[20px] bg-white border border-[#EAE7E0] shadow-sm transition-all duration-300 hover:border-[#D9D6CE] relative overflow-hidden flex flex-col justify-center">
                <div className="absolute right-0 bottom-0 opacity-[0.03] transition-transform duration-700 group-hover:-translate-x-2 group-hover:-translate-y-2">
                  <svg width="160" height="80" viewBox="0 0 120 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M0 60L20 40L40 50L60 20L80 30L100 10L120 20" stroke="#1F2B4D" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="absolute top-0 right-0 w-40 h-40 bg-[#F0F3F9] rounded-full blur-[40px] opacity-60 -mr-10 -mt-10 transition-opacity duration-500 group-hover:opacity-100"></div>
                
                <div className="relative z-10">
                  <div className="w-10 h-10 rounded-xl bg-[#F0F3F9] border border-[#D9E2F2] flex items-center justify-center mb-4 text-[#1F2B4D]">
                    <Zap size={20} strokeWidth={2.5} />
                  </div>
                  <span className="text-[#6B655C] text-[13px] font-bold mb-1 block uppercase tracking-wider">
                    Next Invoice Est.
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-[48px] font-black text-[#1D1B16] tracking-tighter leading-none">
                      ₹{(usage?.activeEmployees || 0) * 100}
                    </span>
                    <span className="text-[#9A948A] text-[15px] font-bold tracking-tight">/mo</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-[#F0F3F9] rounded-xl text-[13px] text-[#1F2B4D] font-medium border border-[#D9E2F2] flex items-start gap-3">
              <Building2 size={18} className="shrink-0 mt-0.5" strokeWidth={2.5} />
              <p>Your billing is calculated dynamically based on the exact number of active employees across all your registered entities at the end of the billing cycle.</p>
            </div>
          </div>
        </div>

        {/* Subscription Plan Box - Light Theme */}
        <div className="gsap-billing-stagger opacity-0 xl:col-span-4 h-fit">
          <div className={cardStyle}>
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#F0F3F9] rounded-full blur-[80px] -mr-20 -mt-20 opacity-60"></div>
            
            <div className="relative z-10 flex flex-col h-full">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-[24px] font-bold text-[#1D1B16] tracking-tighter">
                  Enterprise Pro
                </h3>
                <Shield size={24} className="text-[#1F2B4D]/20" />
              </div>
              
              <div className="flex items-baseline gap-1 mb-10">
                <span className="text-[40px] font-black text-[#1F2B4D] tracking-tighter">₹100</span>
                <span className="text-[#6B655C] font-medium text-[15px]">/ seat / month</span>
              </div>
              
              <ul className="space-y-4 mb-10 flex-1">
                <li className="flex items-start gap-3 text-[#1D1B16] text-[14px] font-bold">
                  <CheckCircle2 size={20} className="text-[#059669] shrink-0" strokeWidth={2.5} /> 
                  Unlimited Multi-Entity Support
                </li>
                <li className="flex items-start gap-3 text-[#1D1B16] text-[14px] font-bold">
                  <CheckCircle2 size={20} className="text-[#059669] shrink-0" strokeWidth={2.5} /> 
                  Automated Statutory Filings (PF/PT/ESI)
                </li>
                <li className="flex items-start gap-3 text-[#1D1B16] text-[14px] font-bold">
                  <CheckCircle2 size={20} className="text-[#059669] shrink-0" strokeWidth={2.5} /> 
                  Dedicated Enterprise Account Manager
                </li>
                <li className="flex items-start gap-3 text-[#1D1B16] text-[14px] font-bold">
                  <CheckCircle2 size={20} className="text-[#059669] shrink-0" strokeWidth={2.5} /> 
                  24/7 Priority Phone Support
                </li>
              </ul>
              
              <button
                disabled={true}
                className="w-full py-4 bg-[#F0F3F9] text-[#1F2B4D] font-bold rounded-[16px] border border-[#D9E2F2] transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:bg-[#E2E8F4]"
              >
                Change Plan <ArrowUpRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Grid: Enterprise Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Payment Methods */}
        <div className="gsap-billing-stagger opacity-0 h-fit">
          <div className={cardStyle}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-[16px] font-bold text-[#1D1B16]">Payment Method</h3>
              <button className="text-[#1F2B4D] bg-[#F0F3F9] hover:bg-[#E2E8F4] p-1.5 rounded-lg transition-colors">
                <Plus size={18} />
              </button>
            </div>
            <div className="p-4 rounded-xl border border-[#EAE7E0] bg-[#FAF9F6] flex items-center gap-4">
              <div className="w-12 h-8 bg-[#1F2B4D] rounded flex items-center justify-center text-white text-[10px] font-bold italic tracking-wider">
                VISA
              </div>
              <div className="flex-1">
                <p className="text-[14px] font-bold text-[#1D1B16] leading-tight">•••• •••• •••• 4242</p>
                <p className="text-[12px] text-[#6B655C] font-medium">Expires 12/28</p>
              </div>
            </div>
          </div>
        </div>

        {/* Resource Limits */}
        <div className="gsap-billing-stagger opacity-0 h-fit">
          <div className={cardStyle}>
            <h3 className="text-[16px] font-bold text-[#1D1B16] mb-6">Resource Usage</h3>
            <div className="space-y-5">
              <div>
                <div className="flex justify-between text-[13px] font-bold mb-2">
                  <span className="text-[#6B655C] flex items-center gap-1.5"><HardDrive size={14} /> Storage</span>
                  <span className="text-[#1D1B16]">45GB / 100GB</span>
                </div>
                <div className="w-full h-2 bg-[#F0F3F9] rounded-full overflow-hidden">
                  <div className="h-full bg-[#1F2B4D] rounded-full w-[45%]"></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[13px] font-bold mb-2">
                  <span className="text-[#6B655C] flex items-center gap-1.5"><Activity size={14} /> API Requests</span>
                  <span className="text-[#1D1B16]">8.2k / 10k</span>
                </div>
                <div className="w-full h-2 bg-[#F0F3F9] rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full w-[82%]"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Billing Contacts */}
        <div className="gsap-billing-stagger opacity-0 h-fit">
          <div className={cardStyle}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-[16px] font-bold text-[#1D1B16]">Billing Contacts</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl hover:bg-[#FAF9F6] transition-colors border border-transparent hover:border-[#EAE7E0]">
                <div>
                  <p className="text-[14px] font-bold text-[#1D1B16] leading-tight">Finance Team</p>
                  <p className="text-[12px] text-[#6B655C] font-medium">finance@company.com</p>
                </div>
                <span className="px-2 py-1 bg-[#F0F3F9] text-[#1F2B4D] text-[10px] font-bold rounded uppercase tracking-wider">Primary</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Invoice History */}
      <div className="gsap-billing-stagger opacity-0 h-fit">
        <div className={cardStyle}>
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-[20px] font-bold text-[#1D1B16] tracking-tight flex items-center gap-2">
              Invoice History
            </h2>
          </div>

          <div className="border border-[#EAE7E0] bg-white rounded-2xl overflow-hidden">
            <div className="grid grid-cols-5 gap-4 p-5 border-b border-[#EAE7E0] bg-[#FAF9F6] text-[12px] font-bold text-[#6B655C] uppercase tracking-wider">
              <div className="col-span-2">Invoice Number & Date</div>
              <div>Amount</div>
              <div>Status</div>
              <div className="text-right">Action</div>
            </div>
            
            {/* Empty State / Coming Soon */}
            <div className="p-16 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-[#F4F1EA] rounded-full flex items-center justify-center mb-5 border border-[#EAE7E0]">
                <Receipt size={24} className="text-[#9A948A]" strokeWidth={1.5} />
              </div>
              <p className="text-[18px] font-bold text-[#1D1B16] tracking-tight">No invoices generated yet</p>
              <p className="text-[14px] text-[#6B655C] font-medium mt-1">Your billing history and downloadable PDFs will appear here once your subscription cycle begins.</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Billing;
