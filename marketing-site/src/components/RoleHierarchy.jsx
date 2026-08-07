import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { getSession } from '@crew/auth-client';
import { GitFork, Plus, Trash2, ShieldCheck, Sparkles, CheckCircle2 } from 'lucide-react';

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
    if (!window.confirm('Delete this role?')) return;
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
    <div className="rounded-[32px] bg-[#F4F1EA] p-4 sm:p-6 border border-[#EAE7E0] shadow-sm">
      <div className="rounded-[22px] bg-white p-6 sm:p-8 border border-[#E2E8F0] shadow-xs space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#EAE7E0]">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F4F1EA] text-[#1F2B4D] border border-[#EAE7E0] text-[11px] font-bold tracking-wider uppercase mb-2">
              <Sparkles size={12} /> RBAC GOVERNANCE
            </div>
            <h3 className="text-2xl font-extrabold text-[#1D1B16] tracking-tight">Role Hierarchy Manager</h3>
            <p className="text-[#6B655C] text-xs sm:text-sm mt-1">Define organizational rank tiers, system defaults, and custom authority levels.</p>
          </div>
        </div>

        {/* Create Custom Role Panel */}
        <div className="p-5 sm:p-6 bg-[#FAF9F6] border border-[#EAE7E0] rounded-2xl space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#1F2B4D]">
            <GitFork size={15} /> Add Custom Role Definition
          </div>

          <form onSubmit={handleCreateRole} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-6">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#6B655C] mb-2">
                Role Name
              </label>
              <input 
                type="text" 
                required 
                className="w-full px-4 py-2.5 bg-white border border-[#EAE7E0] rounded-xl text-sm font-medium text-[#1D1B16] outline-none focus:border-[#1F2B4D] focus:ring-2 focus:ring-[#1F2B4D]/15 transition-all" 
                value={newRole.name} 
                onChange={e => setNewRole({...newRole, name: e.target.value})} 
                placeholder="e.g. IT Security Lead" 
              />
            </div>

            <div className="md:col-span-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#6B655C] mb-2">
                Hierarchy Rank Level
              </label>
              <select 
                required 
                className="w-full px-4 py-2.5 bg-white border border-[#EAE7E0] rounded-xl text-sm font-medium text-[#1D1B16] outline-none focus:border-[#1F2B4D] focus:ring-2 focus:ring-[#1F2B4D]/15 transition-all cursor-pointer" 
                value={newRole.level} 
                onChange={e => setNewRole({...newRole, level: parseInt(e.target.value)})}
              >
                <option value={0}>Level 0 (Owner / Chairman)</option>
                <option value={1}>Level 1 (Admin / Director)</option>
                <option value={2}>Level 2 (Manager / Team Lead)</option>
                <option value={3}>Level 3 (Individual Contributor)</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <button 
                type="submit" 
                disabled={isSubmitting} 
                className="w-full py-2.5 px-4 rounded-xl bg-[#1F2B4D] hover:bg-[#141C33] text-white text-xs font-bold tracking-wide uppercase transition-all duration-200 shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer h-[42px]"
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

        {/* High Density Table */}
        <div className="overflow-x-auto border border-[#EAE7E0] rounded-2xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F4F1EA] text-[#6B655C] text-xs font-bold uppercase tracking-wider border-b border-[#EAE7E0]">
                <th className="px-6 py-3.5">Role Designation</th>
                <th className="px-6 py-3.5">Level Tier</th>
                <th className="px-6 py-3.5">System Default</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAE7E0] text-sm">
              {roles.map(role => (
                <tr key={role.id} className="hover:bg-[#FAF9F6] transition-colors">
                  <td className="px-6 py-4 font-bold text-[#1D1B16] flex items-center gap-2">
                    <span>{role.name}</span>
                    {role.level === 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-[#0F172A] text-white text-[10px] font-extrabold uppercase">
                        Owner
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-[#6B655C] font-mono text-xs">
                    Level {role.level}
                  </td>
                  <td className="px-6 py-4">
                    {role.isSystemDefault ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] text-xs font-bold">
                        <CheckCircle2 size={12} /> System Standard
                      </span>
                    ) : (
                      <span className="text-[#9A948A] text-xs font-medium">Custom Defined</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
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
