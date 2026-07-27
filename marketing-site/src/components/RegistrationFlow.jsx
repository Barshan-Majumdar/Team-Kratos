import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, User, Lock, ArrowRight, ArrowLeft, Loader2, CheckCircle, Briefcase, Tag } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const MAIN_APP_URL = import.meta.env.VITE_APP_URL || 'http://localhost:5173';

const DEPT_PRESETS = ['Engineering', 'Product', 'Design', 'Marketing', 'Sales', 'Finance', 'HR', 'Operations', 'Legal', 'Customer Support', 'Data & Analytics', 'DevOps'];
const INDUSTRY_OPTS = ['Technology / SaaS', 'Manufacturing', 'Healthcare', 'Retail / E-commerce', 'Financial Services', 'Education', 'Consulting / Services', 'Media & Entertainment', 'Logistics', 'Real Estate', 'Other'];
const SIZE_OPTS = ['1–10', '11–50', '51–200', '201–500', '501–2000', '2000+'];
const COUNTRY_OPTS = ['India', 'United States', 'United Kingdom', 'Singapore', 'UAE', 'Germany', 'Canada', 'Australia', 'Other'];
const STATE_OPTS = ['Andhra Pradesh', 'Bihar', 'Delhi', 'Gujarat', 'Haryana', 'Karnataka', 'Kerala', 'Maharashtra', 'Punjab', 'Rajasthan', 'Tamil Nadu', 'Telangana', 'Uttar Pradesh', 'West Bengal', 'Other'];

const InputField = ({ label, id, val, setter, type = 'text', required, errorObj, placeholder, parentState }) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-slate-700 mb-1">{label} {required && <span className="text-rose-500">*</span>}</label>
    <input type={type} value={val} onChange={(e) => setter({ ...parentState, [id]: e.target.value })} placeholder={placeholder}
      className={`w-full rounded-xl border ${errorObj[id] ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-indigo-500'} bg-white px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all`} />
    {errorObj[id] && <p className="text-xs text-rose-500 mt-1">{errorObj[id]}</p>}
  </div>
);

const SelectField = ({ label, id, val, setter, options, required, errorObj, parentState }) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-slate-700 mb-1">{label} {required && <span className="text-rose-500">*</span>}</label>
    <select value={val} onChange={(e) => setter({ ...parentState, [id]: e.target.value })}
      className={`w-full rounded-xl border ${errorObj[id] ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-indigo-500'} bg-white px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all`}>
      <option value="">Select...</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
    {errorObj[id] && <p className="text-xs text-rose-500 mt-1">{errorObj[id]}</p>}
  </div>
);

export default function RegistrationFlow() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [otp, setOtp] = useState('');

  const [company, setCompany] = useState({
    name: '', legalName: '', cin: '', pan: '', gstin: '', industry: '', size: '', website: '', founded: '', address: '', city: '', state: '', pincode: '', country: 'India'
  });

  const [departments, setDepartments] = useState([]);
  const [customDept, setCustomDept] = useState('');

  const [roles, setRoles] = useState([
    { name: 'Owner / Chairman', level: 0, locked: true, canManage: 'all', description: 'Full platform access, registered the company' },
    { name: 'Admin', level: 1, locked: true, canManage: 'below-1', description: 'Full HR operations, manages all employees' },
    { name: 'Manager', level: 2, locked: true, canManage: 'below-2', description: 'Team-scoped approvals, views team data' },
    { name: 'Employee', level: 3, locked: true, canManage: 'none', description: 'Self-service, own data only' },
  ]);
  const [newRole, setNewRole] = useState({ name: '', level: '2' });

  const [admin, setAdmin] = useState({ displayName: '', phone: '', designation: '', email: '', password: '' });

  const validateStep = (s) => {
    const errs = {};
    if (s === 1) {
      if (!company.name.trim()) errs.name = 'Company name is required';
      if (!company.legalName.trim()) errs.legalName = 'Legal / registered name is required';
      if (!company.pan.trim()) errs.pan = 'PAN is required';
      if (!company.industry) errs.industry = 'Select an industry';
      if (!company.size) errs.size = 'Select company size';
      if (!company.address.trim()) errs.address = 'Registered address is required';
      if (!company.city.trim()) errs.city = 'City is required';
      if (!company.state) errs.state = 'State is required';
      if (!company.pincode.trim()) errs.pincode = 'Pincode is required';
      else if (!/^\d{6}$/.test(company.pincode)) errs.pincode = 'Enter a valid 6-digit pincode';
      if (!company.country) errs.country = 'Country is required';
    }
    if (s === 2) {
      if (departments.length === 0) errs.departments = 'Add at least one department';
    }
    if (s === 3) {
      if (roles.length < 2) errs.roles = 'At least 2 roles required';
    }
    if (s === 4) {
      if (!admin.displayName.trim()) errs.displayName = 'Your name is required';
      if (!admin.designation.trim()) errs.designation = 'Your designation is required';
      if (!admin.phone.trim()) errs.phone = 'Phone number is required';
      else if (!/^[6-9]\d{9}$/.test(admin.phone.replace(/\s/g, ''))) errs.phone = 'Enter a valid 10-digit Indian mobile number';
      if (!admin.email.trim()) errs.email = 'Email is required';
      if (!admin.password.trim() || admin.password.length < 6) errs.password = 'Password must be at least 6 characters';
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
      description: `Custom role at level ${level} — can manage roles below level ${level}`
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

      const res = await fetch(`${API_BASE}/api/auth/send-registration-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send OTP');
      
      setStep(6);
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
      }, 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto glass rounded-[2rem] p-8 md:p-10 shadow-2xl shadow-indigo-100/50 relative overflow-hidden mt-8 md:mt-0">
      {/* Steps Header */}
      {step < 6 && (
        <div className="flex items-center justify-between mb-8 relative">
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-100 -z-10 -translate-y-1/2 rounded-full"></div>
          <div className="absolute top-1/2 left-0 h-0.5 bg-indigo-500 -z-10 -translate-y-1/2 rounded-full transition-all duration-500" style={{ width: `${((step - 1) / 4) * 100}%` }}></div>
          
          {[1, 2, 3, 4, 5].map(s => (
            <div key={s} className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all duration-300 ${step > s ? 'bg-indigo-500 border-indigo-500 text-white' : step === s ? 'bg-white border-indigo-500 text-indigo-600 shadow-[0_0_0_4px_rgba(99,102,241,0.1)]' : 'bg-white border-slate-200 text-slate-400'}`}>
              {step > s ? <CheckCircle size={16} /> : s}
            </div>
          ))}
        </div>
      )}

      {error && <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-sm flex items-center gap-2"><Lock size={16} />{error}</div>}

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Company Details</h2>
              <p className="text-slate-500 text-sm mt-1">Let's set up the core identity of your organization.</p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-x-4">
              <InputField label="Display Name" id="name" val={company.name} setter={setCompany} parentState={company} required errorObj={validationErrors} placeholder="Acme Inc" />
              <InputField label="Legal Name" id="legalName" val={company.legalName} setter={setCompany} parentState={company} required errorObj={validationErrors} placeholder="Acme Technologies Pvt. Ltd." />
            </div>

            <div className="grid md:grid-cols-2 gap-x-4">
              <SelectField label="Industry" id="industry" val={company.industry} setter={setCompany} parentState={company} options={INDUSTRY_OPTS} required errorObj={validationErrors} />
              <SelectField label="Company Size" id="size" val={company.size} setter={setCompany} parentState={company} options={SIZE_OPTS} required errorObj={validationErrors} />
            </div>

            <div className="grid md:grid-cols-2 gap-x-4">
              <InputField label="PAN Number" id="pan" val={company.pan} setter={setCompany} parentState={company} required errorObj={validationErrors} placeholder="ABCDE1234F" />
              <InputField label="GSTIN (Optional)" id="gstin" val={company.gstin} setter={setCompany} parentState={company} errorObj={validationErrors} placeholder="22ABCDE1234F1Z5" />
            </div>

            <div className="border-t border-slate-100 pt-4 mt-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Registered Address</h3>
              <InputField label="Street Address" id="address" val={company.address} setter={setCompany} parentState={company} required errorObj={validationErrors} placeholder="Building, Street, Area" />
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4">
                <div className="col-span-2 md:col-span-1"><InputField label="City" id="city" val={company.city} setter={setCompany} parentState={company} required errorObj={validationErrors} placeholder="City" /></div>
                <div className="col-span-2 md:col-span-1"><SelectField label="State" id="state" val={company.state} setter={setCompany} parentState={company} options={STATE_OPTS} required errorObj={validationErrors} /></div>
                <div className="col-span-2 md:col-span-1"><InputField label="Pincode" id="pincode" val={company.pincode} setter={setCompany} parentState={company} required errorObj={validationErrors} placeholder="000000" /></div>
                <div className="col-span-2 md:col-span-1"><SelectField label="Country" id="country" val={company.country} setter={setCompany} parentState={company} options={COUNTRY_OPTS} required errorObj={validationErrors} /></div>
              </div>
            </div>

            <div className="flex justify-end pt-4"><button onClick={handleNext} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 flex items-center gap-2 transition-all">Next <ArrowRight size={18} /></button></div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Departments & Structure</h2>
              <p className="text-slate-500 text-sm mt-1">Select or add departments to organize your workforce.</p>
            </div>
            {validationErrors.departments && <p className="text-sm text-rose-500">{validationErrors.departments}</p>}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">Preset Departments</label>
              <div className="flex flex-wrap gap-2">
                {DEPT_PRESETS.map(d => (
                  <button key={d} onClick={() => toggleDept(d)} className={`px-4 py-2 rounded-full border text-sm font-medium transition-all ${departments.includes(d) ? 'bg-indigo-50 border-indigo-600 text-indigo-700 shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                    {d} {departments.includes(d) && <span className="ml-1 opacity-60">×</span>}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <label className="block text-sm font-medium text-slate-700 mb-2">Add Custom Department</label>
              <div className="flex gap-2">
                <input type="text" value={customDept} onChange={e => setCustomDept(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCustomDept()} placeholder="e.g. Innovation Labs" className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" />
                <button onClick={addCustomDept} className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors">Add</button>
              </div>
            </div>

            {departments.filter(d => !DEPT_PRESETS.includes(d)).length > 0 && (
              <div className="pt-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">Custom Departments</label>
                <div className="flex flex-wrap gap-2">
                  {departments.filter(d => !DEPT_PRESETS.includes(d)).map(d => (
                    <button key={d} onClick={() => toggleDept(d)} className="px-4 py-2 rounded-full border bg-indigo-50 border-indigo-600 text-indigo-700 text-sm font-medium shadow-sm flex items-center gap-1">
                      {d} <span className="opacity-60">×</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between pt-6">
              <button onClick={() => setStep(1)} className="text-slate-500 hover:text-slate-800 px-4 py-2.5 font-medium flex items-center gap-2 transition-colors"><ArrowLeft size={18} /> Back</button>
              <button onClick={handleNext} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 flex items-center gap-2 transition-all">Next <ArrowRight size={18} /></button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Role Hierarchy</h2>
              <p className="text-slate-500 text-sm mt-1">Define organizational roles. Higher levels have more authority.</p>
            </div>

            <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 flex items-start gap-3 mb-6">
              <Lock className="text-indigo-500 mt-0.5 shrink-0" size={18} />
              <p className="text-sm text-indigo-900 leading-relaxed">
                <strong>Strict Role Controls:</strong> Employees can only invite or assign roles that are strictly <span className="italic">below</span> their own level. The Chairman (Level 0) and Admins (Level 1) have unrestricted access.
              </p>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
              <div className="grid grid-cols-[auto_1fr_auto_auto] gap-4 items-center bg-slate-50 p-3 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <div className="w-8 text-center">Lvl</div>
                <div>Role Name</div>
                <div className="hidden sm:block">Permissions</div>
                <div className="w-16"></div>
              </div>
              
              {roles.map((r, i) => (
                <div key={i} className={`grid grid-cols-[auto_1fr_auto_auto] gap-4 items-center p-3 border-b border-slate-100 ${r.locked ? 'bg-slate-50/50' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${r.level === 0 ? 'bg-purple-100 text-purple-700' : r.level === 1 ? 'bg-indigo-100 text-indigo-700' : r.level === 2 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>L{r.level}</div>
                  <div>
                    <p className="font-semibold text-slate-800 text-sm flex items-center gap-1.5">{r.name} {r.locked && <Lock size={12} className="text-slate-400" />}</p>
                    <p className="text-xs text-slate-500 truncate">{r.description}</p>
                  </div>
                  <div className="hidden sm:block text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-md">{r.canManage === 'all' ? 'Unrestricted' : `Manages L${parseInt(r.level)+1}+`}</div>
                  <div className="w-16 text-right">
                    {!r.locked && <button onClick={() => setRoles(roles.filter((_, idx) => idx !== i))} className="text-rose-500 hover:text-rose-700 text-xs font-medium">Remove</button>}
                  </div>
                </div>
              ))}
              
              <div className="p-4 bg-slate-50/50 flex flex-col sm:flex-row gap-2">
                <input type="text" placeholder="Custom role (e.g. Lead)" value={newRole.name} onChange={e => setNewRole({...newRole, name: e.target.value})} className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
                <select value={newRole.level} onChange={e => setNewRole({...newRole, level: e.target.value})} className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 bg-white">
                  <option value="0">Level 0 (Owner/Chairman)</option>
                  <option value="1">Level 1 (Admin/Dir)</option>
                  <option value="2">Level 2 (Manager)</option>
                  <option value="3">Level 3 (Staff)</option>
                </select>
                <button onClick={addRole} className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">Add</button>
              </div>
            </div>
            {validationErrors.roles && <p className="text-sm text-rose-500">{validationErrors.roles}</p>}

            <div className="flex justify-between pt-6">
              <button onClick={() => setStep(2)} className="text-slate-500 hover:text-slate-800 px-4 py-2.5 font-medium flex items-center gap-2 transition-colors"><ArrowLeft size={18} /> Back</button>
              <button onClick={handleNext} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 flex items-center gap-2 transition-all">Next <ArrowRight size={18} /></button>
            </div>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Your Account Details</h2>
              <p className="text-slate-500 text-sm mt-1">This will be the master Level 0 Owner account.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-x-4">
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name <span className="text-rose-500">*</span></label>
                <input type="text" value={admin.displayName} onChange={e => setAdmin({...admin, displayName: e.target.value})} className={`w-full rounded-xl border ${validationErrors.displayName ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-indigo-500'} bg-white px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20`} />
                {validationErrors.displayName && <p className="text-xs text-rose-500 mt-1">{validationErrors.displayName}</p>}
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">Designation <span className="text-rose-500">*</span></label>
                <input type="text" value={admin.designation} onChange={e => setAdmin({...admin, designation: e.target.value})} placeholder="CEO / Founder" className={`w-full rounded-xl border ${validationErrors.designation ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-indigo-500'} bg-white px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20`} />
                {validationErrors.designation && <p className="text-xs text-rose-500 mt-1">{validationErrors.designation}</p>}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-x-4">
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">Mobile Number <span className="text-rose-500">*</span></label>
                <input type="text" value={admin.phone} onChange={e => setAdmin({...admin, phone: e.target.value})} placeholder="9876543210" maxLength={10} className={`w-full rounded-xl border ${validationErrors.phone ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-indigo-500'} bg-white px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20`} />
                {validationErrors.phone && <p className="text-xs text-rose-500 mt-1">{validationErrors.phone}</p>}
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">Email <span className="text-rose-500">*</span></label>
                <input type="email" value={admin.email} onChange={e => setAdmin({...admin, email: e.target.value})} className={`w-full rounded-xl border ${validationErrors.email ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-indigo-500'} bg-white px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20`} />
                {validationErrors.email && <p className="text-xs text-rose-500 mt-1">{validationErrors.email}</p>}
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">Password <span className="text-rose-500">*</span></label>
              <input type="password" value={admin.password} onChange={e => setAdmin({...admin, password: e.target.value})} className={`w-full rounded-xl border ${validationErrors.password ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-indigo-500'} bg-white px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20`} />
              {validationErrors.password && <p className="text-xs text-rose-500 mt-1">{validationErrors.password}</p>}
            </div>

            <div className="flex justify-between pt-6">
              <button onClick={() => setStep(3)} className="text-slate-500 hover:text-slate-800 px-4 py-2.5 font-medium flex items-center gap-2 transition-colors"><ArrowLeft size={18} /> Back</button>
              <button onClick={handleNext} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 flex items-center gap-2 transition-all">Review <ArrowRight size={18} /></button>
            </div>
          </motion.div>
        )}

        {step === 5 && (
          <motion.div key="step5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Review & Confirm</h2>
              <p className="text-slate-500 text-sm mt-1">Please verify all details before finalizing company registration.</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 font-bold text-slate-700 text-sm flex items-center gap-2"><Building2 size={16}/> Company Details</div>
              <div className="grid grid-cols-2 gap-4 p-5 text-sm">
                <div><span className="block text-slate-400 mb-0.5 text-xs uppercase tracking-wide">Display Name</span> <span className="font-medium text-slate-800">{company.name}</span></div>
                <div><span className="block text-slate-400 mb-0.5 text-xs uppercase tracking-wide">Industry</span> <span className="font-medium text-slate-800">{company.industry}</span></div>
                <div><span className="block text-slate-400 mb-0.5 text-xs uppercase tracking-wide">PAN</span> <span className="font-medium text-slate-800">{company.pan}</span></div>
                <div><span className="block text-slate-400 mb-0.5 text-xs uppercase tracking-wide">Location</span> <span className="font-medium text-slate-800">{company.city}, {company.state}</span></div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 font-bold text-slate-700 text-sm flex items-center gap-2"><Briefcase size={16}/> Departments ({departments.length})</div>
                <div className="p-5 flex flex-wrap gap-1.5">
                  {departments.map(d => <span key={d} className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-semibold">{d}</span>)}
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 font-bold text-slate-700 text-sm flex items-center gap-2"><Tag size={16}/> Roles ({roles.length})</div>
                <div className="p-5 flex flex-col gap-1.5">
                  {roles.map(r => <span key={r.name} className="text-sm font-medium text-slate-700"><span className="text-slate-400 mr-2">L{r.level}</span>{r.name}</span>)}
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 font-bold text-slate-700 text-sm flex items-center gap-2"><User size={16}/> Founder Profile</div>
              <div className="grid grid-cols-2 gap-4 p-5 text-sm">
                <div><span className="block text-slate-400 mb-0.5 text-xs uppercase tracking-wide">Name</span> <span className="font-medium text-slate-800">{admin.displayName}</span></div>
                <div><span className="block text-slate-400 mb-0.5 text-xs uppercase tracking-wide">Designation</span> <span className="font-medium text-slate-800">{admin.designation}</span></div>
                <div><span className="block text-slate-400 mb-0.5 text-xs uppercase tracking-wide">Email</span> <span className="font-medium text-slate-800">{admin.email}</span></div>
                <div><span className="block text-slate-400 mb-0.5 text-xs uppercase tracking-wide">Phone</span> <span className="font-medium text-slate-800">{admin.phone}</span></div>
              </div>
            </div>

            <div className="flex justify-between pt-6 border-t border-slate-100">
              <button onClick={() => setStep(4)} disabled={loading} className="text-slate-500 hover:text-slate-800 px-4 py-2.5 font-medium flex items-center gap-2 transition-colors disabled:opacity-50"><ArrowLeft size={18} /> Back</button>
              <button onClick={handleSubmit} disabled={loading} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 flex items-center gap-2 transition-all disabled:opacity-70 disabled:cursor-wait shadow-lg shadow-indigo-200">
                {loading ? <Loader2 className="animate-spin" size={18} /> : 'Send OTP'}
              </button>
            </div>
          </motion.div>
        )}

        {step === 6 && (
          <motion.div key="step6" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6 text-center">
            <div>
              <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock size={32} />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Verify Your Email</h2>
              <p className="text-slate-500 text-sm mt-2 max-w-sm mx-auto">We've sent a 6-digit OTP to <strong>{admin.email}</strong>. Enter it below to complete registration.</p>
            </div>
            <div className="max-w-xs mx-auto">
              <input type="text" maxLength={6} placeholder="Enter 6-digit OTP" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))} className="w-full text-center text-2xl tracking-[0.5em] font-mono rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" />
            </div>
            <div className="flex justify-center pt-4">
              <button onClick={handleVerifyOtp} disabled={loading || otp.length !== 6} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 flex items-center gap-2 transition-all disabled:opacity-70 disabled:cursor-wait shadow-lg shadow-indigo-200 w-full max-w-xs justify-center">
                {loading ? <Loader2 className="animate-spin" size={18} /> : 'Verify & Register'}
              </button>
            </div>
          </motion.div>
        )}

        {step === 7 && (
          <motion.div key="step7" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-10">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={40} />
            </div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight mb-3">Registration Successful!</h2>
            <p className="text-slate-500 text-lg mb-8 max-w-sm mx-auto">Your company workspace has been created. Redirecting you to the HR dashboard...</p>
            <div className="flex justify-center">
              <Loader2 className="animate-spin text-indigo-500" size={32} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
