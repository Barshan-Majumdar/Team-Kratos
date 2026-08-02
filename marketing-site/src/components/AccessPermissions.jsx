import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { getSession } from '@crew/auth-client';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const PERMISSIONS_LIST = [
  { key: 'view_all_employees', label: 'View All Employees' },
  { key: 'edit_all_employees', label: 'Edit All Employees' },
  { key: 'approve_leaves', label: 'Approve Leaves' },
  { key: 'generate_payroll', label: 'Generate Payroll' },
  { key: 'manage_expenses', label: 'Manage Expenses' },
  { key: 'view_reports', label: 'View Financial Reports' },
  { key: 'manage_shifts', label: 'Manage Shifts & Rosters' },
  { key: 'approve_advances', label: 'Approve Salary Advances' },
  { key: 'manage_performance', label: 'Manage Performance & 1-on-1s' },
  { key: 'manage_recruitment', label: 'Manage ATS / Recruiting' },
  { key: 'manage_benefits', label: 'Manage Benefits' },
  { key: 'manage_organization', label: 'Manage Organization Settings' },
  { key: 'manage_helpdesk', label: 'Manage IT & Helpdesk' }
];

// Given a role from the server, return a complete permissions map for checkboxes.
// RULE: null permissions = role never configured → use level-based defaults (all explicit).
//       object (even {}) = explicitly configured → use as-is, missing keys = false.
function resolvePermissions(role) {
  if (!role) return {};
  if (role.isOwnerRole) {
    // Owner always has everything checked (display only, not editable)
    const all = {};
    PERMISSIONS_LIST.forEach(p => { all[p.key] = true; });
    return all;
  }
  if (role.permissions !== null && typeof role.permissions === 'object') {
    // Explicitly configured by owner — fill missing keys with false
    const merged = {};
    PERMISSIONS_LIST.forEach(p => {
      merged[p.key] = role.permissions[p.key] === true;
    });
    return merged;
  }
  // Never configured — use level-based defaults
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

  // Only Level 0 (Owner/Chairman) can modify permissions.
  // Level 1 (Admin) can view but NOT save.
  const isOwnerSession = (user?.roleDefinition?.level ?? 99) === 0;

  // roles: list of all role definitions from server (source of truth)
  const [roles, setRoles] = useState([]);
  // selectedRoleId: which role the owner is currently viewing/editing
  const [selectedRoleId, setSelectedRoleId] = useState(null);
  // localPermissions: the checkbox state the owner is editing RIGHT NOW
  // Initialized from the selected role's server data; user changes are tracked here.
  const [localPermissions, setLocalPermissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch all roles from server. After fetch, select the target role and
  // set localPermissions from the fresh server data (not from stale state).
  const fetchRoles = useCallback(async (targetRoleId) => {
    try {
      const r = await fetch(`${API_BASE}/api/console/roles`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store'
      });
      if (!r.ok) throw new Error('Failed to fetch roles');
      const data = await r.json();

      // Pick which role to show
      const resolvedId = targetRoleId || (data.length > 0 ? data[0].id : null);

      setRoles(data);
      setSelectedRoleId(resolvedId);

      // CRITICAL: set localPermissions directly from fresh server data here,
      // not via a separate useEffect, to avoid race conditions.
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

  // On mount: load roles
  useEffect(() => {
    fetchRoles(null);
  }, [fetchRoles]);

  // When user clicks a different role in the sidebar list,
  // immediately sync checkboxes from the already-loaded roles data.
  const handleSelectRole = useCallback((roleId) => {
    setSelectedRoleId(roleId);
    const role = roles.find(r => r.id === roleId);
    setLocalPermissions(resolvePermissions(role));
  }, [roles]);

  const handleToggle = useCallback((permKey) => {
    setLocalPermissions(prev => {
      const next = { ...prev, [permKey]: !prev[permKey] };
      // Dependency rules:
      // - If view_all_employees is turned OFF → also turn off edit_all_employees
      //   (you can't edit employees you can't see)
      if (permKey === 'view_all_employees' && !next.view_all_employees) {
        next.edit_all_employees = false;
      }
      // - If edit_all_employees is turned ON → also turn on view_all_employees
      //   (editing requires viewing)
      if (permKey === 'edit_all_employees' && next.edit_all_employees) {
        next.view_all_employees = true;
      }
      return next;
    });
  }, []);


  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      // Build a complete, fully-explicit boolean map
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
        toast.success('Permissions saved! Users in this role will see changes on next login or refresh.');
        // Re-fetch from server and re-sync — this is the single source of truth.
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
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-center h-40">
      <div className="flex flex-col items-center gap-3">
        <div className="w-7 h-7 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-sm text-slate-500">Loading permissions...</p>
      </div>
    </div>
  );

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
      <h3 className="text-xl font-bold mb-2 text-slate-800">Access Permissions Matrix</h3>

      {/* Read-only notice for Level 1 users */}
      {!isOwnerSession && (
        <div className="mb-5 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          <span className="text-lg">🔒</span>
          <span><strong>View only.</strong> Only the <strong>Owner / Chairman</strong> (Level 0) can edit and save access permissions. You are logged in as Level {user?.roleDefinition?.level} ({user?.roleDefinition?.name}).</span>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Role list */}
        <div className="col-span-1 border-r pr-4">
          <h4 className="font-semibold text-slate-700 mb-4">Select Role</h4>
          <ul className="space-y-2">
            {roles.map(role => (
              <li key={role.id}>
                <button
                  onClick={() => handleSelectRole(role.id)}
                  className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${selectedRoleId === role.id ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  {role.name}
                  {role.isOwnerRole && <span className="ml-2 text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Owner</span>}
                  {role.isSystemDefault && !role.isOwnerRole && <span className="ml-2 text-[10px] bg-slate-200 px-2 py-0.5 rounded-full">Default</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
        
        {/* Permission checkboxes */}
        <div className="col-span-3">
          <div className="flex justify-between items-center mb-6">
            <h4 className="font-semibold text-slate-700">Configure Access for {selectedRole?.name ?? '—'}</h4>
             {selectedRole?.isOwnerRole ? (
              <span className="text-sm text-slate-500 font-medium bg-slate-100 px-3 py-1 rounded-full">Full Access (cannot be restricted)</span>
            ) : isOwnerSession ? (
              <button
                onClick={handleSave}
                disabled={isSubmitting}
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Saving...' : 'Save Permissions'}
              </button>
            ) : (
              <span className="text-sm text-slate-400 font-medium bg-slate-100 px-3 py-1 rounded-full flex items-center gap-1">
                🔒 Owner only
              </span>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-6 rounded-xl border">
            {PERMISSIONS_LIST.map(perm => {
              const isOwner = selectedRole?.isOwnerRole;
              const isChecked = isOwner ? true : !!localPermissions[perm.key];
              return (
                <label
                  key={perm.key}
                  className={`flex items-center space-x-3 p-2 rounded-lg ${isOwner ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-100'}`}
                >
                  <input
                    type="checkbox"
                    className={`w-5 h-5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 ${(isOwner || !isOwnerSession) ? 'cursor-not-allowed' : ''}`}
                    checked={isChecked}
                    onChange={() => isOwnerSession && !isOwner && handleToggle(perm.key)}
                    disabled={isOwner || !isOwnerSession}
                  />
                  <span className="text-slate-700 font-medium">{perm.label}</span>
                </label>
              );
            })}
          </div>

          {!selectedRole?.isOwnerRole && (
            <p className="text-xs text-slate-400 mt-3">
              Changes take effect for existing users on their next page refresh or login.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
