import React, { useState, useEffect } from 'react';
import { getSession } from '@crew/auth-client';
import toast from 'react-hot-toast';
import { Users, Mail, Shield, Building, MapPin, Sparkles } from 'lucide-react';

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
    return (
      <div className="rounded-[32px] bg-[#F4F1EA] p-4 border border-[#EAE7E0]">
        <div className="rounded-[22px] bg-white p-12 border border-[#E2E8F0] text-center flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-3 border-[#1F2B4D]/20 border-t-[#1F2B4D] rounded-full animate-spin" />
          <p className="text-xs font-bold tracking-wider text-[#6B655C] uppercase">Loading Personnel Roster...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[32px] bg-[#F4F1EA] p-4 sm:p-6 border border-[#EAE7E0] shadow-sm">
      <div className="rounded-[22px] bg-white p-6 sm:p-8 border border-[#E2E8F0] shadow-xs space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#EAE7E0]">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F4F1EA] text-[#1F2B4D] border border-[#EAE7E0] text-[11px] font-bold tracking-wider uppercase mb-2">
              <Sparkles size={12} /> ENTERPRISE DIRECTORY
            </div>
            <h3 className="text-2xl font-extrabold text-[#1D1B16] tracking-tight">Employee Personnel Roster</h3>
            <p className="text-[#6B655C] text-xs sm:text-sm mt-1">Unified organizational directory displaying active personnel, role definitions, and office branches.</p>
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0F172A] text-white text-xs font-bold shrink-0">
            <Users size={14} className="text-emerald-400" />
            <span>{employees.length} Active Personnel</span>
          </div>
        </div>

        {/* Directory Data Table */}
        <div className="overflow-x-auto border border-[#EAE7E0] rounded-2xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F4F1EA] text-[#6B655C] text-xs font-bold uppercase tracking-wider border-b border-[#EAE7E0]">
                <th className="px-6 py-3.5">Personnel Name</th>
                <th className="px-6 py-3.5">Email Address</th>
                <th className="px-6 py-3.5">Role Designation</th>
                <th className="px-6 py-3.5">Department</th>
                <th className="px-6 py-3.5">Office Branch</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAE7E0] text-sm">
              {employees.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-[#9A948A] text-xs font-medium">
                    No active personnel found in workspace directory.
                  </td>
                </tr>
              ) : (
                employees.map(emp => (
                  <tr key={emp.id} className="hover:bg-[#FAF9F6] transition-colors">
                    <td className="px-6 py-4 font-bold text-[#1D1B16]">
                      {emp.displayName || 'Unnamed'}
                    </td>
                    <td className="px-6 py-4 text-[#6B655C] font-mono text-xs">
                      {emp.email}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F4F1EA] text-[#1F2B4D] border border-[#EAE7E0] text-xs font-bold">
                        <Shield size={12} /> {emp.roleDefinition?.name || 'NIL'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[#6B655C] font-medium">
                      {emp.department || 'NIL'}
                    </td>
                    <td className="px-6 py-4 text-[#6B655C] font-medium">
                      {emp.office?.name || 'NIL'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
