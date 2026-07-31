import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
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
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Skeleton, CardSkeleton, StatCardSkeleton } from '../components/ui/Skeleton';

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

  const isAdmin = user?.roleDefinition?.level <= 2 || user?.role === 'Admin' || user?.role === 'SuperAdmin' || user?.role === 'Manager' || user?.customRole?.toLowerCase()?.includes('hr') || user?.jobPosition?.toLowerCase()?.includes('hr');
  const isManager = user?.roleDefinition?.level <= 2 || user?.role === 'Manager' || isAdmin;
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
    if (!window.confirm('Are you sure you want to opt-out and cancel this benefit coverage?')) return;

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
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto min-h-full flex flex-col gap-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2.5">
            <HeartHandshake size={28} className="text-indigo-600" />
            Benefits Administration
          </h1>
          <p className="text-slate-500 mt-1 text-sm">Explore health plans, manage coverage tiers, and integrate deductions seamlessly with payroll.</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80">
          <button
            onClick={() => setActiveTab('marketplace')}
            className={`px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${
              activeTab === 'marketplace'
                ? 'bg-white text-indigo-600 shadow-sm shadow-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles size={16} /> Marketplace
          </button>

          <button
            onClick={() => setActiveTab('my-benefits')}
            className={`px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${
              activeTab === 'my-benefits'
                ? 'bg-white text-indigo-600 shadow-sm shadow-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck size={16} /> My Benefits ({myBenefits.length})
          </button>

          {isAdmin && (
            <button
              onClick={() => {
                setActiveTab('manage-plans');
                // Fetch all plans including inactive for admin
                const token = localStorage.getItem('token');
                fetch(`${apiBase}/api/benefits/plans?scope=all`, { headers: { 'Authorization': `Bearer ${token}` } })
                  .then(res => res.ok ? res.json() : [])
                  .then(data => setPlans(data));
              }}
              className={`px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${
                activeTab === 'manage-plans'
                  ? 'bg-white text-indigo-600 shadow-sm shadow-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Edit3 size={16} /> Manage Plans
            </button>
          )}

          {isManager && (
            <button
              onClick={() => setActiveTab('roster')}
              className={`px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${
                activeTab === 'roster'
                  ? 'bg-white text-indigo-600 shadow-sm shadow-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users size={16} /> Enrollment Roster
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: BENEFIT MARKETPLACE */}
      {activeTab === 'marketplace' && (
        <div className="flex flex-col gap-6">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : plans.length === 0 ? (
            <Card className="p-12 text-center rounded-3xl border border-slate-200 bg-white flex flex-col items-center justify-center gap-4">
              <div className="w-16 h-16 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <HeartHandshake size={32} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">No Benefit Plans Available</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  {isAdmin
                    ? 'No benefit plans are currently configured for your company. Click below to seed the standard default plans.'
                    : 'No benefit plans have been set up yet — please check back soon or contact HR.'}
                </p>
              </div>
              {isAdmin && (
                <Button
                  onClick={handleSeedDefaults}
                  className="mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-xs gap-2 px-6 py-3 shadow-md shadow-indigo-600/20"
                >
                  <Sparkles size={16} /> Seed Default Benefit Plans
                </Button>
              )}
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {plans.map((plan) => {
                const IconComponent = CATEGORY_ICONS[plan.category] || HeartHandshake;
                const isEnrolled = myBenefits.some(eb => eb.planId === plan.id);
                const rates = plan.tierRates || {};

                return (
                  <Card key={plan.id} className="p-6 rounded-3xl border border-slate-200 shadow-sm bg-white flex flex-col justify-between hover:border-indigo-200 transition-all">
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                          <IconComponent size={24} />
                        </div>
                        <Badge variant="outline" className="bg-slate-50 text-slate-700 font-bold border-slate-200 text-[10px] uppercase">
                          {plan.category.replace('_', ' ')}
                        </Badge>
                      </div>

                      <h3 className="text-lg font-bold text-slate-800 mb-1">{plan.name}</h3>
                      {plan.providerName && <p className="text-xs font-semibold text-slate-400 mb-3">{plan.providerName}</p>}
                      <p className="text-xs text-slate-500 line-clamp-2 mb-4">{plan.description || 'Comprehensive coverage plan for employees.'}</p>

                      {/* Tier Rates Matrix Preview */}
                      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 flex flex-col gap-2 text-xs">
                        <div className="flex justify-between items-center text-slate-600">
                          <span className="font-semibold">Individual Tier:</span>
                          <span className="font-bold text-slate-900">₹{(rates.INDIVIDUAL?.employeeDeduction || 0).toLocaleString()}/mo</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-600">
                          <span className="font-semibold">Company Covered:</span>
                          <span className="font-bold text-emerald-600">₹{(rates.INDIVIDUAL?.employerContribution || 0).toLocaleString()}/mo</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100">
                      {isEnrolled ? (
                        <div className="flex items-center justify-center gap-1.5 py-2.5 bg-emerald-50 text-emerald-700 rounded-2xl font-bold text-xs">
                          <CheckCircle2 size={16} /> Enrolled & Active
                        </div>
                      ) : (
                        <Button
                          onClick={() => {
                            setSelectedPlanForEnroll(plan);
                            setCoverageTier('INDIVIDUAL');
                          }}
                          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-xs gap-1.5 shadow-md shadow-indigo-600/20"
                        >
                          <Plus size={16} /> Enroll in Coverage
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MY BENEFITS */}
      {activeTab === 'my-benefits' && (
        <div className="flex flex-col gap-6">
          {/* Summary Banner */}
          <Card className="p-6 rounded-3xl border border-indigo-100 bg-gradient-to-r from-indigo-900 to-slate-900 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl">
            <div>
              <h2 className="text-xl font-black">My Active Benefit Coverage</h2>
              <p className="text-indigo-200 text-xs mt-1">Total active enrollments automatically deducted during monthly payroll run.</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10">
              <span className="text-xs text-indigo-200 uppercase font-bold tracking-wider block">Monthly Payroll Deduction</span>
              <span className="text-2xl font-black text-white">₹{totalMyMonthlyDeduction.toLocaleString()}</span>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {myBenefits.map((eb) => {
              const rates = eb.plan?.tierRates?.[eb.coverageTier] || {};
              const empAmt = eb.customDeduction !== null ? Number(eb.customDeduction) : Number(rates.employeeDeduction || 0);
              const erAmt = Number(rates.employerContribution || 0);

              return (
                <Card key={eb.id} className="p-6 rounded-3xl border border-slate-200 shadow-sm bg-white flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-indigo-100 text-indigo-800">
                          {eb.coverageTier} COVERAGE
                        </span>
                        <h3 className="text-lg font-bold text-slate-800 mt-2">{eb.plan.name}</h3>
                        {eb.plan.providerName && <p className="text-xs font-semibold text-slate-400">{eb.plan.providerName}</p>}
                      </div>
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">ACTIVE</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs mb-4">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Your Payroll Cost</span>
                        <span className="text-base font-black text-slate-800">₹{empAmt.toLocaleString()}/mo</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Company Covered</span>
                        <span className="text-base font-black text-emerald-600">₹{erAmt.toLocaleString()}/mo</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                    <span className="text-xs text-slate-400 font-medium">Enrolled on {format(new Date(eb.enrolledAt), 'MMM d, yyyy')}</span>
                    <Button
                      onClick={() => handleCancelEnrollment(eb.id)}
                      variant="outline"
                      className="text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border-red-200 px-3 py-1.5 rounded-xl"
                    >
                      Opt-Out / Cancel
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: MANAGE PLANS (ADMIN ONLY) */}
      {activeTab === 'manage-plans' && isAdmin && (
        <div className="flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-black text-slate-800">Company Benefit Offerings</h2>
              <p className="text-xs text-slate-500">Configure benefit plans, tier pricing matrices, and toggle active enrollment status.</p>
            </div>
            <Button
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
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl gap-2 text-xs"
            >
              <Plus size={16} /> Create Benefit Plan
            </Button>
          </div>

          <Card className="rounded-3xl border border-slate-200 shadow-sm bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                    <th className="p-4 pl-6">Plan Name</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Individual Rate</th>
                    <th className="p-4">Family Rate</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right pr-6">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {plans.map((plan) => {
                    const rates = plan.tierRates || {};
                    return (
                      <tr key={plan.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 pl-6 font-bold text-slate-800">
                          {plan.name}
                          {plan.providerName && <div className="text-xs text-slate-400 font-normal">{plan.providerName}</div>}
                        </td>
                        <td className="p-4 text-xs font-semibold text-slate-600">
                          {plan.category.replace('_', ' ')}
                        </td>
                        <td className="p-4 text-xs font-bold text-slate-800">
                          ₹{(rates.INDIVIDUAL?.employeeDeduction || 0).toLocaleString()} / ₹{(rates.INDIVIDUAL?.employerContribution || 0).toLocaleString()}
                        </td>
                        <td className="p-4 text-xs font-bold text-slate-800">
                          ₹{(rates.FAMILY?.employeeDeduction || 0).toLocaleString()} / ₹{(rates.FAMILY?.employerContribution || 0).toLocaleString()}
                        </td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            plan.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {plan.isActive ? 'Active' : 'Deactivated'}
                          </span>
                        </td>
                        <td className="p-4 pr-6 text-right flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleTogglePlan(plan.id)}
                            className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition-colors"
                            title={plan.isActive ? 'Deactivate plan' : 'Activate plan'}
                          >
                            {plan.isActive ? <ToggleRight size={20} className="text-emerald-600" /> : <ToggleLeft size={20} className="text-slate-400" />}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 4: ENROLLMENT ROSTER */}
      {activeTab === 'roster' && isManager && (
        <div className="flex flex-col gap-6">
          <h2 className="text-xl font-black text-slate-800">Company Benefit Enrollments</h2>

          <Card className="rounded-3xl border border-slate-200 shadow-sm bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                    <th className="p-4 pl-6">Employee</th>
                    <th className="p-4">Benefit Plan</th>
                    <th className="p-4">Coverage Tier</th>
                    <th className="p-4">Employee Deduction</th>
                    <th className="p-4">Employer Share</th>
                    <th className="p-4">Status</th>
                    {isAdmin && <th className="p-4 text-right pr-6">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {allEnrollments.map((eb) => {
                    const rates = eb.plan?.tierRates?.[eb.coverageTier] || {};
                    const empAmt = eb.customDeduction !== null ? Number(eb.customDeduction) : Number(rates.employeeDeduction || 0);
                    const erAmt = Number(rates.employerContribution || 0);

                    return (
                      <tr key={eb.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 pl-6 font-bold text-slate-800">
                          {eb.user?.displayName || 'Employee'}
                          <div className="text-xs font-normal text-slate-400">{eb.user?.department || 'General'}</div>
                        </td>
                        <td className="p-4 text-xs font-semibold text-slate-700">{eb.plan?.name}</td>
                        <td className="p-4 text-xs font-bold text-slate-600">{eb.coverageTier}</td>
                        <td className="p-4 font-black text-slate-800">
                          ₹{empAmt.toLocaleString()}
                          {eb.customDeduction !== null && <span className="text-[10px] text-amber-600 block">Overridden</span>}
                        </td>
                        <td className="p-4 font-black text-emerald-600">₹{erAmt.toLocaleString()}</td>
                        <td className="p-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            eb.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {eb.status}
                          </span>
                        </td>
                        {isAdmin && (
                          <td className="p-4 pr-6 text-right">
                            <button
                              onClick={() => {
                                setAdjustModalEnrollment(eb);
                                setCustomDeductionInput(eb.customDeduction !== null ? String(eb.customDeduction) : '');
                              }}
                              className="text-xs font-bold text-indigo-600 hover:bg-indigo-50 px-2.5 py-1 rounded-xl transition-colors"
                            >
                              Adjust Rate
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ENROLLMENT MODAL */}
      {selectedPlanForEnroll && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-4">
              <h3 className="text-lg font-black text-slate-800">Enroll in {selectedPlanForEnroll.name}</h3>
              <button onClick={() => setSelectedPlanForEnroll(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEnrollSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Select Coverage Tier</label>
                <div className="grid grid-cols-3 gap-2">
                  {['INDIVIDUAL', 'SPOUSE', 'FAMILY'].map((tier) => {
                    const r = selectedPlanForEnroll.tierRates?.[tier] || {};
                    return (
                      <button
                        key={tier}
                        type="button"
                        onClick={() => setCoverageTier(tier)}
                        className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                          coverageTier === tier
                            ? 'bg-indigo-50 border-indigo-600 text-indigo-900 shadow-sm shadow-indigo-600/10'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span className="text-[10px] font-black uppercase block">{tier}</span>
                        <span className="text-sm font-bold mt-1">₹{(r.employeeDeduction || 0).toLocaleString()}</span>
                        <span className="text-[10px] text-emerald-600 font-semibold mt-0.5">Covered: ₹{(r.employerContribution || 0).toLocaleString()}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs flex flex-col gap-2">
                <div className="flex justify-between font-bold text-slate-800">
                  <span>Monthly Payroll Deduction:</span>
                  <span>₹{(selectedPlanForEnroll.tierRates?.[coverageTier]?.employeeDeduction || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-semibold text-emerald-600">
                  <span>Company Contribution:</span>
                  <span>₹{(selectedPlanForEnroll.tierRates?.[coverageTier]?.employerContribution || 0).toLocaleString()}</span>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={() => setSelectedPlanForEnroll(null)} className="rounded-xl text-xs">
                  Cancel
                </Button>
                <Button type="submit" disabled={enrolling} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs">
                  {enrolling ? 'Enrolling...' : 'Confirm Enrollment'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADMIN ADJUST DEDUCTION MODAL */}
      {adjustModalEnrollment && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-4">
              <h3 className="text-lg font-black text-slate-800">Adjust Deduction Rate</h3>
              <button onClick={() => setAdjustModalEnrollment(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAdjustDeductionSubmit} className="flex flex-col gap-4">
              <p className="text-xs text-slate-500">
                Override payroll deduction rate for <strong>{adjustModalEnrollment.user?.displayName}</strong> on plan <strong>{adjustModalEnrollment.plan?.name}</strong>.
              </p>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Custom Monthly Deduction Amount (₹)</label>
                <Input
                  type="number"
                  placeholder="Leave blank to reset to standard tier rate"
                  value={customDeductionInput}
                  onChange={(e) => setCustomDeductionInput(e.target.value)}
                  className="rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={() => setAdjustModalEnrollment(null)} className="rounded-xl text-xs">
                  Cancel
                </Button>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs">
                  Save Overridden Rate
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE / EDIT BENEFIT PLAN MODAL */}
      {isPlanModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-4">
              <h3 className="text-lg font-black text-slate-800">
                {editingPlan ? 'Edit Benefit Plan' : 'Create New Benefit Plan'}
              </h3>
              <button onClick={() => setIsPlanModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Plan Name *</label>
                  <Input
                    type="text"
                    required
                    placeholder="e.g. Executive Gold Health Cover"
                    value={planForm.name}
                    onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                    className="rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Category *</label>
                  <select
                    value={planForm.category}
                    onChange={(e) => setPlanForm({ ...planForm, category: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Provider Name</label>
                  <Input
                    type="text"
                    placeholder="e.g. Care Health Insurance"
                    value={planForm.providerName}
                    onChange={(e) => setPlanForm({ ...planForm, providerName: e.target.value })}
                    className="rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Policy Number</label>
                  <Input
                    type="text"
                    placeholder="e.g. POL-HLTH-2026-X"
                    value={planForm.policyNumber}
                    onChange={(e) => setPlanForm({ ...planForm, policyNumber: e.target.value })}
                    className="rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Description</label>
                <textarea
                  rows={2}
                  placeholder="Provide details about coverage, deductibles, or eligibility..."
                  value={planForm.description}
                  onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Tier Pricing Matrix Fields */}
              <div className="border-t border-slate-100 pt-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-3">Coverage Tier Monthly Rates (₹)</h4>
                <div className="flex flex-col gap-3">
                  {['INDIVIDUAL', 'SPOUSE', 'FAMILY'].map((tier) => (
                    <div key={tier} className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3">
                      <span className="text-xs font-black uppercase text-indigo-900 w-28">{tier} TIER</span>
                      <div className="flex items-center gap-2 w-full md:w-auto">
                        <span className="text-[10px] text-slate-500 font-bold">Emp Cost:</span>
                        <Input
                          type="number"
                          min="0"
                          value={planForm.tierRates[tier]?.employeeDeduction || 0}
                          onChange={(e) => setPlanForm({
                            ...planForm,
                            tierRates: {
                              ...planForm.tierRates,
                              [tier]: {
                                ...planForm.tierRates[tier],
                                employeeDeduction: Number(e.target.value)
                              }
                            }
                          })}
                          className="w-24 rounded-xl text-xs h-8"
                        />
                      </div>
                      <div className="flex items-center gap-2 w-full md:w-auto">
                        <span className="text-[10px] text-emerald-600 font-bold">Comp Covered:</span>
                        <Input
                          type="number"
                          min="0"
                          value={planForm.tierRates[tier]?.employerContribution || 0}
                          onChange={(e) => setPlanForm({
                            ...planForm,
                            tierRates: {
                              ...planForm.tierRates,
                              [tier]: {
                                ...planForm.tierRates[tier],
                                employerContribution: Number(e.target.value)
                              }
                            }
                          })}
                          className="w-24 rounded-xl text-xs h-8"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={() => setIsPlanModalOpen(false)} className="rounded-xl text-xs">
                  Cancel
                </Button>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs">
                  {editingPlan ? 'Save Changes' : 'Create Plan'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default BenefitsAdministration;
