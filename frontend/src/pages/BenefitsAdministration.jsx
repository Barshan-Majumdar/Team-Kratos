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
    <div className="w-full min-h-full flex flex-col gap-3 sm:gap-4 p-3 sm:p-5 md:p-6">
      <motion.div 
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="space-y-3 sm:space-y-4 w-full"
      >
        {/* ── TOP EXECUTIVE HEADER ── */}
        <motion.div variants={fadeInUp} className="flex flex-col min-[600px]:flex-row justify-between items-start min-[600px]:items-center gap-3 pb-3 border-b border-[#EAE7E0] w-full">
          <div>
            <h1 className="font-serif font-bold text-lg sm:text-2xl md:text-3xl text-[#1F2B4D] tracking-tight leading-tight flex items-center gap-2.5">
              <div className="p-2 bg-white rounded-xl shadow-2xs border border-[#EAE7E0]">
                <HeartHandshake className="text-[#1F2B4D] w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <span>Benefits Administration</span>
            </h1>
            <p className="text-[#6B655C] mt-1 text-xs sm:text-sm font-medium">
              Explore health plans, manage coverage tiers, and integrate deductions seamlessly with payroll.
            </p>
          </div>

          {/* Locked Single-Line Segmented Control Tabs - ZERO SLIDING / ZERO SCROLL */}
          <div className="flex items-center border border-[#CBD5E1] bg-white rounded-lg sm:rounded-xl p-0.5 sm:p-1 gap-0.5 sm:gap-1 w-full min-[640px]:w-auto shadow-2xs overflow-hidden shrink-0">
            {['marketplace', 'my-benefits', 'manage-plans', 'roster'].map((tab) => {
              if (tab === 'manage-plans' && !isAdmin) return null;
              if (tab === 'roster' && !isManager) return null;
              
              const labels = {
                'marketplace': (
                  <>
                    <span className="hidden min-[480px]:inline">Marketplace</span>
                    <span className="inline min-[480px]:hidden">Market</span>
                  </>
                ),
                'my-benefits': (
                  <>
                    <span className="hidden min-[480px]:inline">{`My Benefits (${myBenefits.length})`}</span>
                    <span className="inline min-[480px]:hidden">{`My (${myBenefits.length})`}</span>
                  </>
                ),
                'manage-plans': (
                  <>
                    <span className="hidden min-[480px]:inline">Manage Plans</span>
                    <span className="inline min-[480px]:hidden">Plans</span>
                  </>
                ),
                'roster': 'Roster'
              };
              const icons = {
                'marketplace': <Sparkles size={12} className="shrink-0" />,
                'my-benefits': <ShieldCheck size={12} className="shrink-0" />,
                'manage-plans': <Edit3 size={12} className="shrink-0" />,
                'roster': <Users size={12} className="shrink-0" />
              };
              
              const isActive = activeTab === tab;
              
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab);
                    if (tab === 'manage-plans') {
                      const token = localStorage.getItem('token');
                      fetch(`${apiBase}/api/benefits/plans?scope=all`, { headers: { 'Authorization': `Bearer ${token}` } })
                        .then(res => res.ok ? res.json() : [])
                        .then(data => setPlans(data));
                    }
                  }}
                  className={`px-1 min-[360px]:px-1.5 min-[480px]:px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg text-[8.5px] min-[360px]:text-[9.5px] min-[480px]:text-[11px] sm:text-xs font-display font-bold uppercase tracking-tight flex items-center justify-center gap-0.5 sm:gap-1.5 transition-all whitespace-nowrap shrink-0 flex-1 min-[640px]:flex-initial text-center ${
                    isActive ? 'bg-[#F0F3F9] text-[#1F2B4D] border border-[#CBD5E1] shadow-2xs' : 'text-[#6B655C] hover:text-[#1F2B4D]'
                  }`}
                >
                  {icons[tab]}
                  <span className="truncate">{labels[tab]}</span>
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
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-3 w-full"
            >
              {loading ? (
                <div className="flex items-center justify-center p-12">
                   <div className="w-8 h-8 border-2 border-[#1F2B4D]/20 border-t-[#1F2B4D] rounded-full animate-spin"></div>
                </div>
              ) : plans.length === 0 ? (
                <div className="bg-white border border-[#EAE7E0] p-8 text-center rounded-2xl shadow-2xs flex flex-col items-center justify-center gap-3 w-full">
                  <div className="w-14 h-14 rounded-2xl bg-[#FAF8F5] text-[#1F2B4D] flex items-center justify-center font-bold border border-[#EAE7E0] shadow-2xs">
                    <HeartHandshake size={28} />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-lg sm:text-xl text-[#1F2B4D]">No Benefit Plans Available</h3>
                    <p className="text-xs sm:text-sm font-medium text-[#6B655C] max-w-sm mx-auto mt-1">
                      {isAdmin
                        ? 'No benefit plans are configured. Seed default plans to begin.'
                        : 'No benefit plans have been set up yet.'}
                    </p>
                  </div>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={handleSeedDefaults}
                      className="mt-2 bg-[#1F2B4D] hover:bg-[#141C33] text-white font-display font-bold text-xs rounded-xl gap-2 px-5 py-2.5 shadow-2xs flex items-center justify-center transition-all whitespace-nowrap"
                    >
                      <Sparkles size={15} className="shrink-0" /> Seed Default Benefit Plans
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 w-full">
                  {plans.map((plan) => {
                    const IconComponent = CATEGORY_ICONS[plan.category] || HeartHandshake;
                    const isEnrolled = myBenefits.some(eb => eb.planId === plan.id);
                    const rates = plan.tierRates || {};

                    return (
                      <div 
                        key={plan.id} 
                        className="bg-white p-4 sm:p-5 rounded-2xl border border-[#EAE7E0] shadow-2xs flex flex-col justify-between hover:shadow-md transition-all group w-full"
                      >
                        <div>
                          <div className="flex justify-between items-start mb-3">
                            <div className="w-11 h-11 rounded-xl bg-[#FAF8F5] border border-[#EAE7E0] text-[#1F2B4D] flex items-center justify-center font-bold shrink-0 group-hover:bg-[#1F2B4D] group-hover:text-white transition-colors">
                              <IconComponent size={22} />
                            </div>
                            <span className="px-2.5 py-1 text-[9px] font-display font-bold uppercase tracking-widest rounded-full border shadow-2xs bg-indigo-50 text-indigo-800 border-indigo-200">
                              {plan.category.replace('_', ' ')}
                            </span>
                          </div>

                          <h3 className="font-serif font-bold text-base sm:text-lg text-[#1F2B4D] mb-1 truncate group-hover:text-indigo-700 transition-colors">{plan.name}</h3>
                          {plan.providerName && <p className="text-[10px] font-display font-bold uppercase tracking-wider text-[#9A948A] mb-2.5">{plan.providerName}</p>}
                          <p className="text-xs font-medium text-[#6B655C] line-clamp-2 mb-4 leading-relaxed">{plan.description || 'Comprehensive coverage plan for employees.'}</p>

                          {/* Tier Rates Matrix Preview */}
                          <div className="bg-[#FAF8F5] border border-[#EAE7E0] rounded-xl p-3 flex flex-col gap-2 text-xs">
                            <div className="flex justify-between items-center">
                              <span className="font-display font-bold text-[#6B655C] uppercase tracking-wider text-[9.5px]">Individual Tier</span>
                              <span className="font-bold text-[#1F2B4D]">₹{(rates.INDIVIDUAL?.employeeDeduction || 0).toLocaleString()}/mo</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="font-display font-bold text-[#6B655C] uppercase tracking-wider text-[9.5px]">Company Covered</span>
                              <span className="font-bold text-emerald-600">₹{(rates.INDIVIDUAL?.employerContribution || 0).toLocaleString()}/mo</span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 pt-3.5 border-t border-[#F4F1EA]">
                          {isEnrolled ? (
                            <div className="flex items-center justify-center gap-1.5 py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl font-display font-bold text-xs uppercase tracking-wider">
                              <CheckCircle2 size={15} /> Enrolled & Active
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPlanForEnroll(plan);
                                setCoverageTier('INDIVIDUAL');
                              }}
                              className="w-full py-2.5 bg-[#1F2B4D] hover:bg-[#141C33] text-white font-display font-bold rounded-xl text-xs uppercase tracking-wider gap-1.5 flex items-center justify-center shadow-2xs transition-all whitespace-nowrap"
                            >
                              <Plus size={15} className="shrink-0" /> <span>Enroll in Coverage</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 2: MY BENEFITS */}
          {activeTab === 'my-benefits' && (
            <motion.div
              key="my-benefits"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-3.5 w-full"
            >
              {/* Full-Width Executive Summary Banner */}
              <div className="p-4 sm:p-6 rounded-2xl border border-[#1F2B4D]/20 bg-gradient-to-r from-[#1F2B4D] via-[#26355C] to-[#141C33] text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-lg w-full relative overflow-hidden">
                <div className="relative z-10">
                  <h2 className="font-serif font-bold text-lg sm:text-2xl mb-1">My Active Benefit Coverage</h2>
                  <p className="text-indigo-200 text-xs sm:text-sm font-medium">Active enrollments automatically deducted during monthly payroll run.</p>
                </div>
                <div className="relative z-10 bg-white/10 backdrop-blur-xs px-5 py-3 rounded-xl border border-white/20 flex flex-col items-start md:items-end w-full md:w-auto shadow-inner">
                  <span className="text-[10px] text-indigo-200 uppercase font-display font-bold tracking-wider block mb-0.5">Monthly Payroll Deduction</span>
                  <span className="text-xl sm:text-3xl font-bold tracking-tight text-white">₹{totalMyMonthlyDeduction.toLocaleString()}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 w-full">
                {myBenefits.map((eb) => {
                  const rates = eb.plan?.tierRates?.[eb.coverageTier] || {};
                  const empAmt = eb.customDeduction !== null ? Number(eb.customDeduction) : Number(rates.employeeDeduction || 0);
                  const erAmt = Number(rates.employerContribution || 0);

                  return (
                    <div key={eb.id} className="bg-white p-4 sm:p-5 rounded-2xl border border-[#EAE7E0] shadow-2xs flex flex-col justify-between hover:shadow-md transition-all group w-full">
                      <div>
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <span className="px-2.5 py-1 rounded-full text-[9px] font-display font-bold uppercase tracking-widest bg-indigo-50 border border-indigo-200 text-indigo-800">
                              {eb.coverageTier} COVERAGE
                            </span>
                            <h3 className="font-serif font-bold text-base sm:text-lg text-[#1F2B4D] mt-2 mb-0.5 truncate group-hover:text-indigo-700 transition-colors">{eb.plan.name}</h3>
                            {eb.plan.providerName && <p className="text-[10px] font-display font-bold uppercase tracking-wider text-[#9A948A]">{eb.plan.providerName}</p>}
                          </div>
                          <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[9px] font-display font-bold uppercase tracking-wider rounded-full shrink-0">ACTIVE</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5 bg-[#FAF8F5] p-3.5 rounded-xl border border-[#EAE7E0] text-xs mb-4">
                          <div>
                            <span className="text-[#6B655C] block text-[9.5px] uppercase font-display font-bold tracking-wider mb-0.5">Payroll Cost</span>
                            <span className="text-base sm:text-lg font-bold text-[#1F2B4D]">₹{empAmt.toLocaleString()}<span className="text-xs text-[#9A948A] font-medium">/mo</span></span>
                          </div>
                          <div>
                            <span className="text-[#6B655C] block text-[9.5px] uppercase font-display font-bold tracking-wider mb-0.5">Company Covered</span>
                            <span className="text-base sm:text-lg font-bold text-emerald-600">₹{erAmt.toLocaleString()}<span className="text-xs text-emerald-600/60 font-medium">/mo</span></span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-[#F4F1EA] flex justify-between items-center">
                        <span className="text-[10.5px] text-[#6B655C] font-display font-bold uppercase tracking-wider">Since {format(new Date(eb.enrolledAt), 'MMM d, yy')}</span>
                        <button
                          type="button"
                          onClick={() => handleCancelEnrollment(eb.id)}
                          className="text-[10px] font-display font-bold uppercase tracking-wider text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          Opt-Out
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* TAB 3: MANAGE PLANS (ADMIN ONLY) */}
          {activeTab === 'manage-plans' && isAdmin && (
            <motion.div
              key="manage-plans"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-3.5 w-full"
            >
              <div className="flex flex-col min-[480px]:flex-row justify-between items-start min-[480px]:items-center border-b border-[#EAE7E0] pb-3 gap-2 w-full">
                <div>
                  <h2 className="font-serif font-bold text-base sm:text-xl text-[#1F2B4D]">Company Benefit Offerings</h2>
                  <p className="text-xs font-medium text-[#6B655C]">Configure benefit plans, tier pricing matrices, and toggle active enrollment status.</p>
                </div>
                <button
                  type="button"
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
                  className="bg-[#1F2B4D] hover:bg-[#141C33] text-white font-display font-bold text-xs uppercase tracking-wider rounded-xl px-4 py-2 shadow-2xs transition-all inline-flex items-center justify-center gap-1.5 whitespace-nowrap w-full min-[480px]:w-auto"
                >
                  <Plus size={15} className="shrink-0" /> <span>Create Plan</span>
                </button>
              </div>

              {/* Manage Plans Table - 100% Fit, Zero Horizontal Sliding */}
              <div className="bg-white border border-[#EAE7E0] rounded-[14px] sm:rounded-[18px] p-0 shadow-2xs overflow-hidden w-full">
                <table className="w-full table-fixed text-left border-collapse">
                  <thead>
                    <tr className="bg-[#FAF8F5] border-b border-[#EAE7E0] text-[8px] sm:text-[9.5px] font-display font-bold text-[#6B655C] uppercase tracking-wider">
                      <th className="p-2 sm:p-3 w-[28%] sm:w-[28%]">Plan Name</th>
                      <th className="p-2 sm:p-3 w-[18%] sm:w-[18%]">Category</th>
                      <th className="p-2 sm:p-3 w-[20%] sm:w-[20%]">Individual Rate</th>
                      <th className="p-2 sm:p-3 w-[20%] sm:w-[20%]">Family Rate</th>
                      <th className="p-2 sm:p-3 w-[14%] sm:w-[14%] text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F4F1EA] text-xs">
                    {plans.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-4 sm:p-5 text-center">
                          <div className="flex flex-col items-center justify-center gap-1.5">
                            <Building2 className="w-8 h-8 text-[#9A948A] opacity-50" />
                            <span className="text-[#1F2B4D] font-serif font-bold text-sm">No Plans Configured</span>
                            <span className="text-[#6B655C] font-medium text-[11px]">Create a new plan to start offering benefits.</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      plans.map((plan) => {
                        const rates = plan.tierRates || {};
                        return (
                          <tr key={plan.id} className="hover:bg-[#FAF9F6] transition-colors">
                            <td className="p-2 sm:p-3">
                              <div className="font-serif font-semibold text-[#1F2B4D] text-[11px] sm:text-xs truncate">{plan.name}</div>
                              {plan.providerName && <div className="text-[9px] font-display font-bold uppercase tracking-wider text-[#9A948A] truncate">{plan.providerName}</div>}
                            </td>
                            <td className="p-2 sm:p-3">
                              <span className="px-2 py-0.5 rounded-full text-[8px] sm:text-[9px] font-display font-bold uppercase tracking-widest bg-slate-100 border border-slate-200 text-slate-600 truncate">
                                {plan.category.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="p-2 sm:p-3 text-[10px] sm:text-xs font-bold text-[#1F2B4D] truncate">
                              ₹{(rates.INDIVIDUAL?.employeeDeduction || 0).toLocaleString()} / <span className="text-emerald-600">₹{(rates.INDIVIDUAL?.employerContribution || 0).toLocaleString()}</span>
                            </td>
                            <td className="p-2 sm:p-3 text-[10px] sm:text-xs font-bold text-[#1F2B4D] truncate">
                              ₹{(rates.FAMILY?.employeeDeduction || 0).toLocaleString()} / <span className="text-emerald-600">₹{(rates.FAMILY?.employerContribution || 0).toLocaleString()}</span>
                            </td>
                            <td className="p-2 sm:p-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
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
                                  className="p-1.5 bg-white border border-[#EAE7E0] text-[#6B655C] hover:text-[#1F2B4D] hover:bg-[#FAF8F5] rounded-lg transition-all shadow-2xs"
                                >
                                  <Edit3 size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleTogglePlan(plan.id)}
                                  className="p-1.5 bg-white border border-[#EAE7E0] hover:bg-[#FAF8F5] rounded-lg transition-all shadow-2xs"
                                  title={plan.isActive ? 'Deactivate plan' : 'Activate plan'}
                                >
                                  {plan.isActive ? <ToggleRight size={16} className="text-emerald-600" /> : <ToggleLeft size={16} className="text-[#9A948A]" />}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* TAB 4: ENROLLMENT ROSTER */}
          {activeTab === 'roster' && isManager && (
            <motion.div
              key="roster"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-3"
            >
              <div className="border-b border-[#EAE7E0] pb-2.5">
                <h2 className="font-serif font-bold text-base sm:text-xl text-[#1F2B4D]">Company Benefit Enrollments</h2>
                <p className="text-[10px] sm:text-xs font-medium text-[#6B655C]">Review active employee enrollments and override payroll deduction rates if necessary.</p>
              </div>

              {/* Roster Table - 100% Fit, Zero Horizontal Sliding */}
              <div className="bg-white border border-[#EAE7E0] rounded-[14px] sm:rounded-[18px] p-0 shadow-2xs overflow-hidden w-full">
                <table className="w-full table-fixed text-left border-collapse">
                  <thead>
                    <tr className="bg-[#FAF8F5] border-b border-[#EAE7E0] text-[8px] sm:text-[9.5px] font-display font-bold text-[#6B655C] uppercase tracking-wider">
                      <th className="p-2 sm:p-3 w-[24%] sm:w-[24%]">Employee</th>
                      <th className="p-2 sm:p-3 w-[24%] sm:w-[24%]">Benefit Plan</th>
                      <th className="p-2 sm:p-3 w-[16%] sm:w-[16%]">Coverage Tier</th>
                      <th className="p-2 sm:p-3 w-[18%] sm:w-[18%]">Emp Deduction</th>
                      <th className="p-2 sm:p-3 w-[18%] sm:w-[18%] text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F4F1EA] text-xs">
                    {allEnrollments.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-4 sm:p-5 text-center">
                           <div className="flex flex-col items-center justify-center gap-1.5">
                            <Users className="w-8 h-8 text-[#9A948A] opacity-50" />
                            <span className="text-[#1F2B4D] font-serif font-bold text-sm">No Active Enrollments</span>
                            <span className="text-[#6B655C] font-medium text-[11px]">Employees haven't enrolled in any benefits yet.</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      allEnrollments.map((eb) => {
                        const rates = eb.plan?.tierRates?.[eb.coverageTier] || {};
                        const empAmt = eb.customDeduction !== null ? Number(eb.customDeduction) : Number(rates.employeeDeduction || 0);
                        const isOverridden = eb.customDeduction !== null;

                        return (
                          <tr key={eb.id} className="hover:bg-[#FAF9F6] transition-colors">
                            <td className="p-2 sm:p-3">
                              <span className="font-serif font-semibold text-[#1F2B4D] text-[11px] sm:text-xs block truncate">{eb.user?.displayName || 'Unknown'}</span>
                              <span className="text-[9px] font-display font-bold uppercase tracking-wider text-[#9A948A] block truncate">{eb.user?.jobPosition || 'Employee'}</span>
                            </td>
                            <td className="p-2 sm:p-3">
                              <span className="font-serif font-semibold text-[#1F2B4D] text-[11px] sm:text-xs block truncate">{eb.plan?.name || 'Unknown Plan'}</span>
                            </td>
                            <td className="p-2 sm:p-3">
                              <span className="px-2 py-0.5 rounded-full text-[8px] sm:text-[9px] font-display font-bold uppercase tracking-widest bg-indigo-50 border border-indigo-200 text-indigo-800 shrink-0">
                                {eb.coverageTier}
                              </span>
                            </td>
                            <td className="p-2 sm:p-3">
                              <div className="flex items-center gap-1">
                                <span className={`font-bold text-[10px] sm:text-xs truncate ${isOverridden ? 'text-amber-600' : 'text-[#1F2B4D]'}`}>
                                  ₹{empAmt.toLocaleString()}
                                </span>
                                {isOverridden && (
                                  <span className="px-1 py-0.5 bg-amber-100 text-amber-800 text-[8px] font-display font-bold uppercase tracking-wider rounded border border-amber-200 shrink-0">Override</span>
                                )}
                              </div>
                            </td>
                            <td className="p-2 sm:p-3 text-right">
                              {isAdmin && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAdjustModalEnrollment(eb);
                                    setCustomDeductionInput(eb.customDeduction !== null ? eb.customDeduction.toString() : '');
                                  }}
                                  className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-display font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded transition-colors shadow-2xs shrink-0"
                                >
                                  <DollarSign size={11} /> <span>Adjust</span>
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
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── ENROLLMENT CONFIRMATION MODAL ── */}
      <AnimatePresence>
        {selectedPlanForEnroll && (
          <div className="fixed inset-0 z-50 bg-[#1F2B4D]/30 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[20px] max-w-md w-full p-4 sm:p-6 shadow-xl border border-[#EAE7E0] max-h-[92vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-3">
                <div className="w-10 h-10 bg-[#FAF8F5] border border-[#EAE7E0] rounded-xl flex items-center justify-center text-[#1F2B4D] shadow-2xs">
                  <ShieldCheck size={20} />
                </div>
                <button type="button" onClick={() => setSelectedPlanForEnroll(null)} className="text-[#6B655C] hover:text-[#1F2B4D] bg-[#FAF8F5] p-1.5 rounded-lg transition-colors">
                  <X size={16} />
                </button>
              </div>

              <h3 className="font-serif font-bold text-lg sm:text-xl text-[#1F2B4D] mb-1">Confirm Enrollment</h3>
              <p className="text-[#6B655C] text-xs font-medium mb-4">
                Enrolling in <strong>{selectedPlanForEnroll.name}</strong>. Select your coverage tier.
              </p>

              <form onSubmit={handleEnrollSubmit} className="space-y-3">
                <div>
                  <label className="text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider block mb-1">Coverage Tier</label>
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

                <div className="bg-[#FAF8F5] p-3 rounded-xl border border-[#EAE7E0]">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[#6B655C] text-[10px] font-display font-bold uppercase tracking-wider">Est. Monthly Deduction:</span>
                    <span className="text-base font-bold text-[#1F2B4D]">
                      ₹{(selectedPlanForEnroll.tierRates?.[coverageTier]?.employeeDeduction || 0).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-[10px] text-[#6B655C] font-medium leading-snug">
                    Amount will be deducted automatically from your monthly paycheck post-tax.
                  </p>
                </div>

                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setSelectedPlanForEnroll(null)} className="w-full sm:w-auto bg-white hover:bg-[#FAF8F5] text-[#1F2B4D] border border-[#EAE7E0] font-display font-bold text-xs px-4 py-2 rounded-xl transition-all">
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={enrolling} 
                    className="w-full sm:w-auto bg-[#1F2B4D] hover:bg-[#141C33] text-white font-display font-bold text-xs px-5 py-2 rounded-xl transition-all inline-flex items-center justify-center gap-1.5"
                  >
                    {enrolling ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" /> : <CheckCircle2 size={14} className="shrink-0" />}
                    <span>{enrolling ? 'Enrolling...' : 'Confirm Enrollment'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── ADMIN: CREATE/EDIT PLAN MODAL ── */}
      <AnimatePresence>
        {isPlanModalOpen && (
          <div className="fixed inset-0 z-50 bg-[#1F2B4D]/30 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[20px] max-w-xl w-full p-4 sm:p-6 shadow-xl border border-[#EAE7E0] max-h-[92vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center pb-3 border-b border-[#F4F1EA] mb-3">
                <div>
                  <h3 className="font-serif font-bold text-base sm:text-xl text-[#1F2B4D]">
                    {editingPlan ? 'Edit Benefit Plan' : 'Create Benefit Plan'}
                  </h3>
                  <p className="text-[10px] sm:text-xs font-medium text-[#6B655C]">Design the architecture of your company's benefit offerings.</p>
                </div>
                <button type="button" onClick={() => setIsPlanModalOpen(false)} className="text-[#6B655C] hover:text-[#1F2B4D] bg-[#FAF8F5] p-1.5 rounded-lg transition-colors">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSavePlan} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider block mb-1">Plan Name</label>
                    <Input
                      required
                      placeholder="e.g. Premium Health Cover"
                      value={planForm.name}
                      onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-[#EAE7E0] text-xs font-bold text-[#1F2B4D]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider block mb-1">Category</label>
                    <CustomSelect 
                      value={planForm.category}
                      onChange={(val) => setPlanForm({ ...planForm, category: val })}
                      placeholder="-- Category --"
                      options={CATEGORIES.map(c => ({ value: c, label: c.replace('_', ' ') }))}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider block mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={planForm.description}
                    onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                    className="w-full bg-white border border-[#EAE7E0] text-[#1F2B4D] text-xs font-medium rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[#1F2B4D] resize-y"
                    placeholder="Brief overview of plan coverage..."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider block mb-1">Provider/Vendor Name</label>
                    <Input
                      placeholder="e.g. BlueCross"
                      value={planForm.providerName}
                      onChange={(e) => setPlanForm({ ...planForm, providerName: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-[#EAE7E0] text-xs font-bold text-[#1F2B4D]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider block mb-1">Group Policy Number</label>
                    <Input
                      placeholder="Optional"
                      value={planForm.policyNumber}
                      onChange={(e) => setPlanForm({ ...planForm, policyNumber: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-[#EAE7E0] text-xs font-bold text-[#1F2B4D]"
                    />
                  </div>
                </div>

                {/* Tier Rates Config */}
                <div className="mt-3">
                  <h4 className="text-[10px] font-display font-bold text-[#1F2B4D] uppercase tracking-wider block mb-2 border-b border-[#F4F1EA] pb-1">Coverage Tier Pricing (Monthly ₹)</h4>
                  <div className="space-y-2">
                    {['INDIVIDUAL', 'SPOUSE', 'FAMILY'].map(tier => (
                      <div key={tier} className="bg-[#FAF8F5] p-2.5 rounded-xl border border-[#EAE7E0] flex items-center gap-2">
                        <div className="w-20">
                          <span className="text-[9.5px] font-display font-bold uppercase tracking-wider text-[#1F2B4D]">{tier}</span>
                        </div>
                        <div className="flex-1">
                          <label className="text-[8.5px] font-display font-bold text-[#6B655C] uppercase tracking-wider block mb-0.5">Emp Deduction</label>
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
                            className="w-full px-2 py-1 rounded-lg bg-white border border-[#EAE7E0] text-xs font-bold text-[#1F2B4D] h-8"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-[8.5px] font-display font-bold text-[#6B655C] uppercase tracking-wider block mb-0.5">Co. Share</label>
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
                            className="w-full px-2 py-1 rounded-lg bg-white border border-[#EAE7E0] text-xs font-bold text-[#1F2B4D] h-8"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-3 border-t border-[#F4F1EA]">
                  <button type="button" onClick={() => setIsPlanModalOpen(false)} className="w-full sm:w-auto bg-white hover:bg-[#FAF8F5] text-[#1F2B4D] border border-[#EAE7E0] font-display font-bold text-xs px-4 py-2 rounded-xl transition-all">
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="w-full sm:w-auto bg-[#1F2B4D] hover:bg-[#141C33] text-white font-display font-bold text-xs px-5 py-2 rounded-xl transition-all inline-flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 size={14} className="shrink-0" /> <span>Save Plan</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── ADMIN: ADJUST DEDUCTION MODAL ── */}
      <AnimatePresence>
        {adjustModalEnrollment && (
          <div className="fixed inset-0 z-50 bg-[#1F2B4D]/30 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[20px] max-w-md w-full p-4 sm:p-6 shadow-xl border border-[#EAE7E0] max-h-[92vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-3">
                <div className="w-10 h-10 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-center text-amber-600 shadow-2xs">
                  <DollarSign size={20} />
                </div>
                <button type="button" onClick={() => setAdjustModalEnrollment(null)} className="text-[#6B655C] hover:text-[#1F2B4D] bg-[#FAF8F5] p-1.5 rounded-lg transition-colors">
                  <X size={16} />
                </button>
              </div>

              <h3 className="font-serif font-bold text-lg sm:text-xl text-[#1F2B4D] mb-1 leading-tight">Override Deduction</h3>
              <p className="text-[#6B655C] text-xs font-medium mb-3">
                Custom monthly deduction for <strong>{adjustModalEnrollment.user?.displayName}</strong> ({adjustModalEnrollment.plan?.name}).
              </p>

              <form onSubmit={handleAdjustDeductionSubmit} className="space-y-3">
                <div className="bg-[#FAF8F5] p-2.5 rounded-xl border border-[#EAE7E0] text-xs flex justify-between items-center">
                  <span className="text-[#6B655C] font-display font-bold uppercase tracking-wider text-[9px]">Standard Rate:</span>
                  <span className="font-bold text-[#1F2B4D]">
                    ₹{(adjustModalEnrollment.plan?.tierRates?.[adjustModalEnrollment.coverageTier]?.employeeDeduction || 0).toLocaleString()}
                  </span>
                </div>

                <div>
                  <label className="text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider block mb-1">Custom Amount (₹)</label>
                  <Input
                    type="number"
                    placeholder="Leave blank to reset"
                    value={customDeductionInput}
                    onChange={(e) => setCustomDeductionInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#EAE7E0] text-xs font-bold text-[#1F2B4D]"
                  />
                  <p className="text-[9.5px] text-amber-600 font-medium mt-1 flex items-center gap-1"><AlertCircle size={11}/> Takes effect next payroll run.</p>
                </div>

                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setAdjustModalEnrollment(null)} className="w-full sm:w-auto bg-white hover:bg-[#FAF8F5] text-[#1F2B4D] border border-[#EAE7E0] font-display font-bold text-xs px-4 py-2 rounded-xl transition-all">
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="w-full sm:w-auto bg-[#1F2B4D] hover:bg-[#141C33] text-white font-display font-bold text-xs px-5 py-2 rounded-xl transition-all inline-flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 size={14} className="shrink-0" /> <span>Apply Override</span>
                  </button>
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
