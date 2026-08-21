import React, { useState, useEffect, useRef } from 'react';
import { Mail, Plus, Trash2, Send, ArrowRight, Building2, Briefcase, MapPin, ShieldCheck } from 'lucide-react';
import { toast } from 'react-hot-toast';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { motion, AnimatePresence } from 'framer-motion';

const InviteEmployee = () => {
  const [emails, setEmails] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [branches, setBranches] = useState([]);
  const [roles, setRoles] = useState([]);
  
  const [newEmail, setNewEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [branch, setBranch] = useState('');
  const [roleDefinitionId, setRoleDefinitionId] = useState('');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const containerRef = useRef(null);

  // GSAP Intro Choreography
  useGSAP(() => {
    const container = containerRef.current;
    if (!container) return;

    const cinematicHeader = container.querySelector('.cinematic-header');
    const cinematicInput = container.querySelector('.cinematic-input');
    const cinematicListHeader = container.querySelector('.cinematic-list-header');
    const floatingBoxes = container.querySelectorAll('.floating-box');

    const tl = gsap.timeline({ defaults: { ease: "power4.out" } });

    if (cinematicHeader) {
      tl.fromTo(cinematicHeader, 
        { scale: 0.95, opacity: 0, filter: "blur(8px)", y: 20 },
        { scale: 1, opacity: 1, filter: "blur(0px)", y: 0, duration: 0.8 }
      );
    }
    if (cinematicInput) {
      tl.fromTo(cinematicInput, 
        { scale: 0.98, opacity: 0, y: 15 },
        { scale: 1, opacity: 1, y: 0, duration: 0.7 },
        "-=0.6"
      );
    }
    if (cinematicListHeader) {
      tl.fromTo(cinematicListHeader,
        { opacity: 0 },
        { opacity: 1, duration: 0.5 },
        "-=0.4"
      );
    }

    if (floatingBoxes.length > 0) {
      gsap.to(floatingBoxes, {
        y: "-=3",
        duration: 4,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
        delay: 1.5,
        stagger: 0.5
      });
    }

  }, { scope: containerRef });

  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5000";

  const fetchEmails = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiBase}/api/users/invited-emails`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setEmails(data || []);
      }
    } catch (err) {
      console.error('Fetch invited emails error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanyMetadata = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiBase}/api/tenant-settings/roles`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        
        // 1. Roles
        const roleList = data.customRoles || [];
        setRoles(roleList);
        if (roleList.length > 0) {
          const empRole = roleList.find(r => r.name === 'Employee' || r.level > 1) || roleList[0];
          setRoleDefinitionId(empRole.id);
        }

        // 2. Departments (Strictly Company Defined)
        const deptList = data.departments || [];
        setDepartments(deptList);
        if (deptList.length > 0) {
          setDepartment(deptList[0]);
        }

        // 3. Branches (Strictly Company Defined)
        const branchList = data.branches || [];
        setBranches(branchList);
        if (branchList.length > 0) {
          setBranch(branchList[0]);
        }
      }
    } catch (err) {
      console.error('Fetch company metadata error:', err);
    }
  };

  useEffect(() => {
    fetchEmails();
    fetchCompanyMetadata();
  }, []);

  const handleInvite = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!newEmail || !newEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!department) {
      setError('Please select a department.');
      return;
    }
    if (!branch) {
      setError('Please select a branch.');
      return;
    }
    if (!roleDefinitionId) {
      setError('Please select a role.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiBase}/api/users/invited-emails`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email: newEmail,
          department,
          branch,
          roleDefinitionId
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      toast.success('Invitation sent successfully!');
      setNewEmail('');
      fetchEmails();
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    }
  };

  const handleRemove = async (emailToRemove) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiBase}/api/users/invited-emails/${encodeURIComponent(emailToRemove)}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      toast.success('Invitation revoked');
      fetchEmails();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const listVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 10 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 25 } },
    exit: { opacity: 0, scale: 0.9, transition: { duration: 0.2 } }
  };

  return (
    <div ref={containerRef} className="w-full min-h-full flex flex-col p-3 sm:p-5 md:p-6 bg-[#FAF9F6] font-sans">
      
      <div className="w-full max-w-4xl mx-auto flex flex-col flex-1">
        
        {/* Header Section */}
        <div className="cinematic-header mb-6 sm:mb-8 text-center flex flex-col items-center max-w-xl mx-auto">
          <div className="floating-box w-12 sm:w-16 h-12 sm:h-16 bg-white ring-1 ring-black/5 shadow-2xs rounded-2xl sm:rounded-[20px] flex items-center justify-center text-[#1D1B16] mb-4 sm:mb-6 shrink-0">
            <Mail className="w-6 h-6 sm:w-7 sm:h-7" strokeWidth={2} />
          </div>
          <h2 className="text-xl sm:text-3xl md:text-4xl font-extrabold text-[#1D1B16] tracking-tight leading-tight mb-2 sm:mb-3">
            Invite Access
          </h2>
          <p className="text-xs sm:text-sm md:text-[15px] text-[#6B655C] font-medium max-w-lg mx-auto leading-relaxed px-2">
            Provision workspace access using your organization's official Departments, Branches, and Roles.
          </p>
        </div>

        {/* Premium Input Console */}
        <div className="cinematic-input floating-box bg-white ring-1 ring-black/5 shadow-2xs rounded-2xl sm:rounded-[24px] p-4 sm:p-6 mb-6 sm:mb-10 w-full">
          <form onSubmit={handleInvite} className="flex flex-col gap-4">
            
            {/* Top Row: Email Input */}
            <div className="relative w-full">
              <label className="block text-[11px] font-bold text-[#6B655C] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Mail size={13} />
                <span>Employee Email Address</span>
              </label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="employee@company.com"
                className="w-full h-11 sm:h-13 bg-[#FAF9F6] border border-[#EAE7E0] rounded-xl sm:rounded-[14px] px-3.5 sm:px-4 text-xs sm:text-[14px] font-semibold text-[#1D1B16] tracking-tight focus:ring-2 focus:ring-[#1D1B16] focus:border-transparent outline-none transition-all placeholder:text-[#9A948A] placeholder:font-medium"
              />
            </div>

            {/* Middle Row: Strictly Company Defined Parameters (Department, Branch, Role) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              
              {/* Company Department Selector */}
              <div>
                <label className="block text-[11px] font-bold text-[#6B655C] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Building2 size={13} />
                  <span>Department</span>
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full h-10 sm:h-11 bg-[#FAF9F6] border border-[#EAE7E0] rounded-xl px-3 text-xs sm:text-[13px] font-semibold text-[#1D1B16] outline-none focus:ring-2 focus:ring-[#1D1B16] transition-all"
                >
                  {departments.length === 0 ? (
                    <option value="">Loading departments...</option>
                  ) : (
                    departments.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))
                  )}
                </select>
              </div>

              {/* Company Branch Selector */}
              <div>
                <label className="block text-[11px] font-bold text-[#6B655C] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <MapPin size={13} />
                  <span>Branch</span>
                </label>
                <select
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="w-full h-10 sm:h-11 bg-[#FAF9F6] border border-[#EAE7E0] rounded-xl px-3 text-xs sm:text-[13px] font-semibold text-[#1D1B16] outline-none focus:ring-2 focus:ring-[#1D1B16] transition-all"
                >
                  {branches.length === 0 ? (
                    <option value="">Loading branches...</option>
                  ) : (
                    branches.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))
                  )}
                </select>
              </div>

              {/* Company Role Selector */}
              <div>
                <label className="block text-[11px] font-bold text-[#6B655C] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <ShieldCheck size={13} />
                  <span>Assigned Role</span>
                </label>
                <select
                  value={roleDefinitionId}
                  onChange={(e) => setRoleDefinitionId(e.target.value)}
                  className="w-full h-10 sm:h-11 bg-[#FAF9F6] border border-[#EAE7E0] rounded-xl px-3 text-xs sm:text-[13px] font-semibold text-[#1D1B16] outline-none focus:ring-2 focus:ring-[#1D1B16] transition-all"
                >
                  {roles.length === 0 ? (
                    <option value="">Loading roles...</option>
                  ) : (
                    roles.map(r => (
                      <option key={r.id} value={r.id}>{r.name} (Level {r.level ?? 3})</option>
                    ))
                  )}
                </select>
              </div>

            </div>

            {error && (
              <motion.p 
                initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                className="text-[#B91C1C] text-xs font-bold px-1"
              >
                {error}
              </motion.p>
            )}

            {/* Submit Button */}
            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="group inline-flex items-center justify-center bg-[#1D1B16] text-white pl-5 pr-2 h-11 sm:h-12 rounded-xl text-xs sm:text-[14px] font-bold shadow-md hover:shadow-lg hover:shadow-[#1D1B16]/20 active:scale-[0.97] transition-all duration-300 w-full sm:w-auto shrink-0 whitespace-nowrap"
              >
                <span className="mr-3">Dispatch Invite</span>
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center group-hover:bg-white group-hover:text-[#1D1B16] transition-colors duration-300 shrink-0">
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-[2px] transition-transform duration-300" strokeWidth={2.5} />
                </div>
              </button>
            </div>

          </form>
        </div>

        {/* Pending Invitations Floating Grid */}
        <div className="cinematic-list-header mb-3 sm:mb-4 flex items-center justify-between px-1 sm:px-2 w-full">
          <h3 className="font-extrabold text-[#1D1B16] text-sm sm:text-[18px] tracking-tight">Pending Invitations</h3>
          <span className="text-[10px] sm:text-[12px] font-bold text-[#9A948A] bg-white ring-1 ring-black/5 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full shadow-2xs">
            {emails.length} Pending
          </span>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center">
            <span className="text-[10px] sm:text-[11px] font-bold text-[#9A948A] tracking-[0.15em] uppercase">Loading...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:gap-4 w-full">
            <AnimatePresence mode="popLayout">
              {emails.length === 0 ? (
                <motion.div 
                  key="empty"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="floating-box col-span-full py-12 sm:py-16 bg-white ring-1 ring-black/5 border border-dashed border-[#D5D2CC] rounded-2xl sm:rounded-[24px] flex flex-col items-center justify-center text-center p-4"
                >
                  <Mail size={28} strokeWidth={1.5} className="text-[#D5D2CC] mb-3 sm:mb-4" />
                  <p className="text-[#1D1B16] font-bold text-xs sm:text-[15px] mb-1">No pending invitations</p>
                  <p className="text-[#9A948A] text-[11px] sm:text-[13px] font-medium max-w-sm leading-relaxed">
                    When invited employees complete their sign-up process, their pre-configured Branch, Department, and Role will be assigned automatically.
                  </p>
                </motion.div>
              ) : (
                emails.map((item) => (
                  <motion.div
                    key={item.id || item.email}
                    layout
                    variants={listVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="group flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-white ring-1 ring-black/5 rounded-xl sm:rounded-[20px] shadow-2xs hover:shadow-md transition-all duration-300 gap-3"
                  >
                    <div className="flex items-center gap-3 overflow-hidden min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-full bg-[#FAF9F6] border border-[#EAE7E0] flex items-center justify-center shrink-0">
                        <Mail className="w-4 h-4 text-[#9A948A]" strokeWidth={2.5} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-xs sm:text-[14px] font-bold text-[#1D1B16] tracking-tight truncate block" title={item.email}>
                          {item.email}
                        </span>
                        
                        {/* Security Parameters Badges */}
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {item.department && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#F0F3F9] text-[#1F2B4D] border border-[#CBD5E1]">
                              <Building2 size={11} />
                              {item.department}
                            </span>
                          )}
                          {item.branch && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#FAF9F6] text-[#6B655C] border border-[#EAE7E0]">
                              <MapPin size={11} />
                              {item.branch}
                            </span>
                          )}
                          {item.roleName && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <ShieldCheck size={11} />
                              {item.roleName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => handleRemove(item.email)}
                      className="self-end sm:self-center flex items-center justify-center w-8 sm:w-9 h-8 sm:h-9 rounded-full bg-[#FEF2F2] text-[#B91C1C] hover:bg-[#FEE2E2] active:scale-[0.95] transition-all duration-200 shrink-0"
                      title="Revoke Invite"
                    >
                      <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={2.5} />
                    </button>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        )}

      </div>
    </div>
  );
};

export default InviteEmployee;
