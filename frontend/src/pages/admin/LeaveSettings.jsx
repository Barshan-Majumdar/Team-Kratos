import React, { useState, useEffect, useRef } from 'react';
import { Plus, Settings2, Trash2, ShieldAlert, FileText, Check, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

// Premium Toggle Component powered by Framer Motion
const Toggle = ({ checked, onChange }) => (
  <button
    type="button"
    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#1F2B4D] focus:ring-offset-2 ${checked ? 'bg-[#1F2B4D]' : 'bg-[#CBD5E1]'}`}
    onClick={() => onChange(!checked)}
  >
    <motion.span
      layout
      className="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-300 ease-in-out"
      animate={{ x: checked ? 20 : 0 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
    />
  </button>
);

const LeaveSettings = () => {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPolicy, setCurrentPolicy] = useState(null);

  const emptyPolicy = {
    name: '',
    annualQuota: 0,
    carryForward: false,
    maxCarryForward: 0,
    isPaid: true,
    allowNegativeBalance: false,
    requiresAttachment: false,
    leaveYearStartMonth: 1,
    leaveYearStartDay: 1
  };

  const [form, setForm] = useState(emptyPolicy);
  const containerRef = useRef(null);

  // GSAP Choreographed Intro Sequence (Safely Guarded Target Selectors)
  useGSAP(() => {
    if (loading || isEditing) return;

    const container = containerRef.current;
    if (!container) return;

    const introHeader = container.querySelector('.intro-header');
    const introPolicyCards = container.querySelectorAll('.intro-policy-card');

    const tl = gsap.timeline({ defaults: { ease: "power4.out" } });

    if (introHeader) tl.from(introHeader, { y: -20, opacity: 0, duration: 0.6 });
    if (introPolicyCards.length > 0) {
      tl.from(introPolicyCards, {
        scale: 0.9,
        opacity: 0,
        duration: 0.5,
        stagger: 0.08,
        clearProps: "all"
      }, "-=0.3");
    }

  }, { dependencies: [loading, isEditing], scope: containerRef });

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/leave/policies`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPolicies(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  const handleEdit = (policy) => {
    setCurrentPolicy(policy);
    setForm({
      name: policy.name,
      annualQuota: parseFloat(policy.annualQuota),
      carryForward: policy.carryForward,
      maxCarryForward: parseFloat(policy.maxCarryForward || 0),
      isPaid: policy.isPaid,
      allowNegativeBalance: policy.allowNegativeBalance,
      requiresAttachment: policy.requiresAttachment || false,
      leaveYearStartMonth: policy.leaveYearStartMonth || 1,
      leaveYearStartDay: policy.leaveYearStartDay || 1
    });
    setIsEditing(true);
  };

  const handleDelete = async (id) => {
    if (!await window.confirmDialog()) return;
    try {
      await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/leave/policies/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      fetchPolicies();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const method = currentPolicy ? 'PUT' : 'POST';
      const url = currentPolicy 
        ? `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/leave/policies/${currentPolicy.id}`
        : `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/leave/policies`;

      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify({
          ...form,
          annualQuota: Number(form.annualQuota),
          maxCarryForward: Number(form.maxCarryForward)
        })
      });

      if (!res.ok) {
        const data = await res.json().catch(()=>({}));
        alert(data.error || "Failed to save policy");
        return;
      }
      setIsEditing(false);
      fetchPolicies();
    } catch (e) {
      console.error(e);
      alert("An error occurred");
    }
  };

  return (
    <div ref={containerRef} className="w-full min-h-full flex flex-col gap-3.5 sm:gap-4 p-3 sm:p-5 md:p-6 bg-[#FAF9F6]">
      
      {/* ── TOP EXECUTIVE HEADER ── */}
      <div className="intro-header flex flex-col min-[600px]:flex-row min-[600px]:items-center justify-between gap-2.5 pb-3 border-b border-[#EAE7E0] w-full">
        <div>
          <h1 className="font-serif font-bold text-lg sm:text-2xl md:text-3xl text-[#1F2B4D] tracking-tight leading-tight flex items-center gap-2.5">
            <div className="p-1.5 bg-white rounded-xl shadow-2xs border border-[#EAE7E0]">
              <Settings2 className="text-[#1F2B4D] w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <span>Leave Policy Settings</span>
          </h1>
          <p className="text-[#6B655C] mt-0.5 text-xs sm:text-sm font-medium">
            Manage employee time off policies, carry-over rules, and accrual limits.
          </p>
        </div>
        
        {!isEditing && (
          <button
            type="button"
            onClick={() => { setCurrentPolicy(null); setForm(emptyPolicy); setIsEditing(true); }}
            className="relative overflow-hidden group inline-flex items-center justify-center gap-1.5 bg-white border border-[#EAE7E0] text-[#1F2B4D] px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-display font-bold uppercase tracking-wider shadow-2xs transition-all duration-300 hover:border-[#1F2B4D] active:scale-95 whitespace-nowrap shrink-0 w-full min-[600px]:w-auto"
          >
            {/* Sweep Background */}
            <span className="absolute inset-0 bg-[#1F2B4D] translate-y-[100%] group-hover:translate-y-0 transition-transform duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) z-0" />
            
            <Plus size={15} className="relative z-10 text-[#1F2B4D] group-hover:text-white transition-colors duration-300 shrink-0" />
            <span className="relative z-10 group-hover:text-white transition-colors duration-300">New Policy</span>
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {isEditing ? (
          <motion.div
            key="edit-form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ type: 'spring', stiffness: 260, damping: 25 }}
            className="double-bezel-outer bg-[#F4F1EA] p-1 rounded-2xl w-full max-w-4xl mx-auto"
          >
            <div className="double-bezel-inner bg-white rounded-xl p-4 sm:p-6 w-full">
              <h2 className="font-serif font-bold text-base sm:text-xl text-[#1F2B4D] mb-4 pb-2 border-b border-[#F4F1EA]">
                {currentPolicy ? 'Edit Leave Policy' : 'Create New Leave Policy'}
              </h2>
              
              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                  <div>
                    <label className="block text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider mb-1">Policy Name</label>
                    <input 
                      type="text" required
                      value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                      className="w-full px-3 py-2 bg-white border border-[#EAE7E0] rounded-xl focus:ring-2 focus:ring-[#1F2B4D] outline-none text-[#1F2B4D] text-xs font-bold transition-all placeholder:text-[#9A948A]"
                      placeholder="e.g. Paid Time Off or Casual Leave"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider mb-1">Annual Quota (Days)</label>
                    <input 
                      type="number" required min="0" step="0.5"
                      value={form.annualQuota} onChange={e => setForm({...form, annualQuota: e.target.value})}
                      className="w-full px-3 py-2 bg-white border border-[#EAE7E0] rounded-xl focus:ring-2 focus:ring-[#1F2B4D] outline-none text-[#1F2B4D] text-xs font-bold transition-all"
                    />
                  </div>

                  <div className="col-span-1 sm:col-span-2 space-y-2.5">
                    <div className="flex items-center justify-between p-3 bg-[#FAF8F5] border border-[#EAE7E0] rounded-xl gap-2">
                      <div>
                        <p className="text-xs font-bold text-[#1F2B4D]">Paid Leave</p>
                        <p className="text-[10px] text-[#6B655C] font-medium">Employees receive normal salary compensation for this leave.</p>
                      </div>
                      <Toggle checked={form.isPaid} onChange={val => setForm({...form, isPaid: val})} />
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-[#FAF8F5] border border-[#EAE7E0] rounded-xl gap-2">
                      <div>
                        <p className="text-xs font-bold text-[#1F2B4D]">Allow Negative Balance</p>
                        <p className="text-[10px] text-[#6B655C] font-medium">Employees can apply for more leave than currently accrued.</p>
                      </div>
                      <Toggle checked={form.allowNegativeBalance} onChange={val => setForm({...form, allowNegativeBalance: val})} />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-[#FAF8F5] border border-[#EAE7E0] rounded-xl gap-2">
                      <div>
                        <p className="text-xs font-bold text-[#1F2B4D]">Require Documentation Proof</p>
                        <p className="text-[10px] text-[#6B655C] font-medium">Medical certificate or supporting document required for submission.</p>
                      </div>
                      <Toggle checked={form.requiresAttachment} onChange={val => setForm({...form, requiresAttachment: val})} />
                    </div>
                  </div>
                  
                  <div className="col-span-1 sm:col-span-2 border border-[#EAE7E0] rounded-xl overflow-hidden mt-1">
                    <div className="bg-[#FAF8F5] px-3.5 py-2 border-b border-[#EAE7E0]">
                      <h3 className="text-[10px] font-display font-bold text-[#1F2B4D] uppercase tracking-wider">Carry Forward Rules</h3>
                    </div>
                    <div className="p-3.5 bg-white space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                        <div className="flex items-center justify-between w-full h-full gap-2">
                          <div>
                            <p className="text-xs font-bold text-[#1F2B4D]">Enable Carry Forward</p>
                            <p className="text-[10px] text-[#6B655C] font-medium">Allow unused days to transfer to next year.</p>
                          </div>
                          <Toggle checked={form.carryForward} onChange={val => setForm({...form, carryForward: val})} />
                        </div>

                        <AnimatePresence>
                          {form.carryForward && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden"
                            >
                              <label className="block text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider mb-1">Max Carry Forward (Days)</label>
                              <input 
                                type="number" min="0" step="0.5"
                                value={form.maxCarryForward} onChange={e => setForm({...form, maxCarryForward: e.target.value})}
                                className="w-full px-3 py-2 bg-white border border-[#EAE7E0] rounded-xl focus:ring-2 focus:ring-[#1F2B4D] outline-none text-[#1F2B4D] text-xs font-bold transition-all"
                              />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-3 border-t border-[#F4F1EA]">
                  <button 
                    type="button" 
                    onClick={() => setIsEditing(false)}
                    className="w-full sm:w-auto px-4 py-2 border border-[#EAE7E0] bg-white text-[#1F2B4D] text-xs font-display font-bold rounded-xl hover:bg-[#FAF8F5] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-5 py-2 bg-[#1F2B4D] hover:bg-[#141C33] text-white text-xs font-display font-bold uppercase tracking-wider rounded-xl shadow-2xs transition-all text-center"
                  >
                    Save Policy
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="policy-list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 w-full flex-1"
          >
            {loading ? (
               <div className="col-span-full py-12 text-center text-[#6B655C] font-medium text-xs">Loading Policies...</div>
            ) : policies.length === 0 ? (
               <div className="col-span-full py-16 text-center flex flex-col items-center justify-center bg-white rounded-2xl border border-dashed border-[#EAE7E0] p-6 w-full flex-1">
                 <div className="w-12 h-12 rounded-2xl bg-[#FAF8F5] border border-[#EAE7E0] flex items-center justify-center text-[#1F2B4D] mb-3 shadow-2xs">
                   <ShieldAlert size={24} />
                 </div>
                 <h3 className="text-base font-serif font-bold text-[#1F2B4D]">No Leave Policies Configured</h3>
                 <p className="text-xs text-[#6B655C] font-medium max-w-xs mt-1 leading-relaxed">
                   Create your first time-off policy to start assigning leave quotas to team members.
                 </p>
                 <button
                   type="button"
                   onClick={() => { setCurrentPolicy(null); setForm(emptyPolicy); setIsEditing(true); }}
                   className="mt-4 bg-[#1F2B4D] hover:bg-[#141C33] text-white font-display font-bold text-xs uppercase tracking-wider px-4 py-2 rounded-xl transition-all shadow-2xs inline-flex items-center gap-1.5"
                 >
                   <Plus size={14} className="shrink-0" />
                   <span>Create Policy</span>
                 </button>
               </div>
            ) : (
               policies.map(p => (
                 <div key={p.id} className="intro-policy-card double-bezel-outer bg-[#F4F1EA] p-1 rounded-2xl group hover:border-[#1F2B4D]/20 transition-all flex flex-col">
                   <div className="double-bezel-inner bg-white rounded-xl p-3.5 sm:p-4 flex flex-col justify-between h-full w-full relative overflow-hidden">
                     
                     <div>
                       <div className="flex justify-between items-start mb-3 gap-2">
                         <h3 className="font-serif font-bold text-sm sm:text-base text-[#1F2B4D] tracking-tight leading-snug truncate">{p.name}</h3>
                         <span className={`px-2 py-0.5 rounded-full text-[8.5px] font-display font-bold uppercase tracking-wider border shadow-2xs shrink-0 ${p.isPaid ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-[#F0F3F9] text-[#1F2B4D] border-[#CBD5E1]'}`}>
                           {p.isPaid ? 'Paid' : 'Unpaid'}
                         </span>
                       </div>
                       
                       <div className="bg-[#FAF8F5] rounded-xl p-3 border border-[#EAE7E0] space-y-2 text-xs">
                         <div className="flex justify-between items-center text-xs">
                           <span className="text-[#6B655C] text-[10px] font-display font-bold uppercase tracking-wider">Annual Quota</span>
                           <span className="font-bold text-[#1F2B4D]">{p.annualQuota} Days</span>
                         </div>
                         <div className="h-px w-full bg-[#EAE7E0]" />
                         <div className="flex justify-between items-center text-xs">
                           <span className="text-[#6B655C] text-[10px] font-display font-bold uppercase tracking-wider">Carry Forward</span>
                           <span className="font-bold text-[#1F2B4D]">{p.carryForward ? `${p.maxCarryForward} Days` : 'Disabled'}</span>
                         </div>
                         <div className="h-px w-full bg-[#EAE7E0]" />
                         <div className="flex justify-between items-center text-xs">
                           <span className="text-[#6B655C] text-[10px] font-display font-bold uppercase tracking-wider">Negative Bal.</span>
                           <span className={`font-bold ${p.allowNegativeBalance ? 'text-emerald-700' : 'text-[#6B655C]'}`}>{p.allowNegativeBalance ? 'Allowed' : 'Not Allowed'}</span>
                         </div>
                       </div>
                     </div>
                     
                     <div className="mt-3 pt-2.5 border-t border-[#F4F1EA] flex justify-end gap-1.5">
                       <button 
                         type="button"
                         onClick={() => handleEdit(p)}
                         className="p-1.5 text-[#1F2B4D] bg-[#F0F3F9] hover:bg-[#E2E8F0] border border-[#CBD5E1] rounded-lg transition-colors shadow-2xs"
                         title="Edit Policy"
                       >
                         <Settings2 size={14} />
                       </button>
                       <button 
                         type="button"
                         onClick={() => handleDelete(p.id)}
                         className="p-1.5 text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors shadow-2xs"
                         title="Delete Policy"
                       >
                         <Trash2 size={14} />
                       </button>
                     </div>
                   </div>
                 </div>
               ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LeaveSettings;
