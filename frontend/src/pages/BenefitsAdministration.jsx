import React, { useState, useEffect } from 'react';
import { hasPermission } from '../lib/permissions';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { 
  HeartHandshake, 
  ShieldCheck, 
  Plus, 
  DollarSign, 
  Users, 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  Building2, 
  Heart, 
  Smile, 
  Bus, 
  Umbrella, 
  Lock, 
  Edit3, 
  ToggleLeft, 
  ToggleRight, 
  X,
  AlertCircle,
  FileCheck
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const CATEGORIES = ['HEALTH_INSURANCE', 'DENTAL', 'VISION', 'RETIREMENT', 'WELLNESS', 'COMMUTER', 'LIFE_INSURANCE', 'OTHER'];

const CATEGORY_ICONS = {
  HEALTH_INSURANCE: Heart,
  DENTAL: Smile,
  VISION: ShieldCheck,
  RETIREMENT: Building2,
  WELLNESS: Sparkles,
  COMMUTER: Bus,
  LIFE_INSURANCE: Umbrella,
  OTHER: HeartHandshake
};

// Animation Variants
const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 }
  }
};

const fadeInUp = {
  hidden: { opacity: 0, y: 30, scale: 0.98 },
  show: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 300, damping: 24, ease: [0.34, 1.56, 0.64, 1] } 
  }
};

const CustomSelect = ({ value, onChange, options, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className="relative w-full">
      <div 
        className={`w-full px-4 py-3.5 rounded-[16px] bg-white border cursor-pointer text-sm font-bold text-[#1F2B4D] shadow-inner transition-all flex justify-between items-center ${isOpen ? 'border-[#1F2B4D] ring-2 ring-[#1F2B4D]/20' : 'border-[#EAE7E0] hover:border-[#CBD5E1]'}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{selectedOption ? selectedOption.label : placeholder}</span>
        <svg className={`w-4 h-4 text-[#9A948A] transition-transform duration-300 ${isOpen ? 'rotate-180' : 'rotate-0'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="absolute top-full left-0 right-0 mt-2 bg-white border border-[#EAE7E0] rounded-[16px] shadow-xl overflow-hidden z-50 flex flex-col max-h-64 overflow-y-auto custom-scrollbar"
            >
              <div 
                className="px-4 py-3 hover:bg-[#3B82F6] hover:text-white cursor-pointer text-sm font-bold text-[#6B655C] border-b border-[#F4F1EA] transition-colors"
                onClick={() => { onChange(""); setIsOpen(false); }}
              >
                {placeholder}
              </div>
              {options.map((opt) => (
                <div 
                  key={opt.value}
                  className={`px-4 py-3 hover:bg-[#3B82F6] hover:text-white cursor-pointer text-sm font-bold transition-colors flex items-center justify-between ${value === opt.value ? 'bg-[#EFF6FF] text-[#2563EB]' : 'text-[#1F2B4D]'}`}
                  onClick={() => { onChange(opt.value); setIsOpen(false); }}
                >
                  <span className="flex items-center gap-2">{opt.label}</span>
                  {value === opt.value && <div className="w-1.5 h-1.5 rounded-full bg-current" />}
                </div>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

const BenefitsAdministration = ({ user }) => {
  const [activeTab, setActiveTab] = useState('marketplace'); // 'marketplace' | 'my-benefits' | 'manage-plans' | 'roster'
  const [plans, setPlans] = useState([]);
  const [myBenefits, setMyBenefits] = useState([]);
  const [allEnrollments, setAllEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Enroll modal state
  const [selectedPlanForEnroll, setSelectedPlanForEnroll] = useState(null);
  const [coverageTier, setCoverageTier] = useState('INDIVIDUAL');
  const [enrolling, setEnrolling] = useState(false);

  // Admin Plan Modal state
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [planForm, setPlanForm] = useState({
    name: '',
    category: 'HEALTH_INSURANCE',
    description: '',
    providerName: '',
    policyNumber: '',
    tierRates: {
      INDIVIDUAL: { employeeDeduction: 1500, employerContribution: 3000 },
      SPOUSE: { employeeDeduction: 2500, employerContribution: 4500 },
      FAMILY: { employeeDeduction: 4000, employerContribution: 6000 }
    }
  });

  // Admin Custom Deduction Modal state
  const [adjustModalEnrollment, setAdjustModalEnrollment] = useState(null);
  const [customDeductionInput, setCustomDeductionInput] = useState('');

  const isAdmin = hasPermission(user, 'manage_benefits');
  const isManager = hasPermission(user, 'manage_benefits');
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) return;

      const promises = [
        fetch(`${apiBase}/api/benefits/plans`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.ok ? r.json() : []),
        fetch(`${apiBase}/api/benefits/my`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.ok ? r.json() : []),
        isManager ? fetch(`${apiBase}/api/benefits/all`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.ok ? r.json() : []) : Promise.resolve(null)
      ];

      const [plansData, myData, allData] = await Promise.all(promises);
      setPlans(Array.isArray(plansData) ? plansData : []);
      setMyBenefits(Array.isArray(myData) ? myData : []);
      if (allData) setAllEnrollments(Array.isArray(allData) ? allData : []);
    } catch (err) {
      console.error('Error fetching benefits data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.id, isManager]);

  const handleEnrollSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPlanForEnroll) return;

    setEnrolling(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiBase}/api/benefits/enroll`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          planId: selectedPlanForEnroll.id,
          coverageTier
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to enroll in benefit plan');

      toast.success(`🎉 Successfully enrolled in "${selectedPlanForEnroll.name}"!`);
      setSelectedPlanForEnroll(null);
      fetchData();
      setActiveTab('my-benefits');
    } catch (err) {
      toast.error(err.message || 'Enrollment failed');
    } finally {
      setEnrolling(false);
    }
  };

  const handleCancelEnrollment = async (enrollmentId) => {
    if (!await window.confirmDialog()) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiBase}/api/benefits/enrollments/${enrollmentId}/cancel`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to cancel enrollment');

      toast.success('Benefit enrollment cancelled successfully');
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Cancellation failed');
    }
  };

  const handleSavePlan = async (e) => {
    e.preventDefault();
    if (!planForm.name) {
      toast.error('Plan name is required.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const isEdit = !!editingPlan;
      const url = isEdit
        ? `${apiBase}/api/benefits/plans/${editingPlan.id}`
        : `${apiBase}/api/benefits/plans`;

      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(planForm)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save benefit plan');

      toast.success(isEdit ? 'Benefit plan updated' : 'Benefit plan created');
      setIsPlanModalOpen(false);
      setEditingPlan(null);
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to save plan');
    }
  };

  const handleTogglePlan = async (planId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiBase}/api/benefits/plans/${planId}/toggle`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to toggle plan status');

      toast.success(`Plan "${data.name}" ${data.isActive ? 'activated' : 'deactivated'}`);
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Toggle failed');
    }
  };

  const handleAdjustDeductionSubmit = async (e) => {
    e.preventDefault();
    if (!adjustModalEnrollment) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiBase}/api/benefits/enrollments/${adjustModalEnrollment.id}/adjust-deduction`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          customDeduction: customDeductionInput === '' ? null : Number(customDeductionInput)
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to adjust deduction');

      toast.success('Payroll deduction rate adjusted successfully');
      setAdjustModalEnrollment(null);
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Adjustment failed');
    }
  };

  const handleSeedDefaults = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiBase}/api/benefits/plans/seed-defaults`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to seed default benefit plans');

      toast.success('🎉 Successfully seeded default benefit plans!');
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Seeding failed');
    }
  };

  // Total monthly deduction calculation for My Benefits
  const totalMyMonthlyDeduction = myBenefits.reduce((acc, eb) => {
    const rates = eb.plan?.tierRates?.[eb.coverageTier] || {};
    const empAmt = eb.customDeduction !== null ? Number(eb.customDeduction) : Number(rates.employeeDeduction || 0);
    return acc + empAmt;
  }, 0);

  return (
    <div className="p-4 md:p-8 max-w-[1500px] mx-auto min-h-screen bg-transparent overflow-hidden">
      <motion.div 
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="space-y-8"
      >
        {/* ── TOP EXECUTIVE HEADER ── */}
        <motion.div variants={fadeInUp} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-5 border-b border-[#EAE7E0]">
          <div>
            <h1 className="font-serif font-bold text-3xl md:text-4xl text-[#1F2B4D] tracking-tight leading-none flex items-center gap-3">
              <div className="p-2.5 bg-white rounded-xl shadow-sm border border-[#EAE7E0]">
                <HeartHandshake className="text-[#1F2B4D]" size={28} />
              </div>
              Benefits Administration
            </h1>
            <p className="text-[#6B655C] mt-2.5 font-medium ml-2">
              Explore health plans, manage coverage tiers, and integrate deductions seamlessly with payroll.
            </p>
          </div>

          {/* iOS-Style Segmented Control Tabs */}
          <div className="flex p-1.5 bg-white border-[2px] border-[#EAE7E0] rounded-[20px] shadow-sm relative overflow-x-auto custom-scrollbar">
            {['marketplace', 'my-benefits', 'manage-plans', 'roster'].map((tab) => {
              if (tab === 'manage-plans' && !isAdmin) return null;
              if (tab === 'roster' && !isManager) return null;
              
              const labels = {
                'marketplace': 'Marketplace',
                'my-benefits': `My Benefits (${myBenefits.length})`,
                'manage-plans': 'Manage Plans',
                'roster': 'Enrollment Roster'
              };
              const icons = {
                'marketplace': <Sparkles size={16} />,
                'my-benefits': <ShieldCheck size={16} />,
                'manage-plans': <Edit3 size={16} />,
                'roster': <Users size={16} />
              };
              
              const isActive = activeTab === tab;
              
              return (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab);
                    if (tab === 'manage-plans') {
                      const token = localStorage.getItem('token');
                      fetch(`${apiBase}/api/benefits/plans?scope=all`, { headers: { 'Authorization': `Bearer ${token}` } })
                        .then(res => res.ok ? res.json() : [])
                        .then(data => setPlans(data));
                    }
                  }}
                  className={`relative z-10 px-6 py-2.5 rounded-[14px] text-xs font-display font-bold uppercase tracking-wider flex items-center gap-2 transition-colors duration-300 whitespace-nowrap ${
                    isActive ? 'text-[#1F2B4D]' : 'text-[#9A948A] hover:text-[#1F2B4D]'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="benefitsTabIndicator"
                      className="absolute inset-0 bg-[#FAF8F5] border border-[#EAE7E0] rounded-[14px] shadow-2xs z-[-1]"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  {icons[tab]}
                  {labels[tab]}
                </button>
              );
            })}
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {/* TAB 1: BENEFIT MARKETPLACE */}
          {activeTab === 'marketplace' && (
            <motion.div
              key="marketplace"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
              className="flex flex-col gap-6"
            >
              {loading ? (
                <div className="flex items-center justify-center p-12">
                   <div className="w-8 h-8 border-4 border-[#1F2B4D]/20 border-t-[#1F2B4D] rounded-full animate-spin"></div>
                </div>
              ) : plans.length === 0 ? (
                <motion.div variants={fadeInUp} className="bg-white border-[2px] border-[#EAE7E0] p-12 text-center rounded-[32px] shadow-sm flex flex-col items-center justify-center gap-4 transition-all hover:shadow-lg hover:-translate-y-1">
                  <div className="w-20 h-20 rounded-[24px] bg-[#FAF8F5] text-[#1F2B4D] flex items-center justify-center font-bold border border-[#EAE7E0] shadow-inner mb-2">
                    <HeartHandshake size={40} />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-2xl text-[#1F2B4D]">No Benefit Plans Available</h3>
                    <p className="text-sm font-medium text-[#6B655C] max-w-md mx-auto mt-2">
                      {isAdmin
                        ? 'No benefit plans are currently configured for your company. Click below to seed the standard default plans.'
                        : 'No benefit plans have been set up yet — please check back soon or contact HR.'}
                    </p>
                  </div>
                  {isAdmin && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleSeedDefaults}
                      className="mt-4 bg-[#1F2B4D] text-white font-display font-bold text-sm rounded-[20px] gap-2 px-8 py-4 shadow-[0_8px_16px_rgba(31,43,77,0.15)] hover:shadow-[0_16px_32px_rgba(31,43,77,0.25)] flex items-center transition-all group overflow-hidden relative"
                    >
                      <span className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out pointer-events-none"></span>
                      <span className="relative z-10 flex items-center gap-2">
                         <Sparkles size={18} /> Seed Default Benefit Plans
                      </span>
                    </motion.button>
                  )}
                </motion.div>
              ) : (
                <motion.div 
                  variants={staggerContainer}
                  initial="hidden"
                  animate="show"
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                  {plans.map((plan) => {
                    const IconComponent = CATEGORY_ICONS[plan.category] || HeartHandshake;
                    const isEnrolled = myBenefits.some(eb => eb.planId === plan.id);
                    const rates = plan.tierRates || {};

                    return (
                      <motion.div 
                        variants={fadeInUp}
                        key={plan.id} 
                        className="bg-white p-6 rounded-[28px] border-[2px] border-[#EAE7E0] shadow-sm flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-[0px_24px_48px_-12px_rgba(31,43,77,0.15)] group relative overflow-hidden"
                      >
                        <div>
                          <div className="flex justify-between items-start mb-5">
                            <div className="w-14 h-14 rounded-[20px] bg-[#FAF8F5] border border-[#EAE7E0] text-[#1F2B4D] flex items-center justify-center font-bold shadow-2xs group-hover:bg-[#1F2B4D] group-hover:text-white transition-colors duration-300">
                              <IconComponent size={26} />
                            </div>
                            <span className="px-3 py-1.5 text-[10px] font-display font-bold uppercase tracking-widest rounded-full border shadow-2xs bg-indigo-50 text-indigo-800 border-indigo-200">
                              {plan.category.replace('_', ' ')}
                            </span>
                          </div>

                          <h3 className="font-serif font-bold text-xl text-[#1F2B4D] mb-1.5 group-hover:text-indigo-700 transition-colors pr-2">{plan.name}</h3>
                          {plan.providerName && <p className="text-xs font-display font-bold uppercase tracking-wider text-[#9A948A] mb-3">{plan.providerName}</p>}
                          <p className="text-sm font-medium text-[#6B655C] line-clamp-2 mb-6 leading-relaxed">{plan.description || 'Comprehensive coverage plan for employees.'}</p>

                          {/* Tier Rates Matrix Preview */}
                          <div className="bg-[#FAF8F5] border-[2px] border-[#EAE7E0] rounded-[20px] p-4 flex flex-col gap-3 text-xs shadow-inner">
                            <div className="flex justify-between items-center">
                              <span className="font-display font-bold text-[#9A948A] uppercase tracking-wider text-[10px]">Individual Tier</span>
                              <span className="font-bold text-[#1F2B4D]">₹{(rates.INDIVIDUAL?.employeeDeduction || 0).toLocaleString()}/mo</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="font-display font-bold text-[#9A948A] uppercase tracking-wider text-[10px]">Company Covered</span>
                              <span className="font-bold text-emerald-600">₹{(rates.INDIVIDUAL?.employerContribution || 0).toLocaleString()}/mo</span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-6 pt-5 border-t border-[#F4F1EA]">
                          {isEnrolled ? (
                            <div className="flex items-center justify-center gap-2 py-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-[16px] font-display font-bold text-xs uppercase tracking-wider shadow-inner">
                              <CheckCircle2 size={16} /> Enrolled & Active
                            </div>
                          ) : (
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => {
                                setSelectedPlanForEnroll(plan);
                                setCoverageTier('INDIVIDUAL');
                              }}
                              className="w-full py-3.5 bg-[#1F2B4D] text-white font-display font-bold rounded-[16px] text-xs uppercase tracking-wider gap-2 flex items-center justify-center shadow-md hover:shadow-lg transition-all group relative overflow-hidden"
                            >
                              <span className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out pointer-events-none"></span>
                              <span className="relative z-10 flex items-center gap-2"><Plus size={16} /> Enroll in Coverage</span>
                            </motion.button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </motion.div>
          )}

          {/* TAB 2: MY BENEFITS */}
          {activeTab === 'my-benefits' && (
            <motion.div
              key="my-benefits"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
              className="flex flex-col gap-6"
            >
              {/* Summary Banner */}
              <motion.div variants={fadeInUp} className="p-8 rounded-[32px] border border-[#1F2B4D]/20 bg-[#1F2B4D] text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-2xl relative overflow-hidden">
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/20 blur-3xl rounded-full pointer-events-none"></div>
                <div className="relative z-10">
                  <h2 className="font-serif font-bold text-3xl mb-2">My Active Benefit Coverage</h2>
                  <p className="text-indigo-200 text-sm font-medium">Total active enrollments automatically deducted during monthly payroll run.</p>
                </div>
                <div className="relative z-10 bg-white/10 backdrop-blur-md px-8 py-5 rounded-[24px] border border-white/20 shadow-inner flex flex-col items-center md:items-end">
                  <span className="text-[10px] text-indigo-200 uppercase font-display font-bold tracking-widest block mb-1">Monthly Payroll Deduction</span>
                  <span className="text-4xl font-bold tracking-tight text-white">₹{totalMyMonthlyDeduction.toLocaleString()}</span>
                </div>
              </motion.div>

              <motion.div 
                variants={staggerContainer}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {myBenefits.map((eb) => {
                  const rates = eb.plan?.tierRates?.[eb.coverageTier] || {};
                  const empAmt = eb.customDeduction !== null ? Number(eb.customDeduction) : Number(rates.employeeDeduction || 0);
                  const erAmt = Number(rates.employerContribution || 0);

                  return (
                    <motion.div variants={fadeInUp} key={eb.id} className="bg-white p-6 rounded-[28px] border-[2px] border-[#EAE7E0] shadow-sm flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-[0px_24px_48px_-12px_rgba(31,43,77,0.15)] group">
                      <div>
                        <div className="flex justify-between items-start mb-5">
                          <div>
                            <span className="px-3 py-1.5 rounded-full text-[9px] font-display font-bold uppercase tracking-widest bg-indigo-50 border border-indigo-200 text-indigo-800 shadow-2xs">
                              {eb.coverageTier} COVERAGE
                            </span>
                            <h3 className="font-serif font-bold text-xl text-[#1F2B4D] mt-4 mb-1 group-hover:text-indigo-700 transition-colors">{eb.plan.name}</h3>
                            {eb.plan.providerName && <p className="text-[11px] font-display font-bold uppercase tracking-wider text-[#9A948A]">{eb.plan.providerName}</p>}
                          </div>
                          <span className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-display font-bold uppercase tracking-wider rounded-full shadow-2xs">ACTIVE</span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 bg-[#FAF8F5] p-5 rounded-[20px] border-[2px] border-[#EAE7E0] text-xs mb-6 shadow-inner">
                          <div>
                            <span className="text-[#9A948A] block text-[10px] uppercase font-display font-bold tracking-wider mb-1">Your Payroll Cost</span>
                            <span className="text-lg font-bold text-[#1F2B4D]">₹{empAmt.toLocaleString()}<span className="text-xs text-[#9A948A] font-medium">/mo</span></span>
                          </div>
                          <div>
                            <span className="text-[#9A948A] block text-[10px] uppercase font-display font-bold tracking-wider mb-1">Company Covered</span>
                            <span className="text-lg font-bold text-emerald-600">₹{erAmt.toLocaleString()}<span className="text-xs text-emerald-600/50 font-medium">/mo</span></span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-5 border-t border-[#F4F1EA] flex justify-between items-center">
                        <span className="text-[11px] text-[#6B655C] font-display font-bold uppercase tracking-wider">Since {format(new Date(eb.enrolledAt), 'MMM d, yy')}</span>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleCancelEnrollment(eb.id)}
                          className="text-[10px] font-display font-bold uppercase tracking-wider text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-4 py-2.5 rounded-[12px] transition-colors shadow-2xs"
                        >
                          Opt-Out / Cancel
                        </motion.button>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            </motion.div>
          )}

          {/* TAB 3: MANAGE PLANS (ADMIN ONLY) */}
          {activeTab === 'manage-plans' && isAdmin && (
            <motion.div
              key="manage-plans"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
              className="flex flex-col gap-6"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#EAE7E0] pb-6">
                <div>
                  <h2 className="font-serif font-bold text-3xl text-[#1F2B4D]">Company Benefit Offerings</h2>
                  <p className="text-sm font-medium text-[#6B655C] mt-1">Configure benefit plans, tier pricing matrices, and toggle active enrollment status.</p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setEditingPlan(null);
                    setPlanForm({
                      name: '',
                      category: 'HEALTH_INSURANCE',
                      description: '',
                      providerName: '',
                      policyNumber: '',
                      tierRates: {
                        INDIVIDUAL: { employeeDeduction: 1500, employerContribution: 3000 },
                        SPOUSE: { employeeDeduction: 2500, employerContribution: 4500 },
                        FAMILY: { employeeDeduction: 4000, employerContribution: 6000 }
                      }
                    });
                    setIsPlanModalOpen(true);
                  }}
                  className="mt-4 sm:mt-0 bg-[#1F2B4D] hover:bg-[#141C33] text-white font-display font-bold text-xs uppercase tracking-wider rounded-[16px] px-6 py-3.5 shadow-md transition-all flex items-center gap-2"
                >
                  <Plus size={16} /> Create Benefit Plan
                </motion.button>
              </div>

              <div className="bg-white border-[2px] border-[#EAE7E0] rounded-[32px] overflow-hidden shadow-sm transition-all duration-500 hover:shadow-lg">
                <div className="overflow-x-auto p-2 bg-[#FAF8F5]">
                  <table className="w-full text-left border-separate border-spacing-y-2 min-w-[1000px]">
                    <thead>
                      <tr>
                        <th className="px-6 py-4 text-[10px] font-display font-bold text-[#9A948A] uppercase tracking-wider">Plan Name</th>
                        <th className="px-6 py-4 text-[10px] font-display font-bold text-[#9A948A] uppercase tracking-wider">Category</th>
                        <th className="px-6 py-4 text-[10px] font-display font-bold text-[#9A948A] uppercase tracking-wider">Individual Rate</th>
                        <th className="px-6 py-4 text-[10px] font-display font-bold text-[#9A948A] uppercase tracking-wider">Family Rate</th>
                        <th className="px-6 py-4 text-[10px] font-display font-bold text-[#9A948A] uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-[10px] font-display font-bold text-[#9A948A] uppercase tracking-wider text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plans.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-20 text-center bg-white rounded-[24px]">
                            <div className="flex flex-col items-center justify-center">
                              <Building2 className="w-12 h-12 text-[#9A948A] mb-4 opacity-50" />
                              <span className="text-[#1F2B4D] font-serif font-bold text-2xl">No Plans Configured</span>
                              <span className="text-[#6B655C] font-medium text-sm mt-2">Create a new plan to start offering benefits.</span>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        <AnimatePresence>
                          {plans.map((plan, i) => {
                            const rates = plan.tierRates || {};
                            return (
                              <motion.tr 
                                key={plan.id}
                                initial={{ opacity: 0, scale: 0.99 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: i * 0.05 }}
                                className="bg-white hover:bg-[#F0F3F9] transition-all group shadow-2xs hover:shadow-md cursor-pointer"
                              >
                                <td className="px-6 py-5 rounded-l-[20px] border-y border-l border-transparent group-hover:border-[#CBD5E1]">
                                  <div className="font-serif font-bold text-lg text-[#1F2B4D] group-hover:text-indigo-700 transition-colors">
                                    {plan.name}
                                  </div>
                                  {plan.providerName && <div className="text-[10px] font-display font-bold uppercase tracking-wider text-[#9A948A] mt-1">{plan.providerName}</div>}
                                </td>
                                <td className="px-6 py-5 border-y border-transparent group-hover:border-[#CBD5E1]">
                                  <span className="px-2.5 py-1 rounded-full text-[9px] font-display font-bold uppercase tracking-widest bg-slate-100 border border-slate-200 text-slate-600 shadow-2xs">
                                    {plan.category.replace('_', ' ')}
                                  </span>
                                </td>
                                <td className="px-6 py-5 border-y border-transparent group-hover:border-[#CBD5E1]">
                                  <div className="text-xs font-bold text-[#1F2B4D]">
                                    ₹{(rates.INDIVIDUAL?.employeeDeduction || 0).toLocaleString()} <span className="text-[#9A948A] font-medium">/</span> <span className="text-emerald-600">₹{(rates.INDIVIDUAL?.employerContribution || 0).toLocaleString()}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-5 border-y border-transparent group-hover:border-[#CBD5E1]">
                                  <div className="text-xs font-bold text-[#1F2B4D]">
                                    ₹{(rates.FAMILY?.employeeDeduction || 0).toLocaleString()} <span className="text-[#9A948A] font-medium">/</span> <span className="text-emerald-600">₹{(rates.FAMILY?.employerContribution || 0).toLocaleString()}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-5 border-y border-transparent group-hover:border-[#CBD5E1]">
                                  <span className={`px-3 py-1.5 rounded-full text-[10px] font-display font-bold uppercase tracking-wider shadow-2xs border ${
                                    plan.isActive ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'
                                  }`}>
                                    {plan.isActive ? 'Active' : 'Deactivated'}
                                  </span>
                                </td>
                                <td className="px-6 py-5 text-right rounded-r-[20px] border-y border-r border-transparent group-hover:border-[#CBD5E1] flex items-center justify-end gap-3">
                                  <button
                                    onClick={() => {
                                      setEditingPlan(plan);
                                      setPlanForm({
                                        name: plan.name,
                                        category: plan.category,
                                        description: plan.description || '',
                                        providerName: plan.providerName || '',
                                        policyNumber: plan.policyNumber || '',
                                        tierRates: plan.tierRates || {}
                                      });
                                      setIsPlanModalOpen(true);
                                    }}
                                    className="p-2.5 bg-white border border-[#EAE7E0] text-[#6B655C] hover:text-[#1F2B4D] hover:bg-[#FAF8F5] hover:border-[#1F2B4D] rounded-[14px] transition-all shadow-sm"
                                  >
                                    <Edit3 size={16} />
                                  </button>
                                  <button
                                    onClick={() => handleTogglePlan(plan.id)}
                                    className="p-2.5 bg-white border border-[#EAE7E0] hover:bg-[#FAF8F5] hover:border-[#1F2B4D] rounded-[14px] transition-all shadow-sm group/toggle"
                                    title={plan.isActive ? 'Deactivate plan' : 'Activate plan'}
                                  >
                                    {plan.isActive ? <ToggleRight size={20} className="text-emerald-600 group-hover/toggle:text-emerald-700" /> : <ToggleLeft size={20} className="text-[#9A948A] group-hover/toggle:text-[#1F2B4D]" />}
                                  </button>
                                </td>
                              </motion.tr>
                            );
                          })}
                        </AnimatePresence>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 4: ENROLLMENT ROSTER */}
          {activeTab === 'roster' && isManager && (
            <motion.div
              key="roster"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
              className="flex flex-col gap-6"
            >
              <div className="border-b border-[#EAE7E0] pb-6">
                <h2 className="font-serif font-bold text-3xl text-[#1F2B4D]">Company Benefit Enrollments</h2>
                <p className="text-sm font-medium text-[#6B655C] mt-1">Review active employee enrollments and override payroll deduction rates if necessary.</p>
              </div>

              <div className="bg-white border-[2px] border-[#EAE7E0] rounded-[32px] overflow-hidden shadow-sm transition-all duration-500 hover:shadow-lg">
                <div className="overflow-x-auto p-2 bg-[#FAF8F5]">
                  <table className="w-full text-left border-separate border-spacing-y-2 min-w-[1000px]">
                    <thead>
                      <tr>
                        <th className="px-6 py-4 text-[10px] font-display font-bold text-[#9A948A] uppercase tracking-wider">Employee</th>
                        <th className="px-6 py-4 text-[10px] font-display font-bold text-[#9A948A] uppercase tracking-wider">Benefit Plan</th>
                        <th className="px-6 py-4 text-[10px] font-display font-bold text-[#9A948A] uppercase tracking-wider">Coverage Tier</th>
                        <th className="px-6 py-4 text-[10px] font-display font-bold text-[#9A948A] uppercase tracking-wider">Employee Deduction</th>
                        <th className="px-6 py-4 text-[10px] font-display font-bold text-[#9A948A] uppercase tracking-wider">Employer Share</th>
                        {isAdmin && <th className="px-6 py-4 text-[10px] font-display font-bold text-[#9A948A] uppercase tracking-wider text-right">Overrides</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {allEnrollments.length === 0 ? (
                        <tr>
                          <td colSpan={isAdmin ? 6 : 5} className="p-20 text-center bg-white rounded-[24px]">
                             <div className="flex flex-col items-center justify-center">
                              <Users className="w-12 h-12 text-[#9A948A] mb-4 opacity-50" />
                              <span className="text-[#1F2B4D] font-serif font-bold text-2xl">No Active Enrollments</span>
                              <span className="text-[#6B655C] font-medium text-sm mt-2">Employees haven't enrolled in any benefits yet.</span>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        <AnimatePresence>
                          {allEnrollments.map((eb, i) => {
                            const rates = eb.plan?.tierRates?.[eb.coverageTier] || {};
                            const empAmt = eb.customDeduction !== null ? Number(eb.customDeduction) : Number(rates.employeeDeduction || 0);
                            const erAmt = Number(rates.employerContribution || 0);
                            const isOverridden = eb.customDeduction !== null;

                            return (
                              <motion.tr 
                                key={eb.id}
                                initial={{ opacity: 0, scale: 0.99 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: i * 0.05 }}
                                className="bg-white hover:bg-[#F0F3F9] transition-all group shadow-2xs hover:shadow-md cursor-pointer"
                              >
                                <td className="px-6 py-5 rounded-l-[20px] border-y border-l border-transparent group-hover:border-[#CBD5E1]">
                                  <div className="flex flex-col">
                                    <span className="font-bold text-sm text-[#1F2B4D]">{eb.user?.displayName || 'Unknown'}</span>
                                    <span className="text-[10px] font-display font-bold uppercase tracking-wider text-[#9A948A] mt-0.5">{eb.user?.jobPosition || 'Employee'}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-5 border-y border-transparent group-hover:border-[#CBD5E1]">
                                  <span className="font-serif font-bold text-lg text-[#1F2B4D]">{eb.plan?.name || 'Unknown Plan'}</span>
                                </td>
                                <td className="px-6 py-5 border-y border-transparent group-hover:border-[#CBD5E1]">
                                  <span className="px-2.5 py-1 rounded-full text-[9px] font-display font-bold uppercase tracking-widest bg-indigo-50 border border-indigo-200 text-indigo-800 shadow-2xs">
                                    {eb.coverageTier}
                                  </span>
                                </td>
                                <td className="px-6 py-5 border-y border-transparent group-hover:border-[#CBD5E1]">
                                  <div className="flex items-center gap-2">
                                    <span className={`font-bold text-sm ${isOverridden ? 'text-amber-600' : 'text-[#1F2B4D]'}`}>
                                      ₹{empAmt.toLocaleString()}
                                    </span>
                                    {isOverridden && (
                                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[9px] font-display font-bold uppercase tracking-wider rounded-md border border-amber-200">Override</span>
                                    )}
                                  </div>
                                </td>
                                <td className={`px-6 py-5 border-y border-transparent group-hover:border-[#CBD5E1] ${!isAdmin ? 'rounded-r-[20px] border-r' : ''}`}>
                                  <span className="font-bold text-sm text-emerald-600">₹{erAmt.toLocaleString()}</span>
                                </td>
                                {isAdmin && (
                                  <td className="px-6 py-5 text-right rounded-r-[20px] border-y border-r border-transparent group-hover:border-[#CBD5E1]">
                                    <button
                                      onClick={() => {
                                        setAdjustModalEnrollment(eb);
                                        setCustomDeductionInput(eb.customDeduction !== null ? eb.customDeduction.toString() : '');
                                      }}
                                      className="inline-flex items-center gap-1.5 text-[10px] font-display font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-2 rounded-[12px] transition-colors shadow-2xs"
                                    >
                                      <DollarSign size={14} /> Adjust Deduction
                                    </button>
                                  </td>
                                )}
                              </motion.tr>
                            );
                          })}
                        </AnimatePresence>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── ENROLLMENT CONFIRMATION MODAL ── */}
      <AnimatePresence>
        {selectedPlanForEnroll && (
          <div className="fixed inset-0 z-50 bg-[#101520]/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="bg-white rounded-[36px] max-w-lg w-full p-8 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] border-t border-t-white/40"
            >
              <div className="flex justify-between items-center mb-6">
                <div className="w-12 h-12 bg-[#FAF8F5] border border-[#EAE7E0] rounded-[20px] flex items-center justify-center text-[#1F2B4D] shadow-inner">
                  <ShieldCheck size={24} />
                </div>
                <button onClick={() => setSelectedPlanForEnroll(null)} className="text-[#9A948A] hover:text-[#1F2B4D] bg-[#FAF8F5] p-2 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <h3 className="font-serif font-bold text-3xl text-[#1F2B4D] mb-2 leading-tight">Confirm Enrollment</h3>
              <p className="text-[#6B655C] text-sm font-medium mb-8">
                You are about to enroll in <strong>{selectedPlanForEnroll.name}</strong>. Please select your required coverage tier.
              </p>

              <form onSubmit={handleEnrollSubmit} className="space-y-6">
                <div className="group">
                  <label className="text-[11px] font-display font-bold text-[#9A948A] uppercase tracking-wider block mb-3 transition-colors group-focus-within:text-[#1F2B4D]">Coverage Tier</label>
                  <CustomSelect 
                    value={coverageTier}
                    onChange={setCoverageTier}
                    placeholder="-- Select Tier --"
                    options={[
                      { value: 'INDIVIDUAL', label: 'Individual (Employee Only)' },
                      { value: 'SPOUSE', label: 'Employee + Spouse' },
                      { value: 'FAMILY', label: 'Family (Employee, Spouse, Children)' }
                    ]}
                  />
                </div>

                <div className="bg-[#FAF8F5] p-5 rounded-[20px] border-[2px] border-[#EAE7E0] shadow-inner mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[#6B655C] text-[11px] font-display font-bold uppercase tracking-wider">Estimated Monthly Deduction:</span>
                    <span className="text-xl font-bold text-[#1F2B4D]">
                      ₹{(selectedPlanForEnroll.tierRates?.[coverageTier]?.employeeDeduction || 0).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#9A948A] font-medium leading-relaxed">
                    By enrolling, you authorize your employer to deduct the above amount from your monthly paycheck post-tax according to company policy.
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" onClick={() => setSelectedPlanForEnroll(null)} className="bg-white hover:bg-[#FAF8F5] text-[#1F2B4D] border border-[#EAE7E0] font-display font-bold text-sm px-6 py-3.5 rounded-[16px] shadow-sm transition-all flex-1">
                    Cancel
                  </Button>
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.95 }}
                    type="submit" 
                    disabled={enrolling} 
                    className="bg-[#1F2B4D] hover:bg-[#141C33] text-white font-display font-bold text-sm px-6 py-3.5 rounded-[16px] shadow-md transition-all flex-1 flex justify-center items-center gap-2"
                  >
                    {enrolling ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle2 size={18} />}
                    {enrolling ? 'Enrolling...' : 'Confirm Enrollment'}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── ADMIN: CREATE/EDIT PLAN MODAL ── */}
      <AnimatePresence>
        {isPlanModalOpen && (
          <div className="fixed inset-0 z-50 bg-[#101520]/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="bg-white rounded-[36px] max-w-2xl w-full p-8 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] border-t border-t-white/40 max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex justify-between items-center pb-6 border-b border-[#F4F1EA] mb-6">
                <div>
                  <h3 className="font-serif font-bold text-3xl text-[#1F2B4D]">
                    {editingPlan ? 'Edit Benefit Plan' : 'Create Benefit Plan'}
                  </h3>
                  <p className="text-sm font-medium text-[#6B655C] mt-1">Design the architecture of your company's benefit offerings.</p>
                </div>
                <button onClick={() => setIsPlanModalOpen(false)} className="text-[#9A948A] hover:text-[#1F2B4D] bg-[#FAF8F5] p-2 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSavePlan} className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="group">
                    <label className="text-[11px] font-display font-bold text-[#9A948A] uppercase tracking-wider block mb-2 transition-colors group-focus-within:text-[#1F2B4D]">Plan Name</label>
                    <Input
                      required
                      placeholder="e.g. Premium Health Cover"
                      value={planForm.name}
                      onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                      className="w-full px-4 py-3.5 rounded-2xl bg-white border border-[#EAE7E0] text-sm font-bold text-[#1F2B4D] shadow-inner focus:ring-2 focus:ring-[#1F2B4D]"
                    />
                  </div>
                  <div className="group">
                    <label className="text-[11px] font-display font-bold text-[#9A948A] uppercase tracking-wider block mb-2 transition-colors group-focus-within:text-[#1F2B4D]">Category</label>
                    <CustomSelect 
                      value={planForm.category}
                      onChange={(val) => setPlanForm({ ...planForm, category: val })}
                      placeholder="-- Category --"
                      options={CATEGORIES.map(c => ({ value: c, label: c.replace('_', ' ') }))}
                    />
                  </div>
                </div>

                <div className="group">
                  <label className="text-[11px] font-display font-bold text-[#9A948A] uppercase tracking-wider block mb-2 transition-colors group-focus-within:text-[#1F2B4D]">Description</label>
                  <textarea
                    rows={2}
                    value={planForm.description}
                    onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                    className="w-full bg-white border border-[#EAE7E0] text-[#1F2B4D] text-sm font-medium rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-[#1F2B4D] shadow-inner resize-y"
                    placeholder="Brief overview of plan coverage..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="group">
                    <label className="text-[11px] font-display font-bold text-[#9A948A] uppercase tracking-wider block mb-2 transition-colors group-focus-within:text-[#1F2B4D]">Provider/Vendor Name</label>
                    <Input
                      placeholder="e.g. BlueCross"
                      value={planForm.providerName}
                      onChange={(e) => setPlanForm({ ...planForm, providerName: e.target.value })}
                      className="w-full px-4 py-3.5 rounded-2xl bg-white border border-[#EAE7E0] text-sm font-bold text-[#1F2B4D] shadow-inner focus:ring-2 focus:ring-[#1F2B4D]"
                    />
                  </div>
                  <div className="group">
                    <label className="text-[11px] font-display font-bold text-[#9A948A] uppercase tracking-wider block mb-2 transition-colors group-focus-within:text-[#1F2B4D]">Group Policy Number</label>
                    <Input
                      placeholder="Optional"
                      value={planForm.policyNumber}
                      onChange={(e) => setPlanForm({ ...planForm, policyNumber: e.target.value })}
                      className="w-full px-4 py-3.5 rounded-2xl bg-white border border-[#EAE7E0] text-sm font-bold text-[#1F2B4D] shadow-inner focus:ring-2 focus:ring-[#1F2B4D]"
                    />
                  </div>
                </div>

                {/* Tier Rates Config */}
                <div className="mt-8">
                  <h4 className="text-[11px] font-display font-bold text-[#1F2B4D] uppercase tracking-wider block mb-4 border-b border-[#F4F1EA] pb-2">Coverage Tier Pricing (Monthly ₹)</h4>
                  <div className="space-y-4">
                    {['INDIVIDUAL', 'SPOUSE', 'FAMILY'].map(tier => (
                      <div key={tier} className="bg-[#FAF8F5] p-4 rounded-[20px] border-[2px] border-[#EAE7E0] shadow-inner flex items-center gap-4">
                        <div className="w-24">
                          <span className="text-[10px] font-display font-bold uppercase tracking-wider text-[#1F2B4D]">{tier}</span>
                        </div>
                        <div className="flex-1 group">
                          <label className="text-[9px] font-display font-bold text-[#9A948A] uppercase tracking-wider block mb-1">Emp Deduction</label>
                          <Input
                            type="number"
                            value={planForm.tierRates[tier].employeeDeduction}
                            onChange={(e) => setPlanForm({
                              ...planForm,
                              tierRates: {
                                ...planForm.tierRates,
                                [tier]: { ...planForm.tierRates[tier], employeeDeduction: Number(e.target.value) }
                              }
                            })}
                            className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#EAE7E0] text-sm font-bold text-[#1F2B4D] shadow-inner h-10 focus:ring-2 focus:ring-[#1F2B4D]"
                          />
                        </div>
                        <div className="flex-1 group">
                          <label className="text-[9px] font-display font-bold text-[#9A948A] uppercase tracking-wider block mb-1">Co. Share</label>
                          <Input
                            type="number"
                            value={planForm.tierRates[tier].employerContribution}
                            onChange={(e) => setPlanForm({
                              ...planForm,
                              tierRates: {
                                ...planForm.tierRates,
                                [tier]: { ...planForm.tierRates[tier], employerContribution: Number(e.target.value) }
                              }
                            })}
                            className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#EAE7E0] text-sm font-bold text-[#1F2B4D] shadow-inner h-10 focus:ring-2 focus:ring-[#1F2B4D]"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-[#F4F1EA]">
                  <Button type="button" onClick={() => setIsPlanModalOpen(false)} className="bg-white hover:bg-[#FAF8F5] text-[#1F2B4D] border border-[#EAE7E0] font-display font-bold text-sm px-6 py-3.5 rounded-[16px] shadow-sm transition-all">
                    Cancel
                  </Button>
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.95 }}
                    type="submit" 
                    className="bg-[#1F2B4D] hover:bg-[#141C33] text-white font-display font-bold text-sm px-8 py-3.5 rounded-[16px] shadow-md transition-all flex items-center gap-2"
                  >
                    <CheckCircle2 size={18} /> Save Plan Architecture
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── ADMIN: ADJUST DEDUCTION MODAL ── */}
      <AnimatePresence>
        {adjustModalEnrollment && (
          <div className="fixed inset-0 z-50 bg-[#101520]/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="bg-white rounded-[36px] max-w-md w-full p-8 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] border-t border-t-white/40"
            >
              <div className="flex justify-between items-center mb-6">
                <div className="w-12 h-12 bg-amber-50 border border-amber-200 rounded-[20px] flex items-center justify-center text-amber-600 shadow-inner">
                  <DollarSign size={24} />
                </div>
                <button onClick={() => setAdjustModalEnrollment(null)} className="text-[#9A948A] hover:text-[#1F2B4D] bg-[#FAF8F5] p-2 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <h3 className="font-serif font-bold text-2xl text-[#1F2B4D] mb-2 leading-tight">Override Deduction</h3>
              <p className="text-[#6B655C] text-sm font-medium mb-6">
                Set a custom monthly payroll deduction for <strong>{adjustModalEnrollment.user?.displayName}</strong> under the <strong>{adjustModalEnrollment.plan?.name}</strong> plan.
              </p>

              <form onSubmit={handleAdjustDeductionSubmit} className="space-y-6">
                <div className="bg-[#FAF8F5] p-4 rounded-[20px] border-[2px] border-[#EAE7E0] shadow-inner mb-6 text-sm flex justify-between items-center">
                  <span className="text-[#9A948A] font-display font-bold uppercase tracking-wider text-[10px]">Standard Plan Rate:</span>
                  <span className="font-bold text-[#1F2B4D]">
                    ₹{(adjustModalEnrollment.plan?.tierRates?.[adjustModalEnrollment.coverageTier]?.employeeDeduction || 0).toLocaleString()}
                  </span>
                </div>

                <div className="group">
                  <label className="text-[11px] font-display font-bold text-[#9A948A] uppercase tracking-wider block mb-2 transition-colors group-focus-within:text-[#1F2B4D]">Custom Amount (₹)</label>
                  <Input
                    type="number"
                    placeholder="Leave blank to reset to standard"
                    value={customDeductionInput}
                    onChange={(e) => setCustomDeductionInput(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-2xl bg-white border border-[#EAE7E0] text-sm font-bold text-[#1F2B4D] shadow-inner focus:ring-2 focus:ring-[#1F2B4D]"
                  />
                  <p className="text-[10px] text-amber-600 font-medium mt-2 flex items-center gap-1.5"><AlertCircle size={12}/> Overrides will take effect on the next payroll run.</p>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" onClick={() => setAdjustModalEnrollment(null)} className="bg-white hover:bg-[#FAF8F5] text-[#1F2B4D] border border-[#EAE7E0] font-display font-bold text-sm px-6 py-3.5 rounded-[16px] shadow-sm transition-all flex-1">
                    Cancel
                  </Button>
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.95 }}
                    type="submit" 
                    className="bg-[#1F2B4D] hover:bg-[#141C33] text-white font-display font-bold text-sm px-6 py-3.5 rounded-[16px] shadow-md transition-all flex-1 flex justify-center items-center gap-2"
                  >
                    <CheckCircle2 size={18} /> Apply Override
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default BenefitsAdministration;
