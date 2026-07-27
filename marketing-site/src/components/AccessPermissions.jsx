import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { getSession } from '@crew/auth-client';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const PERMISSIONS_LIST = [
  { key: 'view_all_employees', label: 'View All Employees' },
  { key: 'edit_all_employees', label: 'Edit All Employees' },
  { key: 'approve_leaves', label: 'Approve Leaves' },
  { key: 'generate_payroll', label: 'Generate Payroll' },
  { key: 'manage_expenses', label: 'Manage Expenses' },
  { key: 'view_reports', label: 'View Financial Reports' }
];

export default function AccessPermissions() {
  const [roles, setRoles] = useState([]);
  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { token } = getSession();

  const fetchRoles = () => {
    fetch(`${API_BASE}/api/console/roles`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { 
        setRoles(data);
        if (data.length > 0 && !selectedRoleId) setSelectedRoleId(data[0].id);
        setLoading(false); 
      })
      .catch(err => { toast.error('Failed to load roles'); setLoading(false); });
  };

  useEffect(() => {
    fetchRoles();
  }, [token]);

  useEffect(() => {
    if (selectedRoleId) {
      const role = roles.find(r => r.id === selectedRoleId);
      setPermissions(role?.permissions || {});
    }
  }, [selectedRoleId, roles]);

  const handleToggle = (permKey) => {
    setPermissions(prev => ({ ...prev, [permKey]: !prev[permKey] }));
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/console/permissions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ roleId: selectedRoleId, permissions })
      });
      if (res.ok) {
        toast.success('Permissions updated');
        fetchRoles(); // Refresh the roles list
      } else {
        toast.error('Failed to update permissions');
      }
    } catch (err) { toast.error('Error updating permissions'); }
    finally { setIsSubmitting(false); }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
      <h3 className="text-xl font-bold mb-6 text-slate-800">Access Permissions Matrix</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="col-span-1 border-r pr-4">
          <h4 className="font-semibold text-slate-700 mb-4">Select Role</h4>
          <ul className="space-y-2">
            {roles.map(role => (
              <li key={role.id}>
                <button
                  onClick={() => setSelectedRoleId(role.id)}
                  className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${selectedRoleId === role.id ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  {role.name}
                  {role.isSystemDefault && <span className="ml-2 text-[10px] bg-slate-200 px-2 py-0.5 rounded-full">Default</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
        
        <div className="col-span-3">
          <div className="flex justify-between items-center mb-6">
             <h4 className="font-semibold text-slate-700">Configure Access for {roles.find(r => r.id === selectedRoleId)?.name}</h4>
             {roles.find(r => r.id === selectedRoleId)?.isOwnerRole ? (
               <span className="text-sm text-slate-500 font-medium bg-slate-100 px-3 py-1 rounded-full">Full Access</span>
             ) : (
               <button onClick={handleSave} disabled={isSubmitting} className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow disabled:opacity-50 disabled:cursor-not-allowed">{isSubmitting ? 'Saving...' : 'Save Permissions'}</button>
             )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-6 rounded-xl border">
            {PERMISSIONS_LIST.map(perm => {
              const currentRole = roles.find(r => r.id === selectedRoleId);
              const isOwner = currentRole?.isOwnerRole;
              return (
                <label key={perm.key} className={`flex items-center space-x-3 p-2 rounded-lg ${isOwner ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-100'}`}>
                  <input
                    type="checkbox"
                    className={`w-5 h-5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 ${isOwner ? 'cursor-not-allowed' : ''}`}
                    checked={isOwner ? true : !!permissions[perm.key]}
                    onChange={() => !isOwner && handleToggle(perm.key)}
                    disabled={isOwner}
                  />
                  <span className="text-slate-700 font-medium">{perm.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
