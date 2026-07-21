import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { getSession } from '@crew/auth-client';

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

  if (loading) return <div>Loading...</div>;

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
      <h3 className="text-xl font-bold mb-6 text-slate-800">Role Hierarchy Manager</h3>
      
      <div className="mb-8 p-4 bg-slate-50 border rounded-xl">
        <h4 className="font-semibold text-slate-700 mb-4">Create Custom Role</h4>
        <form onSubmit={handleCreateRole} className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">Role Name</label>
            <input type="text" required className="w-full border p-2 rounded-lg" value={newRole.name} onChange={e => setNewRole({...newRole, name: e.target.value})} placeholder="e.g. IT Admin" />
          </div>
          <div className="w-32">
            <label className="block text-sm font-medium text-slate-700 mb-1">Hierarchy Level</label>
            <select required className="w-full border p-2 rounded-lg bg-white" value={newRole.level} onChange={e => setNewRole({...newRole, level: parseInt(e.target.value)})}>
              <option value={0}>0 (Owner/Chairman)</option>
              <option value={1}>1 (Admin/Director)</option>
              <option value={2}>2 (Manager)</option>
              <option value={3}>3 (Employee)</option>
            </select>
          </div>
          <button type="submit" disabled={isSubmitting} className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 shadow disabled:opacity-50 disabled:cursor-not-allowed">
            {isSubmitting ? 'Adding...' : 'Add Role'}
          </button>
        </form>
      </div>

      <table className="w-full text-left">
        <thead>
          <tr className="border-b text-slate-500">
            <th className="pb-3 font-medium">Role Name</th>
            <th className="pb-3 font-medium">Level</th>
            <th className="pb-3 font-medium">System Default</th>
            <th className="pb-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {roles.map(role => (
            <tr key={role.id} className="border-b last:border-0 hover:bg-slate-50">
              <td className="py-3 font-medium text-slate-800">{role.name}</td>
              <td className="py-3 text-slate-600">{role.level}</td>
              <td className="py-3 text-slate-600">{role.isSystemDefault ? <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full text-xs font-semibold">Yes</span> : 'No'}</td>
              <td className="py-3">
                {!role.isSystemDefault && (
                  <button onClick={() => handleDelete(role.id)} className="text-red-500 hover:text-red-700 text-sm font-medium">Delete</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
