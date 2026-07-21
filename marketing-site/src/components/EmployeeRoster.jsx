import React, { useState, useEffect } from 'react';
import { getSession } from '@crew/auth-client';
import toast from 'react-hot-toast';

export default function EmployeeRoster() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { token } = getSession();
    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    
    fetch(`${API_BASE}/api/console/employees`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setEmployees(data);
        } else {
          setEmployees([]);
          toast.error(data.error || 'Failed to load employees');
        }
        setLoading(false);
      })
      .catch(err => {
        toast.error('Network error loading employees');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="text-slate-500 font-medium p-4">Loading employee roster...</div>;
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-200">
        <h3 className="text-lg font-bold text-slate-800">Employee Roster</h3>
        <p className="text-sm text-slate-500 mt-1">Directory of all personnel and their organizational roles.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-200">
              <th className="px-6 py-4 font-semibold">Name</th>
              <th className="px-6 py-4 font-semibold">Email</th>
              <th className="px-6 py-4 font-semibold">Role</th>
              <th className="px-6 py-4 font-semibold">Department</th>
              <th className="px-6 py-4 font-semibold">Branch Name</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {employees.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-8 text-center text-slate-400">No employees found.</td>
              </tr>
            ) : (
              employees.map(emp => (
                <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-800">{emp.displayName || 'Unnamed'}</td>
                  <td className="px-6 py-4 text-slate-600">{emp.email}</td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-semibold">
                      {emp.roleDefinition?.name || 'NIL'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{emp.department || 'NIL'}</td>
                  <td className="px-6 py-4 text-slate-600">
                    {emp.office?.name || 'NIL'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
