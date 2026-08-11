import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { getSession } from '@crew/auth-client';
import { GitFork, Plus, Trash2, ShieldCheck, Sparkles, CheckCircle2, ChevronDown } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function RoleHierarchy() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { token } = getSession();

  const [newRole, setNewRole] = useState({ name: '', level: 2 });

  const fetchRoles = () => {
    fetch(`${API_BASE}/api/console/roles`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { setRoles(data); setLoading(false); })
      .catch(err => { toast.error('Failed to load roles'); setLoading(false); });
  };

  useEffect(() => {
    fetchRoles();
  }, [token]);

  const handleCreateRole = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/console/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(newRole)
      });
      if (res.ok) {
        toast.success('Role created');
        setNewRole({ name: '', level: 2 });
        fetchRoles();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to create role');
      }
    } catch (err) { toast.error('Error creating role'); }
    finally { setIsSubmitting(false); }
  };

  const handleDelete = async (id) => {
    if (!(await window.confirmDialog('Delete this role?'))) return;
    try {
      const res = await fetch(`${API_BASE}/api/console/roles/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Role deleted');
        fetchRoles();
      } else {
        toast.error('Failed to delete role');
      }
    } catch (err) { toast.error('Error deleting role'); }
  };

  if (loading) return (
    <div className="rounded-[32px] bg-[#F4F1EA] p-4 border border-[#EAE7E0]">
      <div className="rounded-[22px] bg-white p-12 border border-[#E2E8F0] text-center flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-3 border-[#1F2B4D]/20 border-t-[#1F2B4D] rounded-full animate-spin" />
        <p className="text-xs font-bold tracking-wider text-[#6B655C] uppercase">Loading Role Hierarchy...</p>
      </div>
    </div>
  );

  return (
    <div className="rounded-[28px] sm:rounded-[32px] bg-[#F4F1EA] p-3.5 sm:p-5 md:p-6 border border-[#EAE7E0] shadow-2xs w-full font-sans">
      <div className="rounded-[20px] sm:rounded-[22px] bg-white p-4 sm:p-6 md:p-8 border border-[#E2E8F0] shadow-2xs space-y-5 sm:space-y-6 w-full">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-[#EAE7E0] w-full">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAF8F5] text-[#1F2B4D] border border-[#EAE7E0] text-[10px] sm:text-[11px] font-display font-bold tracking-wider uppercase mb-2">
              <Sparkles size={12} /> RBAC GOVERNANCE
            </div>
            <h3 className="text-xl sm:text-2xl font-serif font-bold text-[#1F2B4D] tracking-tight">Role Hierarchy Manager</h3>
            <p className="text-[#6B655C] text-xs sm:text-sm font-medium mt-0.5">Define organizational rank tiers, system defaults, and custom authority levels.</p>
          </div>
        </div>

        {/* Create Custom Role Panel */}
        <div className="p-4 sm:p-5 bg-[#FAF8F5] border border-[#EAE7E0] rounded-2xl space-y-3.5 w-full">
          <div className="flex items-center gap-2 text-xs font-display font-bold uppercase tracking-wider text-[#1F2B4D]">
            <GitFork size={14} /> Add Custom Role Definition
          </div>

          <form onSubmit={handleCreateRole} className="grid grid-cols-1 sm:grid-cols-2 min-[1000px]:grid-cols-12 gap-3.5 sm:gap-4 items-end w-full">
            <div className="col-span-1 min-[1000px]:col-span-6">
              <label className="block text-[10px] sm:text-xs font-display font-bold uppercase tracking-wider text-[#6B655C] mb-1.5">
                Role Name
              </label>
              <input 
                type="text" 
                required 
                className="w-full px-3.5 py-2.5 bg-white border border-[#EAE7E0] rounded-xl text-xs sm:text-sm font-medium text-[#1F2B4D] outline-none focus:border-[#1F2B4D] focus:ring-2 focus:ring-[#1F2B4D]/15 transition-all" 
                value={newRole.name} 
                onChange={e => setNewRole({...newRole, name: e.target.value})} 
                placeholder="e.g. IT Security Lead" 
              />
            </div>

            <div className="col-span-1 min-[1000px]:col-span-4">
              <label className="block text-[10px] sm:text-xs font-display font-bold uppercase tracking-wider text-[#6B655C] mb-1.5">
                Hierarchy Rank Level
              </label>
              <div className="relative">
                <select 
                  required 
                  className="w-full px-3.5 py-2.5 pr-9 bg-white border border-[#EAE7E0] rounded-xl text-xs sm:text-sm font-medium text-[#1F2B4D] outline-none appearance-none focus:border-[#1F2B4D] focus:ring-2 focus:ring-[#1F2B4D]/15 transition-all cursor-pointer shadow-2xs" 
                  value={newRole.level} 
                  onChange={e => setNewRole({...newRole, level: parseInt(e.target.value)})}
                >
                  <option value={0} className="bg-white text-[#1F2B4D] font-medium py-1">Level 0 (Owner / Chairman)</option>
                  <option value={1} className="bg-white text-[#1F2B4D] font-medium py-1">Level 1 (Admin / Director)</option>
                  <option value={2} className="bg-white text-[#1F2B4D] font-medium py-1">Level 2 (Manager / Team Lead)</option>
                  <option value={3} className="bg-white text-[#1F2B4D] font-medium py-1">Level 3 (Individual Contributor)</option>
                </select>
                <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B655C] pointer-events-none" />
              </div>
            </div>

            <div className="col-span-1 sm:col-span-2 min-[1000px]:col-span-2">
              <button 
                type="submit" 
                disabled={isSubmitting} 
                className="w-full py-2.5 px-4 rounded-xl bg-[#1F2B4D] hover:bg-[#141C33] text-white text-xs font-display font-bold uppercase tracking-wider transition-all shadow-2xs flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer h-[42px] shrink-0"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Plus size={15} />
                    <span>Add</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Mobile View: Zero Sliding Cards Layout (< 600px) */}
        <div className="min-[600px]:hidden flex flex-col gap-2.5 w-full">
          {roles.map(role => (
            <div key={role.id} className="p-3 bg-[#FAF8F5] rounded-xl border border-[#EAE7E0] flex flex-col gap-2 w-full">
              <div className="flex justify-between items-center gap-2 pb-1.5 border-b border-[#EAE7E0]">
                <div className="flex items-center gap-1.5">
                  <h4 className="font-bold text-xs text-[#1F2B4D]">{role.name}</h4>
                  {role.level === 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-[#1F2B4D] text-white text-[9px] font-extrabold uppercase">
                      Owner
                    </span>
                  )}
                </div>
                {!role.isSystemDefault && (
                  <button 
                    onClick={() => handleDelete(role.id)} 
                    className="p-1 rounded-md text-rose-600 hover:bg-rose-50 transition-colors shrink-0"
                    title="Delete Role"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <div className="flex items-center justify-between gap-2 pt-0.5 text-[10.5px]">
                <span className="font-mono text-[#6B655C] font-bold">
                  Level {role.level}
                </span>
                <div>
                  {role.isSystemDefault ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-[9.5px] font-bold">
                      <CheckCircle2 size={10} /> System Standard
                    </span>
                  ) : (
                    <span className="text-[#6B655C] text-[10px] font-medium bg-white border border-[#EAE7E0] px-1.5 py-0.5 rounded">Custom Defined</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop View: Data Table (>= 600px) */}
        <div className="hidden min-[600px]:block overflow-x-auto [&::-webkit-scrollbar]:hidden border border-[#EAE7E0] rounded-2xl w-full">
          <table className="w-full text-left border-collapse min-w-[500px]">
            <thead>
              <tr className="bg-[#FAF8F5] text-[#6B655C] text-[10px] sm:text-xs font-display font-bold uppercase tracking-wider border-b border-[#EAE7E0]">
                <th className="px-4 sm:px-6 py-3">Role Designation</th>
                <th className="px-4 sm:px-6 py-3">Level Tier</th>
                <th className="px-4 sm:px-6 py-3">System Default</th>
                <th className="px-4 sm:px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAE7E0] text-xs sm:text-sm">
              {roles.map(role => (
                <tr key={role.id} className="hover:bg-[#FAF8F5] transition-colors">
                  <td className="px-4 sm:px-6 py-3.5 font-bold text-[#1F2B4D] flex items-center gap-2">
                    <span>{role.name}</span>
                    {role.level === 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-[#1F2B4D] text-white text-[10px] font-extrabold uppercase">
                        Owner
                      </span>
                    )}
                  </td>
                  <td className="px-4 sm:px-6 py-3.5 text-[#6B655C] font-mono text-xs font-bold">
                    Level {role.level}
                  </td>
                  <td className="px-4 sm:px-6 py-3.5">
                    {role.isSystemDefault ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                        <CheckCircle2 size={12} /> System Standard
                      </span>
                    ) : (
                      <span className="text-[#6B655C] text-xs font-medium bg-[#FAF8F5] px-2 py-0.5 rounded border border-[#EAE7E0]">Custom Defined</span>
                    )}
                  </td>
                  <td className="px-4 sm:px-6 py-3.5 text-right">
                    {!role.isSystemDefault && (
                      <button 
                        onClick={() => handleDelete(role.id)} 
                        className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete Role"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
