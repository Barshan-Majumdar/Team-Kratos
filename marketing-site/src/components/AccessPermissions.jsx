import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { getSession } from '@crew/auth-client';
import { ShieldCheck, Lock, Save, Sparkles, Check, Crown } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const PERMISSIONS_LIST = [
  { key: 'view_all_employees', label: 'View All Personnel Directory' },
  { key: 'edit_all_employees', label: 'Edit Personnel Records' },
  { key: 'approve_leaves', label: 'Approve Leave Applications' },
  { key: 'generate_payroll', label: 'Execute Payroll Run' },
  { key: 'manage_expenses', label: 'Approve Expense Claims' },
  { key: 'view_reports', label: 'View Financial & Audit Reports' },
  { key: 'manage_shifts', label: 'Manage Shifts & Rosters' },
  { key: 'approve_advances', label: 'Approve Salary Advances' },
  { key: 'manage_performance', label: 'Manage Performance & 1-on-1s' },
  { key: 'manage_recruitment', label: 'Manage ATS & Job Requisitions' },
  { key: 'manage_benefits', label: 'Manage Benefit Plans' },
  { key: 'manage_organization', label: 'Manage Organization Settings' },
  { key: 'manage_helpdesk', label: 'Manage IT Helpdesk & Assets' }
];

function resolvePermissions(role) {
  if (!role) return {};
  if (role.isOwnerRole) {
    const all = {};
    PERMISSIONS_LIST.forEach(p => { all[p.key] = true; });
    return all;
  }
  if (role.permissions !== null && typeof role.permissions === 'object') {
    const merged = {};
    PERMISSIONS_LIST.forEach(p => {
      merged[p.key] = role.permissions[p.key] === true;
    });
    return merged;
  }
  const l = role.level ?? 99;
  return {
    view_all_employees:  l <= 2,
    edit_all_employees:  l <= 1,
    approve_leaves:      l <= 2,
    generate_payroll:    l <= 1,
    manage_expenses:     l <= 1,
    view_reports:        l <= 1,
    manage_shifts:       l <= 1,
    approve_advances:    l <= 2,
    manage_performance:  l <= 2,
    manage_recruitment:  l <= 1,
    manage_benefits:     l <= 2,
    manage_organization: l <= 1,
    manage_helpdesk:     l <= 1,
  };
}

export default function AccessPermissions({ user }) {
  const { token } = getSession();
  const isOwnerSession = (user?.roleDefinition?.level ?? 99) === 0;

  const [roles, setRoles] = useState([]);
  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const [localPermissions, setLocalPermissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchRoles = useCallback(async (targetRoleId) => {
    try {
      const r = await fetch(`${API_BASE}/api/console/roles`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store'
      });
      if (!r.ok) throw new Error('Failed to fetch roles');
      const data = await r.json();

      const resolvedId = targetRoleId || (data.length > 0 ? data[0].id : null);

      setRoles(data);
      setSelectedRoleId(resolvedId);

      if (resolvedId) {
        const role = data.find(r => r.id === resolvedId);
        setLocalPermissions(resolvePermissions(role));
      }

      setLoading(false);
    } catch (err) {
      toast.error('Failed to load roles');
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchRoles(null);
  }, [fetchRoles]);

  const handleSelectRole = useCallback((roleId) => {
    setSelectedRoleId(roleId);
    const role = roles.find(r => r.id === roleId);
    setLocalPermissions(resolvePermissions(role));
  }, [roles]);

  const handleToggle = useCallback((permKey) => {
    setLocalPermissions(prev => {
      const next = { ...prev, [permKey]: !prev[permKey] };
      if (permKey === 'view_all_employees' && !next.view_all_employees) {
        next.edit_all_employees = false;
      }
      if (permKey === 'edit_all_employees' && next.edit_all_employees) {
        next.view_all_employees = true;
      }
      return next;
    });
  }, []);

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const fullPermissions = {};
      PERMISSIONS_LIST.forEach(p => {
        fullPermissions[p.key] = localPermissions[p.key] === true;
      });

      const res = await fetch(`${API_BASE}/api/console/permissions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ roleId: selectedRoleId, permissions: fullPermissions })
      });

      if (res.ok) {
        toast.success('Permissions saved! Users in this role will see changes on next refresh.');
        await fetchRoles(selectedRoleId);
      } else {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error || 'Failed to update permissions');
      }
    } catch (err) {
      toast.error('Error updating permissions');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedRole = roles.find(r => r.id === selectedRoleId);

  if (loading) return (
    <div className="rounded-[32px] bg-[#F4F1EA] p-4 border border-[#EAE7E0]">
      <div className="rounded-[22px] bg-white p-12 border border-[#E2E8F0] text-center flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-3 border-[#1F2B4D]/20 border-t-[#1F2B4D] rounded-full animate-spin" />
        <p className="text-xs font-bold tracking-wider text-[#6B655C] uppercase">Loading Access Matrix...</p>
      </div>
    </div>
  );

  return (
    <div className="rounded-[32px] bg-[#F4F1EA] p-4 sm:p-6 border border-[#EAE7E0] shadow-sm">
      <div className="rounded-[22px] bg-white p-6 sm:p-8 border border-[#E2E8F0] shadow-xs space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#EAE7E0]">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F4F1EA] text-[#1F2B4D] border border-[#EAE7E0] text-[11px] font-bold tracking-wider uppercase mb-2">
              <Sparkles size={12} /> ENTERPRISE ACCESS MATRIX
            </div>
            <h3 className="text-2xl font-extrabold text-[#1D1B16] tracking-tight">Access Permissions Governance</h3>
            <p className="text-[#6B655C] text-xs sm:text-sm mt-1">Configure module capability flags and authorization boundaries per role designation.</p>
          </div>
        </div>

        {/* Read-only notice for non-owners */}
        {!isOwnerSession && (
          <div className="flex items-center gap-3 bg-[#FDF8F3] border border-[#EEDCCE] rounded-2xl px-5 py-3.5 text-xs font-semibold text-[#8C5722]">
            <Lock size={16} className="text-[#B5793A] shrink-0" />
            <span><strong>Read-Only View Mode:</strong> Only Level 0 (Owner / Chairman) can modify access capability maps. You are authenticated as Level {user?.roleDefinition?.level ?? 1} ({user?.roleDefinition?.name}).</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Role selector list */}
          <div className="md:col-span-4 border-r border-[#EAE7E0] pr-6 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#6B655C]">Select Role Designation</h4>
            <div className="space-y-1.5">
              {roles.map(role => {
                const isSelected = selectedRoleId === role.id;
                return (
                  <button
                    key={role.id}
                    onClick={() => handleSelectRole(role.id)}
                    className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-between ${
                      isSelected 
                        ? 'bg-[#1F2B4D] text-white font-bold shadow-sm' 
                        : 'bg-[#FAF9F6] text-[#1D1B16] hover:bg-[#F4F1EA] font-semibold border border-[#EAE7E0]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{role.name}</span>
                      {role.isOwnerRole && (
                        <Crown size={14} className={isSelected ? 'text-amber-300' : 'text-amber-600'} />
                      )}
                    </div>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-[#EAE7E0] text-[#6B655C]'
                    }`}>
                      L{role.level}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Capability Checkboxes Grid */}
          <div className="md:col-span-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EAE7E0]">
              <div>
                <h4 className="text-lg font-bold text-[#1D1B16]">
                  Permissions for <span className="text-[#1F2B4D] underline decoration-2">{selectedRole?.name ?? '—'}</span>
                </h4>
                <p className="text-xs text-[#9A948A] mt-0.5">Toggle granular platform access controls.</p>
              </div>

              {selectedRole?.isOwnerRole ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FDF8F3] border border-[#EEDCCE] text-[#8C5722] text-xs font-bold">
                  <Crown size={13} /> Unrestricted System Authority
                </span>
              ) : isOwnerSession ? (
                <button
                  onClick={handleSave}
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-[#1F2B4D] hover:bg-[#141C33] text-white text-xs font-bold tracking-wide uppercase transition-all duration-200 shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shrink-0"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Save size={15} />
                      <span>Save Matrix</span>
                    </>
                  )}
                </button>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FAF9F6] border border-[#EAE7E0] text-[#9A948A] text-xs font-bold">
                  <Lock size={13} /> Locked (Owner Only)
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#FAF9F6] p-5 rounded-2xl border border-[#EAE7E0]">
              {PERMISSIONS_LIST.map(perm => {
                const isOwner = selectedRole?.isOwnerRole;
                const isChecked = isOwner ? true : !!localPermissions[perm.key];
                return (
                  <label
                    key={perm.key}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-150 ${
                      isChecked 
                        ? 'bg-white border-[#1F2B4D]/30 shadow-xs' 
                        : 'bg-white/60 border-transparent opacity-80'
                    } ${(isOwner || !isOwnerSession) ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-white'}`}
                  >
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded text-[#1F2B4D] focus:ring-[#1F2B4D] border-[#EAE7E0]"
                      checked={isChecked}
                      onChange={() => isOwnerSession && !isOwner && handleToggle(perm.key)}
                      disabled={isOwner || !isOwnerSession}
                    />
                    <span className="text-xs font-bold text-[#1D1B16]">{perm.label}</span>
                  </label>
                );
              })}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
