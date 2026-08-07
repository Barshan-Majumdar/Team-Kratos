import React, { useState, useEffect, useRef } from 'react';
import { Plus, Settings2, Trash2, ShieldAlert } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

// Premium Toggle Component powered by Framer Motion
const Toggle = ({ checked, onChange }) => (
  <button
    type="button"
    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#1F2B4D] focus:ring-offset-2 ${checked ? 'bg-[#1F2B4D]' : 'bg-[#EAE7E0]'}`}
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

  // GSAP Choreographed Intro Sequence
  useGSAP(() => {
    if (loading || isEditing) return;

    const tl = gsap.timeline({ defaults: { ease: "power4.out" } });

    tl.from('.intro-header', {
      y: -30,
      opacity: 0,
      duration: 0.8,
    })
    .from('.intro-policy-card', {
      scale: 0.85,
      opacity: 0,
      duration: 0.6,
      stagger: 0.1,
      clearProps: "all" // Allows CSS hover physics to take back over
    }, "-=0.4");

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
    if (!window.confirm("Are you sure you want to archive this policy?")) return;
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
    <div ref={containerRef} className="p-4 md:p-8 lg:p-12 min-h-screen flex flex-col bg-[#FAF9F6]">
      
      {/* Header */}
      <div className="intro-header flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-[28px] font-bold text-[#1D1B16] tracking-tight">Leave Settings</h1>
          <p className="text-[#6B655C] mt-1 text-sm font-medium">Manage time off policies, accruals, and rules.</p>
        </div>
        
        {!isEditing && (
          <button
            onClick={() => { setCurrentPolicy(null); setForm(emptyPolicy); setIsEditing(true); }}
            className="relative overflow-hidden group flex items-center gap-2 bg-[#1F2B4D] border border-[#141C33] text-white px-6 py-3 rounded-xl font-bold shadow-md transition-all duration-300 active:scale-95 whitespace-nowrap"
          >
            <span className="absolute inset-0 bg-[#0F172A] translate-y-[100%] group-hover:translate-y-0 transition-transform duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) z-0" />
            <Plus size={18} className="relative z-10 text-white" />
            <span className="relative z-10 text-white">New Policy</span>
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {isEditing ? (
          <motion.div
            key="edit-form"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ type: 'spring', stiffness: 260, damping: 25 }}
            className="double-bezel-outer bg-[#F4F1EA] p-1.5 w-full max-w-4xl mx-auto"
          >
            <div className="double-bezel-inner bg-white p-8">
              <h2 className="text-2xl font-bold mb-8 text-[#1D1B16] tracking-tight">{currentPolicy ? 'Edit Policy' : 'Create New Policy'}</h2>
              
              <form onSubmit={handleSave} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <label className="block text-[11px] font-bold text-[#6B655C] uppercase tracking-wider mb-2">Policy Name</label>
                    <input 
                      type="text" required
                      value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                      className="w-full p-4 bg-[#FAF9F6] border border-[#EAE7E0] rounded-xl focus:ring-2 focus:ring-[#1F2B4D] outline-none text-[#1D1B16] font-bold transition-all placeholder:text-[#9A948A] placeholder:font-medium"
                      placeholder="e.g. Paid Time Off"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#6B655C] uppercase tracking-wider mb-2">Annual Quota (Days)</label>
                    <input 
                      type="number" required min="0" step="0.5"
                      value={form.annualQuota} onChange={e => setForm({...form, annualQuota: e.target.value})}
                      className="w-full p-4 bg-[#FAF9F6] border border-[#EAE7E0] rounded-xl focus:ring-2 focus:ring-[#1F2B4D] outline-none text-[#1D1B16] font-bold transition-all"
                    />
                  </div>

                  <div className="flex flex-col gap-6 md:mt-2">
                    <div className="flex items-center justify-between p-4 bg-[#FAF9F6] border border-[#EAE7E0] rounded-xl">
                      <div>
                        <p className="text-[13.5px] font-bold text-[#1D1B16]">Paid Leave</p>
                        <p className="text-[11px] text-[#6B655C] font-medium mt-0.5">Employees receive compensation for this leave.</p>
                      </div>
                      <Toggle checked={form.isPaid} onChange={val => setForm({...form, isPaid: val})} />
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-[#FAF9F6] border border-[#EAE7E0] rounded-xl">
                      <div>
                        <p className="text-[13.5px] font-bold text-[#1D1B16]">Allow Negative Balance</p>
                        <p className="text-[11px] text-[#6B655C] font-medium mt-0.5">Employees can request more days than accrued.</p>
                      </div>
                      <Toggle checked={form.allowNegativeBalance} onChange={val => setForm({...form, allowNegativeBalance: val})} />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-[#FAF9F6] border border-[#EAE7E0] rounded-xl">
                      <div>
                        <p className="text-[13.5px] font-bold text-[#1D1B16]">Require Documentation</p>
                        <p className="text-[11px] text-[#6B655C] font-medium mt-0.5">Medical certificates or proof required.</p>
                      </div>
                      <Toggle checked={form.requiresAttachment} onChange={val => setForm({...form, requiresAttachment: val})} />
                    </div>
                  </div>
                  
                  <div className="col-span-1 md:col-span-2 border border-[#EAE7E0] rounded-xl overflow-hidden mt-2">
                    <div className="bg-[#FAF9F6] px-6 py-4 border-b border-[#EAE7E0]">
                      <h3 className="text-[13px] font-bold text-[#1D1B16] uppercase tracking-wider">Carry Forward Rules</h3>
                    </div>
                    <div className="p-6 bg-white">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                        <div className="flex items-center justify-between w-full h-full">
                          <div>
                            <p className="text-[13.5px] font-bold text-[#1D1B16]">Enable Carry Forward</p>
                            <p className="text-[11px] text-[#6B655C] font-medium mt-0.5">Allow unused days to transfer to next year.</p>
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
                              <label className="block text-[11px] font-bold text-[#6B655C] uppercase tracking-wider mb-2">Max Carry Forward (Days)</label>
                              <input 
                                type="number" min="0" step="0.5"
                                value={form.maxCarryForward} onChange={e => setForm({...form, maxCarryForward: e.target.value})}
                                className="w-full p-4 bg-[#FAF9F6] border border-[#EAE7E0] rounded-xl focus:ring-2 focus:ring-[#1F2B4D] outline-none text-[#1D1B16] font-bold transition-all"
                              />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-8 border-t border-[#F4F1EA]">
                  <button 
                    type="button" 
                    onClick={() => setIsEditing(false)}
                    className="px-6 py-3 border border-[#EAE7E0] bg-white text-[#1D1B16] font-bold rounded-xl hover:bg-[#FAF9F6] transition-colors active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="relative overflow-hidden group flex items-center justify-center gap-2 bg-[#1F2B4D] border border-[#141C33] text-white px-8 py-3 rounded-xl font-bold shadow-md transition-all duration-300 active:scale-95 whitespace-nowrap"
                  >
                    <span className="absolute inset-0 bg-[#0F172A] translate-y-[100%] group-hover:translate-y-0 transition-transform duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) z-0" />
                    <span className="relative z-10 text-white">Save Policy</span>
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
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {loading ? (
               <div className="col-span-full py-12 text-center text-[#6B655C] font-medium">Loading Policies...</div>
            ) : policies.length === 0 ? (
               <div className="col-span-full py-20 text-center">
                 <motion.div 
                   initial={{ opacity: 0, scale: 0.9 }}
                   animate={{ opacity: 1, scale: 1 }}
                   className="flex flex-col items-center gap-4"
                 >
                   <div className="w-16 h-16 rounded-full bg-[#F4F1EA] border border-[#EAE7E0] shadow-sm flex items-center justify-center">
                     <ShieldAlert size={28} className="text-[#9A948A]" />
                   </div>
                   <div>
                     <span className="text-[19px] font-bold text-[#1D1B16] block tracking-tight">No Policies Configured</span>
                     <span className="text-[13px] text-[#6B655C] font-medium mt-1 block">Create your first time-off policy to get started.</span>
                   </div>
                 </motion.div>
               </div>
            ) : (
               policies.map(p => (
                 <div key={p.id} className="intro-policy-card double-bezel-outer bg-[#F4F1EA] p-1.5 group hover:-translate-y-[2px] transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1)">
                   <div className={`double-bezel-inner relative overflow-hidden flex flex-col justify-between h-full p-6 transition-colors ${p.isPaid ? 'bg-white' : 'bg-white'}`}>
                     {p.isPaid && <div className="absolute inset-0 bg-[#10B981] opacity-[0.03] pointer-events-none" />}
                     
                     <div>
                       <div className="flex justify-between items-start mb-6">
                         <h3 className="text-xl font-bold text-[#1D1B16] tracking-tight">{p.name}</h3>
                         <span className={`px-3 py-1 rounded-[6px] text-[10px] uppercase font-bold tracking-wider border shadow-xs ${p.isPaid ? 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]' : 'bg-[#F0F3F9] text-[#1F2B4D] border-[#EAE7E0]'}`}>
                           {p.isPaid ? 'Paid' : 'Unpaid'}
                         </span>
                       </div>
                       
                       <div className="space-y-4">
                         <div className="flex justify-between text-[13.5px]">
                           <span className="text-[#9A948A] font-bold uppercase tracking-wider text-[11px]">Annual Quota</span>
                           <span className="font-bold text-[#1D1B16]">{p.annualQuota} Days</span>
                         </div>
                         <div className="h-px w-full bg-[#F4F1EA]"></div>
                         <div className="flex justify-between text-[13.5px]">
                           <span className="text-[#9A948A] font-bold uppercase tracking-wider text-[11px]">Carry Forward</span>
                           <span className="font-bold text-[#1D1B16]">{p.carryForward ? `${p.maxCarryForward} Days` : 'Disabled'}</span>
                         </div>
                         <div className="h-px w-full bg-[#F4F1EA]"></div>
                         <div className="flex justify-between text-[13.5px]">
                           <span className="text-[#9A948A] font-bold uppercase tracking-wider text-[11px]">Negative Bal.</span>
                           <span className={`font-bold ${p.allowNegativeBalance ? 'text-[#065F46]' : 'text-[#6B655C]'}`}>{p.allowNegativeBalance ? 'Allowed' : 'Not Allowed'}</span>
                         </div>
                       </div>
                     </div>
                     
                     <div className="mt-8 flex justify-end gap-2 relative">
                       {/* Slide up action buttons on hover */}
                       <div className="absolute bottom-0 right-0 flex gap-2 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 ease-out">
                         <button 
                           onClick={() => handleEdit(p)}
                           className="p-2.5 text-[#1F2B4D] bg-[#F0F3F9] hover:bg-[#E2E8F0] border border-[#CBD5E1] rounded-xl transition-colors shadow-sm active:scale-95"
                         >
                           <Settings2 size={16} />
                         </button>
                         <button 
                           onClick={() => handleDelete(p.id)}
                           className="p-2.5 text-[#B91C1C] bg-[#FEF2F2] hover:bg-[#FEE2E2] border border-[#FECACA] rounded-xl transition-colors shadow-sm active:scale-95"
                         >
                           <Trash2 size={16} />
                         </button>
                       </div>
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
