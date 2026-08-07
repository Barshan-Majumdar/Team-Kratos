import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, User, Lock, ArrowRight, ArrowLeft, Loader2, CheckCircle2, 
  Briefcase, Tag, MapPin, Globe, Hash, CreditCard, ShieldCheck, Mail, 
  Phone, Eye, EyeOff, Sparkles, AlertCircle, Plus, X, Layers, Shield
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const DEPT_PRESETS = [
  'Engineering', 'Product', 'Design', 'Marketing', 'Sales', 
  'Finance', 'HR', 'Operations', 'Legal', 'Customer Support', 
  'Data & Analytics', 'DevOps'
];
const INDUSTRY_OPTS = [
  'Technology / SaaS', 'Manufacturing', 'Healthcare', 'Retail / E-commerce', 
  'Financial Services', 'Education', 'Consulting / Services', 
  'Media & Entertainment', 'Logistics', 'Real Estate', 'Other'
];
const SIZE_OPTS = ['1–10', '11–50', '51–200', '201–500', '501–2000', '2000+'];
const COUNTRY_OPTS = ['India', 'United States', 'United Kingdom', 'Singapore', 'UAE', 'Germany', 'Canada', 'Australia', 'Other'];
const STATE_OPTS = [
  'Andhra Pradesh', 'Bihar', 'Delhi', 'Gujarat', 'Haryana', 'Karnataka', 
  'Kerala', 'Maharashtra', 'Punjab', 'Rajasthan', 'Tamil Nadu', 
  'Telangana', 'Uttar Pradesh', 'West Bengal', 'Other'
];

/* Reusable Bespoke Warm Stone Doppelrand Input Field */
const InputField = ({ 
  label, id, val, setter, type = 'text', required, errorObj, placeholder, parentState, icon: Icon, rightElement 
}) => (
  <div className="mb-5">
    <div className="flex items-center justify-between mb-2">
      <label className="text-xs font-bold uppercase tracking-wider text-[#1D1B16] flex items-center gap-1.5">
        {label}
        {required && <span className="w-1.5 h-1.5 rounded-full bg-[#1F2B4D] inline-block"></span>}
      </label>
      {errorObj[id] && (
        <span className="text-xs text-rose-600 font-semibold animate-pulse flex items-center gap-1">
          <AlertCircle size={12} /> {errorObj[id]}
        </span>
      )}
    </div>
    <div className={`relative flex items-center rounded-xl bg-[#FAF9F6] border transition-all duration-200 shadow-xs ${
      errorObj[id] 
        ? 'border-rose-400 focus-within:ring-2 focus-within:ring-rose-500/20 bg-rose-50/20' 
        : 'border-[#EAE7E0] focus-within:border-[#1F2B4D] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#1F2B4D]/20'
    }`}>
      {Icon && (
        <div className="pl-3.5 pr-1 text-[#1F2B4D] shrink-0">
          <Icon size={17} />
        </div>
      )}
      <input 
        type={type} 
        value={val} 
        onChange={(e) => setter({ ...parentState, [id]: e.target.value })} 
        placeholder={placeholder}
        className="w-full bg-transparent text-[#1D1B16] placeholder:text-[#9A948A] px-3.5 py-3 text-sm font-medium outline-none" 
      />
      {rightElement && <div className="pr-3 shrink-0">{rightElement}</div>}
    </div>
  </div>
);

/* Reusable Bespoke Warm Stone Doppelrand Select Field */
const SelectField = ({ label, id, val, setter, options, required, errorObj, parentState, icon: Icon }) => (
  <div className="mb-5">
    <div className="flex items-center justify-between mb-2">
      <label className="text-xs font-bold uppercase tracking-wider text-[#1D1B16] flex items-center gap-1.5">
        {label}
        {required && <span className="w-1.5 h-1.5 rounded-full bg-[#1F2B4D] inline-block"></span>}
      </label>
      {errorObj[id] && (
        <span className="text-xs text-rose-600 font-semibold animate-pulse flex items-center gap-1">
          <AlertCircle size={12} /> {errorObj[id]}
        </span>
      )}
    </div>
    <div className={`relative flex items-center rounded-xl bg-[#FAF9F6] border transition-all duration-200 shadow-xs ${
      errorObj[id] 
        ? 'border-rose-400 focus-within:ring-2 focus-within:ring-rose-500/20 bg-rose-50/20' 
        : 'border-[#EAE7E0] focus-within:border-[#1F2B4D] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#1F2B4D]/20'
    }`}>
      {Icon && (
        <div className="pl-3.5 pr-1 text-[#1F2B4D] shrink-0">
          <Icon size={17} />
        </div>
      )}
      <select 
        value={val} 
        onChange={(e) => setter({ ...parentState, [id]: e.target.value })}
        className="w-full bg-transparent text-[#1D1B16] px-3.5 py-3 text-sm font-medium outline-none cursor-pointer rounded-xl appearance-none"
      >
        <option value="" className="bg-white text-[#9A948A]">Select option...</option>
        {options.map(o => (
          <option key={o} value={o} className="bg-white text-[#1D1B16] font-medium">{o}</option>
        ))}
      </select>
      <div className="pointer-events-none absolute right-3.5 text-[#6B655C]">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
        </svg>
      </div>
    </div>
  </div>
);

export default function RegistrationFlow() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [company, setCompany] = useState({
    name: 'workpuls', 
    legalName: 'workpuls', 
    cin: '', 
    pan: 'ABCDE1234F', 
    gstin: '22ABCDE1234F1Z5', 
    industry: 'Technology / SaaS', 
    size: '51–200', 
    website: '', 
    founded: '', 
    address: 'West Bengal 743423', 
    city: 'Barasat', 
    state: 'West Bengal', 
    pincode: '743423', 
    country: 'India'
  });

  const [departments, setDepartments] = useState(['Engineering', 'Product', 'HR', 'Finance']);
  const [customDept, setCustomDept] = useState('');

  const [roles, setRoles] = useState([
    { name: 'Owner / Chairman', level: 0, locked: true, canManage: 'all', description: 'Full platform control, registered the company workspace' },
    { name: 'Admin', level: 1, locked: true, canManage: 'below-1', description: 'Full HR & operations authority, manages all team profiles' },
    { name: 'Manager', level: 2, locked: true, canManage: 'below-2', description: 'Team-scoped approvals and performance reviews' },
    { name: 'Employee', level: 3, locked: true, canManage: 'none', description: 'Self-service portal, view personal profile and leave requests' },
  ]);
  const [newRole, setNewRole] = useState({ name: '', level: '2' });

  const [admin, setAdmin] = useState({ displayName: '', phone: '', designation: '', email: '', password: '' });

  const validateStep = (s) => {
    const errs = {};
    if (s === 1) {
      if (!company.name.trim()) errs.name = 'Display name required';
      if (!company.legalName.trim()) errs.legalName = 'Legal name required';
      if (!company.pan.trim()) errs.pan = 'PAN required';
      if (!company.industry) errs.industry = 'Select industry';
      if (!company.size) errs.size = 'Select size';
      if (!company.address.trim()) errs.address = 'Street address required';
      if (!company.city.trim()) errs.city = 'City required';
      if (!company.state) errs.state = 'State required';
      if (!company.pincode.trim()) errs.pincode = 'Pincode required';
      else if (!/^\d{6}$/.test(company.pincode)) errs.pincode = 'Valid 6-digit pincode';
      if (!company.country) errs.country = 'Country required';
    }
    if (s === 2) {
      if (departments.length === 0) errs.departments = 'Select at least 1 department';
    }
    if (s === 3) {
      if (roles.length < 2) errs.roles = 'At least 2 roles required';
    }
    if (s === 4) {
      if (!admin.displayName.trim()) errs.displayName = 'Full name required';
      if (!admin.designation.trim()) errs.designation = 'Designation required';
      if (!admin.phone.trim()) errs.phone = 'Phone number required';
      else if (!/^[6-9]\d{9}$/.test(admin.phone.replace(/\s/g, ''))) errs.phone = 'Valid 10-digit phone';
      if (!admin.email.trim()) errs.email = 'Email address required';
      if (!admin.password.trim() || admin.password.length < 6) errs.password = 'Min 6 characters';
    }
    setValidationErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(s => s + 1);
    }
  };

  const toggleDept = (d) => {
    setDepartments(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  };

  const addCustomDept = () => {
    if (customDept.trim() && !departments.includes(customDept.trim())) {
      setDepartments([...departments, customDept.trim()]);
    }
    setCustomDept('');
  };

  const addRole = () => {
    if (!newRole.name.trim() || roles.find(r => r.name.toLowerCase() === newRole.name.trim().toLowerCase())) return;
    const level = parseInt(newRole.level);
    const newRoles = [...roles, {
      name: newRole.name.trim(),
      level,
      locked: false,
      canManage: `below-${level}`,
      description: `Custom role at Level ${level}`
    }].sort((a, b) => a.level - b.level);
    setRoles(newRoles);
    setNewRole({ name: '', level: '2' });
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const payload = {
        companyName: company.name,
        legalName: company.legalName,
        industry: company.industry,
        size: company.size,
        website: company.website,
        founded: company.founded,
        pan: company.pan,
        gstin: company.gstin,
        cin: company.cin,
        address: company.address,
        city: company.city,
        state: company.state,
        pincode: company.pincode,
        country: company.country,
        departments: departments,
        customRoles: roles,
        ceoName: admin.displayName,
        designation: admin.designation,
        phone: admin.phone,
        email: admin.email,
        password: admin.password
      };

      const res = await fetch(`${API_BASE}/api/auth/register-company`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      setStep(7);
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/auth/register-company`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: admin.email, otpCode: otp })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      setStep(7);
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 2500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const stepLabels = ['Identity', 'Structure', 'Roles', 'Account', 'Review'];

  return (
    <div className="w-full max-w-4xl mx-auto my-2 px-2 sm:px-4">
      {/* Doppelrand Outer Shell Bezel */}
      <div className="rounded-[32px] bg-[#F4F1EA] border border-[#EAE7E0] shadow-[0_1px_2px_rgba(29,27,22,0.04),0_8px_20px_rgba(29,27,22,0.06)] p-3 sm:p-4 relative overflow-hidden">

        {/* Doppelrand Inner Core Surface */}
        <div className="rounded-[22px] bg-white border border-[#E2E8F0] p-6 sm:p-10 relative overflow-hidden shadow-xs">
          
          {/* Stepped Navigation Header */}
          {step < 6 && (
            <div className="mb-10 pt-2">
              <div className="flex items-center justify-between relative max-w-2xl mx-auto px-4">
                {/* Background Connecting Line */}
                <div className="absolute top-1/2 left-8 right-8 h-0.5 bg-[#EAE7E0] -z-10 -translate-y-1/2 rounded-full"></div>
                {/* Active Progress Line */}
                <div 
                  className="absolute top-1/2 left-8 h-0.5 bg-[#1F2B4D] -z-10 -translate-y-1/2 rounded-full transition-all duration-500" 
                  style={{ width: `${((step - 1) / 4) * 85}%` }}
                ></div>

                {[1, 2, 3, 4, 5].map((s, idx) => {
                  const isDone = step > s;
                  const isActive = step === s;
                  return (
                    <button 
                      key={s}
                      onClick={() => isDone && setStep(s)}
                      disabled={!isDone}
                      className="flex flex-col items-center gap-2 group cursor-pointer disabled:cursor-default"
                    >
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 relative ${
                        isDone 
                          ? 'bg-[#F0F3F9] text-[#1F2B4D] border-2 border-[#1F2B4D]' 
                          : isActive 
                            ? 'bg-[#1F2B4D] border-2 border-[#141C33] text-white scale-110 shadow-[0_0_12px_rgba(31,43,77,0.25)]' 
                            : 'bg-[#FAF9F6] border-2 border-[#EAE7E0] text-[#9A948A]'
                      }`}>
                        {isDone ? <CheckCircle2 size={16} className="text-[#1F2B4D]" /> : s}
                      </div>
                      <span className={`text-[11px] font-bold tracking-wider uppercase transition-colors ${
                        isActive ? 'text-[#1F2B4D]' : isDone ? 'text-[#1D1B16]' : 'text-[#9A948A]'
                      }`}>
                        {stepLabels[idx]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Global Error Banner */}
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }} 
              className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <AlertCircle className="shrink-0 text-rose-600" size={18} />
                <span className="font-medium">{error}</span>
              </div>
              {error.toLowerCase().includes('already registered') && (
                <div className="flex items-center gap-2 shrink-0">
                  <button 
                    onClick={() => setStep(4)} 
                    className="px-3 py-1.5 bg-white border border-[#EAE7E0] hover:bg-[#F4F1EA] text-[#1F2B4D] rounded-lg text-xs font-bold transition-all cursor-pointer"
                  >
                    Change Email
                  </button>
                  <a 
                    href="/login" 
                    className="px-3.5 py-1.5 bg-[#1F2B4D] hover:bg-[#141C33] text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                  >
                    Console Login
                  </a>
                </div>
              )}
            </motion.div>
          )}

          {/* Steps Content Animation Container */}
          <AnimatePresence mode="wait">
            {/* STEP 1: COMPANY DETAILS */}
            {step === 1 && (
              <motion.div 
                key="step1" 
                initial={{ opacity: 0, y: 15 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -15 }} 
                transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
                className="space-y-6"
              >
                <div>
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F4F1EA] text-[#1F2B4D] border border-[#EAE7E0] text-xs font-bold tracking-wider uppercase mb-3 shadow-xs">
                    <Sparkles size={13} /> STEP 01 OF 05 • ORGANIZATIONAL IDENTITY
                  </div>
                  <h2 className="text-3xl font-extrabold text-[#1D1B16] tracking-tight">Company Details</h2>
                  <p className="text-[#6B655C] text-sm mt-1">Let's set up the core legal and operational identity of your organization.</p>
                </div>
                
                <div className="grid md:grid-cols-2 gap-x-6">
                  <InputField label="Display Name" id="name" val={company.name} setter={setCompany} parentState={company} required errorObj={validationErrors} placeholder="e.g. Workpuls" icon={Building2} />
                  <InputField label="Legal Name" id="legalName" val={company.legalName} setter={setCompany} parentState={company} required errorObj={validationErrors} placeholder="e.g. Workpuls Technologies Pvt. Ltd." icon={Building2} />
                </div>

                <div className="grid md:grid-cols-2 gap-x-6">
                  <SelectField label="Industry" id="industry" val={company.industry} setter={setCompany} parentState={company} options={INDUSTRY_OPTS} required errorObj={validationErrors} icon={Briefcase} />
                  <SelectField label="Company Size" id="size" val={company.size} setter={setCompany} parentState={company} options={SIZE_OPTS} required errorObj={validationErrors} icon={Tag} />
                </div>

                <div className="grid md:grid-cols-2 gap-x-6">
                  <InputField label="PAN Number" id="pan" val={company.pan} setter={setCompany} parentState={company} required errorObj={validationErrors} placeholder="ABCDE1234F" icon={CreditCard} />
                  <InputField label="GSTIN (Optional)" id="gstin" val={company.gstin} setter={setCompany} parentState={company} errorObj={validationErrors} placeholder="22ABCDE1234F1Z5" icon={ShieldCheck} />
                </div>

                <div className="pt-4 border-t border-[#EAE7E0]">
                  <div className="flex items-center gap-2 mb-4">
                    <MapPin size={15} className="text-[#1F2B4D]" />
                    <h3 className="text-xs font-bold text-[#1D1B16] uppercase tracking-wider">Registered Address</h3>
                  </div>
                  <InputField label="Street Address" id="address" val={company.address} setter={setCompany} parentState={company} required errorObj={validationErrors} placeholder="Building, Street, Sector / Area" icon={MapPin} />
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4">
                    <InputField label="City" id="city" val={company.city} setter={setCompany} parentState={company} required errorObj={validationErrors} placeholder="City" icon={Building2} />
                    <SelectField label="State" id="state" val={company.state} setter={setCompany} parentState={company} options={STATE_OPTS} required errorObj={validationErrors} icon={Globe} />
                    <InputField label="Pincode" id="pincode" val={company.pincode} setter={setCompany} parentState={company} required errorObj={validationErrors} placeholder="743423" icon={Hash} />
                    <SelectField label="Country" id="country" val={company.country} setter={setCompany} parentState={company} options={COUNTRY_OPTS} required errorObj={validationErrors} icon={Globe} />
                  </div>
                </div>

                {/* Footer Navigation */}
                <div className="flex items-center justify-end pt-6 border-t border-[#EAE7E0]">
                  <button 
                    onClick={handleNext} 
                    className="relative group rounded-xl bg-[#1F2B4D] hover:bg-[#141C33] text-white px-7 py-3.5 font-bold shadow-md hover:shadow-lg active:scale-[0.99] transition-all duration-300 flex items-center gap-3 cursor-pointer"
                  >
                    <span>Continue to Structure</span>
                    <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center group-hover:translate-x-1 transition-transform">
                      <ArrowRight size={15} />
                    </div>
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 2: DEPARTMENTS & STRUCTURE */}
            {step === 2 && (
              <motion.div 
                key="step2" 
                initial={{ opacity: 0, y: 15 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -15 }} 
                transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
                className="space-y-6"
              >
                <div>
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F4F1EA] text-[#1F2B4D] border border-[#EAE7E0] text-xs font-bold tracking-wider uppercase mb-3 shadow-xs">
                    <Layers size={13} /> STEP 02 OF 05 • WORKFORCE STRUCTURE
                  </div>
                  <h2 className="text-3xl font-extrabold text-[#1D1B16] tracking-tight">Departments & Teams</h2>
                  <p className="text-[#6B655C] text-sm mt-1">Configure active departments to structure your company's organizational tree.</p>
                </div>

                {validationErrors.departments && (
                  <p className="text-xs text-rose-600 font-semibold flex items-center gap-1"><AlertCircle size={12} /> {validationErrors.departments}</p>
                )}

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#1D1B16] mb-3">
                    Preset Department Archetypes ({departments.length} selected)
                  </label>
                  <div className="flex flex-wrap gap-2.5">
                    {DEPT_PRESETS.map(d => {
                      const selected = departments.includes(d);
                      return (
                        <button 
                          key={d} 
                          type="button"
                          onClick={() => toggleDept(d)} 
                          className={`px-4 py-2.5 rounded-xl border text-xs font-semibold transition-all duration-200 flex items-center gap-2 cursor-pointer ${
                            selected 
                              ? 'bg-[#F0F3F9] border-[#1F2B4D] text-[#1F2B4D] shadow-xs' 
                              : 'bg-[#FAF9F6] border-[#EAE7E0] text-[#6B655C] hover:border-[#1F2B4D]/30 hover:text-[#1D1B16]'
                          }`}
                        >
                          {selected && <CheckCircle2 size={14} className="text-[#1F2B4D]" />}
                          {d}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-6 border-t border-[#EAE7E0]">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#1D1B16] mb-2">
                    Add Custom Department
                  </label>
                  <div className="flex gap-3 max-w-md">
                    <div className="relative flex-1 flex items-center rounded-xl bg-[#FAF9F6] border border-[#EAE7E0] focus-within:border-[#1F2B4D] transition-all">
                      <div className="pl-3.5 pr-1 text-[#1F2B4D]"><Plus size={16} /></div>
                      <input 
                        type="text" 
                        value={customDept} 
                        onChange={e => setCustomDept(e.target.value)} 
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomDept())} 
                        placeholder="e.g. AI Research / Labs" 
                        className="w-full bg-transparent text-[#1D1B16] placeholder:text-[#9A948A] px-3 py-2.5 text-sm outline-none" 
                      />
                    </div>
                    <button 
                      type="button"
                      onClick={addCustomDept} 
                      className="px-5 py-2.5 bg-[#1F2B4D] hover:bg-[#141C33] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                    >
                      Add Team
                    </button>
                  </div>
                </div>

                {departments.filter(d => !DEPT_PRESETS.includes(d)).length > 0 && (
                  <div className="pt-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#6B655C] mb-2">Custom Teams Added</label>
                    <div className="flex flex-wrap gap-2">
                      {departments.filter(d => !DEPT_PRESETS.includes(d)).map(d => (
                        <span key={d} className="px-3 py-1.5 rounded-xl border bg-[#F0F3F9] border-[#1F2B4D]/40 text-[#1F2B4D] text-xs font-semibold flex items-center gap-2">
                          {d}
                          <button onClick={() => toggleDept(d)} className="hover:text-rose-600 cursor-pointer"><X size={13} /></button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer Navigation */}
                <div className="flex items-center justify-between pt-6 border-t border-[#EAE7E0]">
                  <button 
                    onClick={() => setStep(1)} 
                    className="bg-[#F4F1EA] hover:bg-[#EAE7E0] text-[#1F2B4D] border border-[#EAE7E0] rounded-xl px-5 py-3 font-semibold transition-all flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <ArrowLeft size={16} /> Back
                  </button>
                  <button 
                    onClick={handleNext} 
                    className="relative group rounded-xl bg-[#1F2B4D] hover:bg-[#141C33] text-white px-7 py-3.5 font-bold shadow-md hover:shadow-lg active:scale-[0.99] transition-all duration-300 flex items-center gap-3 cursor-pointer"
                  >
                    <span>Configure Roles</span>
                    <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center group-hover:translate-x-1 transition-transform">
                      <ArrowRight size={15} />
                    </div>
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 3: ROLE HIERARCHY */}
            {step === 3 && (
              <motion.div 
                key="step3" 
                initial={{ opacity: 0, y: 15 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -15 }} 
                transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
                className="space-y-6"
              >
                <div>
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F4F1EA] text-[#1F2B4D] border border-[#EAE7E0] text-xs font-bold tracking-wider uppercase mb-3 shadow-xs">
                    <Shield size={13} /> STEP 03 OF 05 • ACCESS & ROLES
                  </div>
                  <h2 className="text-3xl font-extrabold text-[#1D1B16] tracking-tight">Role Hierarchy</h2>
                  <p className="text-[#6B655C] text-sm mt-1">Define role authority levels for organizational governance and permission scoping.</p>
                </div>

                <div className="bg-[#F0F3F9] border border-[#1F2B4D]/20 rounded-2xl p-4 flex items-start gap-3 text-sm text-[#1F2B4D]">
                  <Lock className="text-[#1F2B4D] mt-0.5 shrink-0" size={17} />
                  <p className="text-xs leading-relaxed text-[#1D1B16]">
                    <strong className="font-bold text-[#1F2B4D]">Strict Governance Hierarchy:</strong> Users are strictly prohibited from assigning or escalating privileges above their own registered role tier.
                  </p>
                </div>

                <div className="border border-[#EAE7E0] rounded-2xl overflow-hidden bg-white shadow-xs">
                  <div className="grid grid-cols-[auto_1fr_auto_auto] gap-4 items-center bg-[#F4F1EA] px-5 py-3 border-b border-[#EAE7E0] text-[11px] font-bold text-[#1D1B16] uppercase tracking-wider">
                    <div className="w-10 text-center">Tier</div>
                    <div>Role Architecture</div>
                    <div className="hidden sm:block">Scope</div>
                    <div className="w-16"></div>
                  </div>
                  
                  {roles.map((r, i) => (
                    <div key={i} className="grid grid-cols-[auto_1fr_auto_auto] gap-4 items-center px-5 py-4 border-b border-[#EAE7E0] hover:bg-[#FAF9F6] transition-colors">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold ${
                        r.level === 0 ? 'bg-[#0F172A] text-white' : 
                        r.level === 1 ? 'bg-[#F0F3F9] text-[#1F2B4D] border border-[#1F2B4D]/30' : 
                        r.level === 2 ? 'bg-[#F4F1EA] text-[#1D1B16] border border-[#EAE7E0]' : 'bg-[#FAF9F6] text-[#6B655C] border border-[#EAE7E0]'
                      }`}>
                        L{r.level}
                      </div>
                      <div>
                        <p className="font-bold text-[#1D1B16] text-sm flex items-center gap-2">
                          {r.name} {r.locked && <Lock size={12} className="text-[#9A948A]" />}
                        </p>
                        <p className="text-xs text-[#6B655C]">{r.description}</p>
                      </div>
                      <div className="hidden sm:block text-[11px] font-semibold text-[#1F2B4D] bg-[#F0F3F9] px-2.5 py-1 rounded-full border border-[#1F2B4D]/20">
                        {r.canManage === 'all' ? 'Unrestricted' : `Level ${parseInt(r.level)+1}+`}
                      </div>
                      <div className="w-16 text-right">
                        {!r.locked && (
                          <button onClick={() => setRoles(roles.filter((_, idx) => idx !== i))} className="text-rose-600 hover:text-rose-800 text-xs font-bold cursor-pointer">
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  <div className="p-4 bg-[#F4F1EA] flex flex-col sm:flex-row gap-3">
                    <input 
                      type="text" 
                      placeholder="Custom Role (e.g. Tech Lead)" 
                      value={newRole.name} 
                      onChange={e => setNewRole({...newRole, name: e.target.value})} 
                      className="flex-1 rounded-xl border border-[#EAE7E0] bg-white px-4 py-2.5 text-xs text-[#1D1B16] outline-none focus:border-[#1F2B4D]" 
                    />
                    <select 
                      value={newRole.level} 
                      onChange={e => setNewRole({...newRole, level: e.target.value})} 
                      className="rounded-xl border border-[#EAE7E0] bg-white px-3 py-2.5 text-xs text-[#1D1B16] outline-none focus:border-[#1F2B4D] cursor-pointer"
                    >
                      <option value="1">Level 1 (Admin)</option>
                      <option value="2">Level 2 (Manager)</option>
                      <option value="3">Level 3 (Staff)</option>
                    </select>
                    <button 
                      onClick={addRole} 
                      className="bg-[#1F2B4D] hover:bg-[#141C33] text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      Add Role
                    </button>
                  </div>
                </div>

                {/* Footer Navigation */}
                <div className="flex items-center justify-between pt-6 border-t border-[#EAE7E0]">
                  <button 
                    onClick={() => setStep(2)} 
                    className="bg-[#F4F1EA] hover:bg-[#EAE7E0] text-[#1F2B4D] border border-[#EAE7E0] rounded-xl px-5 py-3 font-semibold transition-all flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <ArrowLeft size={16} /> Back
                  </button>
                  <button 
                    onClick={handleNext} 
                    className="relative group rounded-xl bg-[#1F2B4D] hover:bg-[#141C33] text-white px-7 py-3.5 font-bold shadow-md hover:shadow-lg active:scale-[0.99] transition-all duration-300 flex items-center gap-3 cursor-pointer"
                  >
                    <span>Founder Profile</span>
                    <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center group-hover:translate-x-1 transition-transform">
                      <ArrowRight size={15} />
                    </div>
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 4: ACCOUNT DETAILS / FOUNDER PROFILE */}
            {step === 4 && (
              <motion.div 
                key="step4" 
                initial={{ opacity: 0, y: 15 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -15 }} 
                transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
                className="space-y-6"
              >
                <div>
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F4F1EA] text-[#1F2B4D] border border-[#EAE7E0] text-xs font-bold tracking-wider uppercase mb-3 shadow-xs">
                    <User size={13} /> STEP 04 OF 05 • MASTER OWNER ACCOUNT
                  </div>
                  <h2 className="text-3xl font-extrabold text-[#1D1B16] tracking-tight">Founder & Admin Profile</h2>
                  <p className="text-[#6B655C] text-sm mt-1">This account will be created with master Level 0 Owner administrative credentials.</p>
                </div>

                <div className="grid md:grid-cols-2 gap-x-6">
                  <InputField label="Full Name" id="displayName" val={admin.displayName} setter={setAdmin} parentState={admin} required errorObj={validationErrors} placeholder="e.g. Alex Morgan" icon={User} />
                  <InputField label="Designation" id="designation" val={admin.designation} setter={setAdmin} parentState={admin} required errorObj={validationErrors} placeholder="e.g. CEO & Founder" icon={Briefcase} />
                </div>

                <div className="grid md:grid-cols-2 gap-x-6">
                  <InputField label="Mobile Number" id="phone" val={admin.phone} setter={setAdmin} parentState={admin} required errorObj={validationErrors} placeholder="9876543210" icon={Phone} />
                  <InputField label="Work Email Address" id="email" val={admin.email} setter={setAdmin} parentState={admin} type="email" required errorObj={validationErrors} placeholder="alex@company.com" icon={Mail} />
                </div>
                
                <InputField 
                  label="Master Account Password" 
                  id="password" 
                  val={admin.password} 
                  setter={setAdmin} 
                  parentState={admin} 
                  type={showPassword ? 'text' : 'password'} 
                  required 
                  errorObj={validationErrors} 
                  placeholder="Minimum 6 characters" 
                  icon={Lock}
                  rightElement={
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)} 
                      className="text-[#6B655C] hover:text-[#1D1B16] transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  }
                />

                {/* Footer Navigation */}
                <div className="flex items-center justify-between pt-6 border-t border-[#EAE7E0]">
                  <button 
                    onClick={() => setStep(3)} 
                    className="bg-[#F4F1EA] hover:bg-[#EAE7E0] text-[#1F2B4D] border border-[#EAE7E0] rounded-xl px-5 py-3 font-semibold transition-all flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <ArrowLeft size={16} /> Back
                  </button>
                  <button 
                    onClick={handleNext} 
                    className="relative group rounded-xl bg-[#1F2B4D] hover:bg-[#141C33] text-white px-7 py-3.5 font-bold shadow-md hover:shadow-lg active:scale-[0.99] transition-all duration-300 flex items-center gap-3 cursor-pointer"
                  >
                    <span>Review Registration</span>
                    <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center group-hover:translate-x-1 transition-transform">
                      <ArrowRight size={15} />
                    </div>
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 5: REVIEW & CONFIRM */}
            {step === 5 && (
              <motion.div 
                key="step5" 
                initial={{ opacity: 0, y: 15 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -15 }} 
                transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
                className="space-y-6"
              >
                <div>
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F4F1EA] text-[#1F2B4D] border border-[#EAE7E0] text-xs font-bold tracking-wider uppercase mb-3 shadow-xs">
                    <CheckCircle2 size={13} /> STEP 05 OF 05 • ENTERPRISE REVIEW
                  </div>
                  <h2 className="text-3xl font-extrabold text-[#1D1B16] tracking-tight">Review & Confirm</h2>
                  <p className="text-[#6B655C] text-sm mt-1">Please verify all workspace parameters before initiating email verification.</p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-[#FAF9F6] border border-[#EAE7E0] rounded-2xl p-5 relative">
                    <div className="flex items-center justify-between border-b border-[#EAE7E0] pb-3 mb-3">
                      <h4 className="text-xs font-bold text-[#1D1B16] uppercase tracking-wider flex items-center gap-2">
                        <Building2 size={15} className="text-[#1F2B4D]" /> Company Details
                      </h4>
                      <button onClick={() => setStep(1)} className="text-xs text-[#1F2B4D] hover:underline cursor-pointer font-bold">Edit</button>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div><span className="text-[#6B655C]">Display Name:</span> <span className="text-[#1D1B16] font-bold ml-1">{company.name}</span></div>
                      <div><span className="text-[#6B655C]">Legal Name:</span> <span className="text-[#1D1B16] font-bold ml-1">{company.legalName}</span></div>
                      <div><span className="text-[#6B655C]">Industry & Size:</span> <span className="text-[#1D1B16] font-bold ml-1">{company.industry} • {company.size}</span></div>
                      <div><span className="text-[#6B655C]">PAN:</span> <span className="text-[#1D1B16] font-bold ml-1">{company.pan}</span></div>
                      <div><span className="text-[#6B655C]">Location:</span> <span className="text-[#1D1B16] font-bold ml-1">{company.city}, {company.state}, {company.country}</span></div>
                    </div>
                  </div>

                  <div className="bg-[#FAF9F6] border border-[#EAE7E0] rounded-2xl p-5 relative">
                    <div className="flex items-center justify-between border-b border-[#EAE7E0] pb-3 mb-3">
                      <h4 className="text-xs font-bold text-[#1D1B16] uppercase tracking-wider flex items-center gap-2">
                        <User size={15} className="text-[#1F2B4D]" /> Founder Account
                      </h4>
                      <button onClick={() => setStep(4)} className="text-xs text-[#1F2B4D] hover:underline cursor-pointer font-bold">Edit</button>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div><span className="text-[#6B655C]">Name:</span> <span className="text-[#1D1B16] font-bold ml-1">{admin.displayName}</span></div>
                      <div><span className="text-[#6B655C]">Designation:</span> <span className="text-[#1D1B16] font-bold ml-1">{admin.designation}</span></div>
                      <div><span className="text-[#6B655C]">Email:</span> <span className="text-[#1D1B16] font-bold ml-1">{admin.email}</span></div>
                      <div><span className="text-[#6B655C]">Phone:</span> <span className="text-[#1D1B16] font-bold ml-1">{admin.phone}</span></div>
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-[#FAF9F6] border border-[#EAE7E0] rounded-2xl p-5">
                    <div className="flex items-center justify-between border-b border-[#EAE7E0] pb-3 mb-3">
                      <h4 className="text-xs font-bold text-[#1D1B16] uppercase tracking-wider flex items-center gap-2">
                        <Layers size={15} className="text-[#1F2B4D]" /> Departments ({departments.length})
                      </h4>
                      <button onClick={() => setStep(2)} className="text-xs text-[#1F2B4D] hover:underline cursor-pointer font-bold">Edit</button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {departments.map(d => (
                        <span key={d} className="px-2.5 py-1 rounded-lg bg-[#F0F3F9] text-[#1F2B4D] text-[11px] font-bold border border-[#1F2B4D]/20">
                          {d}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="bg-[#FAF9F6] border border-[#EAE7E0] rounded-2xl p-5">
                    <div className="flex items-center justify-between border-b border-[#EAE7E0] pb-3 mb-3">
                      <h4 className="text-xs font-bold text-[#1D1B16] uppercase tracking-wider flex items-center gap-2">
                        <Shield size={15} className="text-[#1F2B4D]" /> Roles Configured ({roles.length})
                      </h4>
                      <button onClick={() => setStep(3)} className="text-xs text-[#1F2B4D] hover:underline cursor-pointer font-bold">Edit</button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {roles.map(r => (
                        <span key={r.name} className="px-2.5 py-1 rounded-lg bg-white text-[#1D1B16] text-[11px] font-semibold border border-[#EAE7E0]">
                          L{r.level}: {r.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer Navigation */}
                <div className="flex items-center justify-between pt-6 border-t border-[#EAE7E0]">
                  <button 
                    onClick={() => setStep(4)} 
                    disabled={loading}
                    className="bg-[#F4F1EA] hover:bg-[#EAE7E0] text-[#1F2B4D] border border-[#EAE7E0] rounded-xl px-5 py-3 font-semibold transition-all flex items-center gap-2 text-sm cursor-pointer disabled:opacity-50"
                  >
                    <ArrowLeft size={16} /> Back
                  </button>
                  <button 
                    onClick={handleSubmit} 
                    disabled={loading}
                    className="relative group rounded-xl bg-[#1F2B4D] hover:bg-[#141C33] text-white px-8 py-3.5 font-bold shadow-md hover:shadow-lg active:scale-[0.99] transition-all duration-300 flex items-center justify-center gap-3 cursor-pointer disabled:opacity-60"
                  >
                    {loading ? (
                      <Loader2 className="animate-spin text-white" size={18} />
                    ) : (
                      <>
                        <span>Complete Enterprise Registration</span>
                        <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center group-hover:translate-x-1 transition-transform">
                          <ArrowRight size={15} />
                        </div>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 6: OTP VERIFICATION */}
            {step === 6 && (
              <motion.div 
                key="step6" 
                initial={{ opacity: 0, scale: 0.96 }} 
                animate={{ opacity: 1, scale: 1 }} 
                className="space-y-6 text-center py-6"
              >
                <div className="w-16 h-16 rounded-full bg-[#F0F3F9] border border-[#1F2B4D]/30 text-[#1F2B4D] flex items-center justify-center mx-auto mb-2 shadow-xs">
                  <Lock size={30} />
                </div>
                <div>
                  <h2 className="text-3xl font-extrabold text-[#1D1B16] tracking-tight">Verify Your Email</h2>
                  <p className="text-[#6B655C] text-sm mt-2 max-w-sm mx-auto">
                    We've sent a 6-digit OTP code to <strong className="text-[#1D1B16]">{admin.email}</strong>.
                  </p>
                </div>
                
                <div className="max-w-xs mx-auto pt-2">
                  <input 
                    type="text" 
                    maxLength={6} 
                    placeholder="••••••" 
                    value={otp} 
                    onChange={e => setOtp(e.target.value.replace(/\D/g, ''))} 
                    className="w-full text-center text-3xl font-mono tracking-[0.5em] rounded-2xl border border-[#EAE7E0] bg-[#FAF9F6] px-4 py-4 text-[#1D1B16] outline-none focus:border-[#1F2B4D] focus:bg-white focus:ring-2 focus:ring-[#1F2B4D]/20 transition-all font-bold shadow-xs"
                  />
                </div>

                <div className="flex justify-center pt-4">
                  <button 
                    onClick={handleVerifyOtp} 
                    disabled={loading || otp.length !== 6} 
                    className="relative group rounded-xl bg-[#1F2B4D] hover:bg-[#141C33] text-white px-10 py-3.5 font-bold shadow-md hover:shadow-lg active:scale-[0.99] transition-all duration-300 flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 className="animate-spin" size={18} />
                    ) : (
                      <span>Complete Registration</span>
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 7: SUCCESS STATE */}
            {step === 7 && (
              <motion.div 
                key="step7" 
                initial={{ opacity: 0, scale: 0.96 }} 
                animate={{ opacity: 1, scale: 1 }} 
                className="text-center py-12"
              >
                <div className="w-20 h-20 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] flex items-center justify-center mx-auto mb-6 shadow-xs">
                  <CheckCircle2 size={44} />
                </div>
                <h2 className="text-3xl font-extrabold text-[#1D1B16] tracking-tight mb-2">Enterprise Created!</h2>
                <p className="text-[#6B655C] text-sm max-w-sm mx-auto mb-6">Your workspace and owner profile have been initialized. Launching HR Dashboard...</p>
                <div className="flex justify-center">
                  <Loader2 className="animate-spin text-[#1F2B4D]" size={32} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </div>
  );
}
