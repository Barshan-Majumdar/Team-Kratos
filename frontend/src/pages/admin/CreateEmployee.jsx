import React, { useState, useEffect, useRef } from 'react';
import { UserPlus, Copy, Check, Shield, ChevronDown, AlertCircle, Info, X } from 'lucide-react';
import { API_BASE } from '../../lib/api';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { motion, AnimatePresence } from 'framer-motion';

// System Role → numeric level mapping (mirrors backend)
const SYSTEM_ROLE_TO_LEVEL = { CEO: 0, SuperAdmin: 0, Admin: 1, Manager: 2, Employee: 3 };

// Get the level badge color based on role level (Premium Palette)
const getLevelColor = (level) => {
  if (level === 0) return 'bg-[#F0F3F9] text-[#1F2B4D] border-[#CBD5E1]'; // Exec Navy
  if (level === 1) return 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]'; // Emerald
  if (level === 2) return 'bg-[#FDF8F3] text-[#8C5722] border-[#EEDCCE]'; // Attention/Amber
  return 'bg-[#F4F1EA] text-[#6B655C] border-[#EAE7E0]'; // Standard Slate
};

const CreateEmployee = () => {
  const [formData, setFormData] = useState(() => {
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
    return {
      email: '',
      displayName: '',
      customRole: '',
      department: '',
      phone: '',
      jobPosition: '',
      gender: 'Male',
      location: '',
      entityId: '',
      officeId: storedUser.officeId || '',
      workingDaysPerWeek: 5,
      breakTimeHrs: 1.0
    };
  });

  const [legalEntities, setLegalEntities] = useState([]);
  const [tenantRoles, setTenantRoles] = useState([]);
  const [assignableRoles, setAssignableRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [rolesError, setRolesError] = useState('');
  const [departments, setDepartments] = useState([]);
  const [offices, setOffices] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState(null);
  const [copied, setCopied] = useState(false);

  const containerRef = useRef(null);

  // GSAP Choreographed Intro Sequence
  useGSAP(() => {
    // Only run intro if we have loaded the roles to prevent jank
    if (rolesLoading) return;

    const tl = gsap.timeline({ defaults: { ease: "power4.out" } });

    tl.from('.intro-header', {
      y: -30,
      opacity: 0,
      duration: 0.8,
    })
    .from('.intro-form-container', {
      scale: 0.95,
      opacity: 0,
      duration: 0.7,
      clearProps: "all"
    }, "-=0.5")
    .from('.intro-form-group', {
      y: 20,
      opacity: 0,
      duration: 0.5,
      stagger: 0.1,
      clearProps: "all"
    }, "-=0.4")
    .from('.intro-hierarchy', {
      y: 20,
      opacity: 0,
      duration: 0.5,
      clearProps: "all"
    }, "-=0.2");

  }, { dependencies: [rolesLoading], scope: containerRef });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const headers = { 'Authorization': `Bearer ${token}` };

    Promise.all([
      fetch(`${API_BASE}/api/tenant-settings/legal-entities`, { headers }).then(r => r.ok ? r.json() : []),
      fetch(`${API_BASE}/api/tenant-settings/roles`, { headers }).then(r => r.ok ? r.json() : null),
      fetch(`${API_BASE}/api/console/offices`, { headers }).then(r => r.ok ? r.json() : [])
    ]).then(([entities, rolesData, officesData]) => {
      setLegalEntities(entities || []);
      setOffices(officesData || []);

      if (!rolesData || !Array.isArray(rolesData.customRoles)) {
        setRolesError('No role hierarchy found. Please ask the company owner to configure roles in the registration.');
        setRolesLoading(false);
        return;
      }

      const allRoles = rolesData.customRoles;
      setTenantRoles(allRoles);
      setDepartments(rolesData.departments || []);

      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      const inviterLevel = storedUser.roleDefinition?.level ?? 99;

      const allowed = allRoles.filter(r => r.level > inviterLevel);

      setAssignableRoles(allowed);

      if (allowed.length > 0) {
        const sorted = [...allowed].sort((a, b) => b.level - a.level);
        setFormData(prev => ({ ...prev, customRole: sorted[0].name }));
      }

      setRolesLoading(false);
    }).catch(err => {
      console.error('Failed to load tenant configuration:', err);
      setRolesError('Failed to load role configuration. Please refresh the page.');
      setRolesLoading(false);
    });
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessData(null);
    setCopied(false);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create employee');
      }

      setSuccessData(data);
      setFormData(prev => ({ 
        ...prev,
        email: '', displayName: '', department: '', 
        phone: '', jobPosition: '', gender: 'Male', location: '', entityId: '', officeId: '',
        workingDaysPerWeek: 5, breakTimeHrs: 1.0 
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    const textToCopy = `Email: ${successData.user.email}\nEmployee ID: ${successData.user.employeeId}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const selectedRoleDef = tenantRoles.find(r => r.name === formData.customRole);

  const alertVariants = {
    hidden: { opacity: 0, y: -20, scale: 0.95, height: 0, marginBottom: 0 },
    visible: { opacity: 1, y: 0, scale: 1, height: 'auto', marginBottom: 24, transition: { type: 'spring', stiffness: 260, damping: 20 } },
    exit: { opacity: 0, scale: 0.95, height: 0, marginBottom: 0, transition: { duration: 0.2 } }
  };

  return (
    <div ref={containerRef} className="p-4 md:p-8 lg:p-12 min-h-screen bg-[#FAF9F6]">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="intro-header mb-8">
          <h1 className="text-[28px] font-bold text-[#1D1B16] tracking-tight">Add New Employee</h1>
          <p className="text-[#6B655C] text-[13.5px] mt-1 font-medium">Create an account for a new team member. Roles are defined by your company's organizational structure.</p>
        </div>

        {/* Dynamic Alerts */}
        <AnimatePresence mode="popLayout">
          {rolesLoading && (
            <motion.div variants={alertVariants} initial="hidden" animate="visible" exit="exit" className="p-5 bg-white rounded-2xl border border-[#EAE7E0] shadow-sm flex items-center gap-4">
              <div className="w-6 h-6 border-2 border-[#1F2B4D] border-t-transparent rounded-full animate-spin shrink-0" />
              <span className="text-[13.5px] font-bold text-[#1D1B16]">Loading your company's role hierarchy...</span>
            </motion.div>
          )}

          {error && (
            <motion.div variants={alertVariants} initial="hidden" animate="visible" exit="exit" className="p-5 bg-[#FEF2F2] rounded-2xl border border-[#FECACA] flex items-start gap-3 shadow-sm relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#EF4444]" />
              <AlertCircle size={20} className="shrink-0 mt-0.5 text-[#B91C1C]" />
              <div className="flex-1">
                <span className="font-bold text-[#B91C1C] text-[14px]">Creation Failed</span>
                <p className="text-[13px] text-[#B91C1C]/80 font-medium mt-0.5">{error}</p>
              </div>
              <button onClick={() => setError('')} className="p-1 text-[#B91C1C]/60 hover:text-[#B91C1C]"><X size={16}/></button>
            </motion.div>
          )}

          {successData && (
            <motion.div variants={alertVariants} initial="hidden" animate="visible" exit="exit" className="p-6 bg-white rounded-2xl border border-[#A7F3D0] shadow-md flex items-start gap-4 relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#10B981]" />
              <div className="bg-[#ECFDF5] p-2.5 rounded-full text-[#065F46] shrink-0 border border-[#A7F3D0]">
                <Check size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-[#065F46] font-extrabold text-[18px] tracking-tight">Employee Created Successfully!</h3>
                <p className="text-[#065F46]/80 text-[13.5px] mt-1 font-semibold">
                  Login credentials have been securely sent to the employee's email.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <div className="text-[13px] font-mono font-bold bg-[#FAF9F6] border border-[#EAE7E0] px-4 py-2 rounded-xl text-[#1D1B16] flex items-center gap-2">
                    <span className="text-[#9A948A]">Email:</span> {successData.user?.email}
                  </div>
                  <div className="text-[13px] font-mono font-bold bg-[#FAF9F6] border border-[#EAE7E0] px-4 py-2 rounded-xl text-[#1D1B16] flex items-center gap-2">
                    <span className="text-[#9A948A]">ID:</span> {successData.user?.employeeId}
                  </div>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-[#1F2B4D] hover:text-white bg-[#F0F3F9] hover:bg-[#1F2B4D] border border-[#CBD5E1] px-4 py-2 rounded-xl transition-all active:scale-95 shadow-sm"
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? 'Copied!' : 'Copy Info'}
                  </button>
                </div>
              </div>
              <button onClick={() => setSuccessData(null)} className="p-1 text-[#6B655C] hover:text-[#1D1B16]"><X size={20}/></button>
            </motion.div>
          )}

          {rolesError && !rolesLoading && (
            <motion.div variants={alertVariants} initial="hidden" animate="visible" exit="exit" className="p-5 bg-[#FDF8F3] rounded-2xl border border-[#EEDCCE] flex items-start gap-3 shadow-sm relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#F59E0B]" />
              <AlertCircle size={20} className="shrink-0 mt-0.5 text-[#8C5722]" />
              <div>
                <p className="text-[14px] font-bold text-[#8C5722]">Role Configuration Missing</p>
                <p className="text-[13px] font-medium text-[#8C5722]/80 mt-0.5">{rolesError}</p>
              </div>
            </motion.div>
          )}

          {offices.length === 0 && !rolesLoading && (
            <motion.div variants={alertVariants} initial="hidden" animate="visible" exit="exit" className="p-5 bg-[#FEF2F2] rounded-2xl border border-[#FECACA] flex items-start gap-3 shadow-sm relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#EF4444]" />
              <AlertCircle size={20} className="shrink-0 mt-0.5 text-[#B91C1C]" />
              <div>
                <p className="text-[14px] font-bold text-[#B91C1C]">No Office Branches Found</p>
                <p className="text-[13px] font-medium text-[#B91C1C]/80 mt-0.5">
                  You must create at least 1 Office Branch in Organization Settings before you can add employees.
                </p>
              </div>
            </motion.div>
          )}

          {!rolesLoading && !rolesError && assignableRoles.length > 0 && (
            <motion.div variants={alertVariants} initial="hidden" animate="visible" exit="exit" className="p-5 bg-white rounded-2xl border border-[#EAE7E0] flex items-start gap-3 shadow-sm">
              <Info size={20} className="shrink-0 mt-0.5 text-[#1F2B4D]" />
              <div>
                <p className="text-[14px] font-bold text-[#1D1B16]">Company-Defined Roles</p>
                <p className="text-[13px] text-[#6B655C] font-medium mt-1">
                  You can assign the following roles as configured by your company owner: <br/>
                  <span className="font-bold text-[#1F2B4D] inline-block mt-1">
                    {assignableRoles.map(r => r.name).join(', ')}
                  </span>
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Form Container (Doppelrand) */}
        <div className="intro-form-container double-bezel-outer bg-[#F4F1EA] p-1.5 w-full">
          <div className="double-bezel-inner bg-white p-6 md:p-10">
            
            <form onSubmit={handleSubmit} className="flex flex-col gap-10">
              
              {/* Primary Details Fieldset */}
              <div className="intro-form-group">
                <h3 className="text-[11px] font-bold text-[#9A948A] uppercase tracking-wider mb-5 border-b border-[#F4F1EA] pb-3">Primary Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[11px] font-bold text-[#6B655C] uppercase tracking-wider mb-2">Full Name</label>
                    <input 
                      type="text" name="displayName" value={formData.displayName} onChange={handleChange}
                      placeholder="John Doe" required
                      className="w-full p-4 bg-[#FAF9F6] border border-[#EAE7E0] rounded-xl focus:ring-2 focus:ring-[#1F2B4D] outline-none text-[#1D1B16] font-bold transition-all placeholder:text-[#9A948A] placeholder:font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#6B655C] uppercase tracking-wider mb-2">Email Address</label>
                    <input 
                      type="email" name="email" value={formData.email} onChange={handleChange}
                      placeholder="john.doe@company.com" required
                      className="w-full p-4 bg-[#FAF9F6] border border-[#EAE7E0] rounded-xl focus:ring-2 focus:ring-[#1F2B4D] outline-none text-[#1D1B16] font-bold transition-all placeholder:text-[#9A948A] placeholder:font-medium"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-bold text-[#6B655C] uppercase tracking-wider mb-2">Phone Number</label>
                    <input 
                      type="tel" name="phone" value={formData.phone} onChange={handleChange}
                      placeholder="+1 (555) 000-0000" required
                      className="w-full p-4 bg-[#FAF9F6] border border-[#EAE7E0] rounded-xl focus:ring-2 focus:ring-[#1F2B4D] outline-none text-[#1D1B16] font-bold transition-all placeholder:text-[#9A948A] placeholder:font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Employment Details Fieldset */}
              <div className="intro-form-group">
                <h3 className="text-[11px] font-bold text-[#9A948A] uppercase tracking-wider mb-5 border-b border-[#F4F1EA] pb-3">Employment Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[11px] font-bold text-[#6B655C] uppercase tracking-wider mb-2">Department</label>
                    {departments.length > 0 ? (
                      <select
                        name="department" value={formData.department} onChange={handleChange}
                        className="w-full p-4 bg-[#FAF9F6] border border-[#EAE7E0] rounded-xl focus:ring-2 focus:ring-[#1F2B4D] outline-none text-[#1D1B16] font-bold transition-all appearance-none pr-10 bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2224%22%20height%3D%2224%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20stroke%3D%22%236B655C%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:16px_16px] bg-[right_16px_center] bg-no-repeat"
                      >
                        <option value="" disabled>Select Department...</option>
                        {departments.map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    ) : (
                      <input 
                        type="text" name="department" value={formData.department} onChange={handleChange}
                        placeholder="Engineering" required
                        className="w-full p-4 bg-[#FAF9F6] border border-[#EAE7E0] rounded-xl focus:ring-2 focus:ring-[#1F2B4D] outline-none text-[#1D1B16] font-bold transition-all placeholder:text-[#9A948A] placeholder:font-medium"
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#6B655C] uppercase tracking-wider mb-2">Job Position / Title</label>
                    <input 
                      type="text" name="jobPosition" value={formData.jobPosition} onChange={handleChange}
                      placeholder="Senior Developer" required
                      className="w-full p-4 bg-[#FAF9F6] border border-[#EAE7E0] rounded-xl focus:ring-2 focus:ring-[#1F2B4D] outline-none text-[#1D1B16] font-bold transition-all placeholder:text-[#9A948A] placeholder:font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#6B655C] uppercase tracking-wider mb-2">Work Location</label>
                    <input 
                      type="text" name="location" value={formData.location} onChange={handleChange}
                      placeholder="Mumbai HQ / Remote" required
                      className="w-full p-4 bg-[#FAF9F6] border border-[#EAE7E0] rounded-xl focus:ring-2 focus:ring-[#1F2B4D] outline-none text-[#1D1B16] font-bold transition-all placeholder:text-[#9A948A] placeholder:font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#6B655C] uppercase tracking-wider mb-2">Company / Subsidiary</label>
                    <select 
                      name="entityId" value={formData.entityId} onChange={handleChange}
                      className="w-full p-4 bg-[#FAF9F6] border border-[#EAE7E0] rounded-xl focus:ring-2 focus:ring-[#1F2B4D] outline-none text-[#1D1B16] font-bold transition-all appearance-none pr-10 bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2224%22%20height%3D%2224%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20stroke%3D%22%236B655C%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:16px_16px] bg-[right_16px_center] bg-no-repeat"
                    >
                      <option value="">Unassigned (Default)</option>
                      {legalEntities.map(entity => (
                        <option key={entity.id} value={entity.id}>{entity.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-bold text-[#6B655C] uppercase tracking-wider mb-2">Office / Branch</label>
                    <select 
                      name="officeId" value={formData.officeId} onChange={handleChange} required
                      className="w-full p-4 bg-[#FAF9F6] border border-[#EAE7E0] rounded-xl focus:ring-2 focus:ring-[#1F2B4D] outline-none text-[#1D1B16] font-bold transition-all appearance-none pr-10 bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2224%22%20height%3D%2224%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20stroke%3D%22%236B655C%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:16px_16px] bg-[right_16px_center] bg-no-repeat"
                    >
                      <option value="" disabled>Select a branch...</option>
                      {offices.map(office => (
                        <option key={office.id} value={office.id}>{office.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Specs Fieldset */}
              <div className="intro-form-group">
                <h3 className="text-[11px] font-bold text-[#9A948A] uppercase tracking-wider mb-5 border-b border-[#F4F1EA] pb-3">Schedules & Demographics</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-[11px] font-bold text-[#6B655C] uppercase tracking-wider mb-2">Working Days / Week</label>
                    <input 
                      type="number" min="1" max="7" name="workingDaysPerWeek" value={formData.workingDaysPerWeek} onChange={handleChange}
                      required
                      className="w-full p-4 bg-[#FAF9F6] border border-[#EAE7E0] rounded-xl focus:ring-2 focus:ring-[#1F2B4D] outline-none text-[#1D1B16] font-bold transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#6B655C] uppercase tracking-wider mb-2">Daily Break Time (Hrs)</label>
                    <input 
                      type="number" step="0.5" min="0" max="4" name="breakTimeHrs" value={formData.breakTimeHrs} onChange={handleChange}
                      required
                      className="w-full p-4 bg-[#FAF9F6] border border-[#EAE7E0] rounded-xl focus:ring-2 focus:ring-[#1F2B4D] outline-none text-[#1D1B16] font-bold transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#6B655C] uppercase tracking-wider mb-2">Gender</label>
                    <select 
                      name="gender" value={formData.gender} onChange={handleChange}
                      className="w-full p-4 bg-[#FAF9F6] border border-[#EAE7E0] rounded-xl focus:ring-2 focus:ring-[#1F2B4D] outline-none text-[#1D1B16] font-bold transition-all appearance-none pr-10 bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2224%22%20height%3D%2224%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20stroke%3D%22%236B655C%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:16px_16px] bg-[right_16px_center] bg-no-repeat"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Role Assignment Fieldset */}
              <div className="intro-form-group">
                <h3 className="text-[11px] font-bold text-[#9A948A] uppercase tracking-wider mb-5 border-b border-[#F4F1EA] pb-3 flex items-center gap-1.5">
                  <Shield size={14} className="text-[#1F2B4D]" /> Organizational Role & Access
                </h3>
                
                {rolesLoading ? (
                  <div className="h-14 rounded-xl border border-[#EAE7E0] bg-[#FAF9F6] animate-pulse" />
                ) : assignableRoles.length === 0 ? (
                  <div className="h-14 rounded-xl border border-[#F59E0B] bg-[#FDF8F3] px-4 flex items-center text-[13px] font-bold text-[#8C5722]">
                    {rolesError || 'No assignable roles available for your permission level.'}
                  </div>
                ) : (
                  <div className="relative">
                    <select 
                      name="customRole" value={formData.customRole} onChange={handleChange}
                      required
                      className="w-full p-4 bg-[#FAF9F6] border border-[#EAE7E0] rounded-xl focus:ring-2 focus:ring-[#1F2B4D] outline-none text-[#1D1B16] font-bold transition-all appearance-none pr-10 bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2224%22%20height%3D%2224%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20stroke%3D%22%236B655C%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:16px_16px] bg-[right_16px_center] bg-no-repeat"
                    >
                      <option value="" disabled>Select a role...</option>
                      {assignableRoles.map(role => (
                        <option key={role.name} value={role.name}>
                          {role.name} — Level {role.level}
                        </option>
                      ))}
                    </select>

                    <AnimatePresence>
                      {selectedRoleDef && (
                        <motion.div 
                          initial={{ opacity: 0, y: -10, height: 0 }}
                          animate={{ opacity: 1, y: 0, height: 'auto' }}
                          exit={{ opacity: 0, y: -10, height: 0 }}
                          className="mt-3 overflow-hidden"
                        >
                          <div className={`px-4 py-3 rounded-xl border flex items-center gap-3 ${getLevelColor(selectedRoleDef.level)} shadow-sm`}>
                            <span className="font-extrabold text-[15px]">L{selectedRoleDef.level}</span>
                            <span className="font-bold text-[14px]">{selectedRoleDef.name}</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-40 mx-1"></span>
                            <span className="opacity-80 text-[13px] font-medium">{selectedRoleDef.description}</span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
              
              <div className="pt-8 border-t border-[#F4F1EA] flex justify-end">
                <button
                  type="submit"
                  disabled={loading || rolesLoading || assignableRoles.length === 0 || offices.length === 0 || !formData.officeId}
                  className="relative overflow-hidden group flex items-center justify-center gap-2 bg-[#1F2B4D] border border-[#141C33] text-white px-8 py-4 rounded-xl font-bold shadow-md transition-all duration-300 active:scale-95 whitespace-nowrap disabled:opacity-50 disabled:active:scale-100"
                >
                  <span className="absolute inset-0 bg-[#0F172A] translate-y-[100%] group-hover:translate-y-0 transition-transform duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) z-0" />
                  <UserPlus size={18} className="relative z-10 text-white" />
                  <span className="relative z-10 text-white">{loading ? 'Creating Account...' : 'Create Employee Account'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>

        {/* Tenant Role Hierarchy Viewer */}
        <div className="intro-hierarchy mt-8">
          {!rolesLoading && tenantRoles.length > 0 && (
            <div className="bg-white p-6 rounded-[24px] border border-[#EAE7E0] shadow-sm">
              <h3 className="text-[13.5px] font-bold text-[#1D1B16] mb-5 flex items-center gap-2 tracking-tight">
                <Shield size={18} className="text-[#1F2B4D]" />
                Your Company's Role Hierarchy
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#9A948A] ml-2">(Set by Owner)</span>
              </h3>
              <div className="flex flex-wrap gap-2.5">
                {[...tenantRoles].sort((a, b) => a.level - b.level).map(role => (
                  <div
                    key={role.name}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-[13px] font-medium shadow-sm transition-transform hover:-translate-y-[1px] ${getLevelColor(role.level)}`}
                  >
                    <span className="font-extrabold text-[14px]">L{role.level}</span>
                    <span className="font-bold">{role.name}</span>
                    {role.locked && <span className="opacity-50 text-[11px] ml-1" title="System Role (Locked)">🔒</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default CreateEmployee;
