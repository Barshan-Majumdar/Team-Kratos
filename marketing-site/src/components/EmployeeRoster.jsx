import React, { useState, useEffect } from 'react';
import { getSession } from '@crew/auth-client';
import toast from 'react-hot-toast';
import { Users, Mail, Shield, Building, MapPin, Sparkles } from 'lucide-react';

export default function EmployeeRoster() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { token } = getSession();
    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    
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
    <div className="rounded-[28px] sm:rounded-[32px] bg-[#F4F1EA] p-3.5 sm:p-5 md:p-6 border border-[#EAE7E0] shadow-2xs w-full font-sans">
      <div className="rounded-[20px] sm:rounded-[22px] bg-white p-4 sm:p-6 md:p-8 border border-[#E2E8F0] shadow-2xs space-y-5 sm:space-y-6 w-full">
        
        {/* Header */}
        <div className="flex flex-col min-[500px]:flex-row justify-between items-start min-[500px]:items-center gap-2.5 pb-4 border-b border-[#EAE7E0] w-full">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAF8F5] text-[#1F2B4D] border border-[#EAE7E0] text-[10px] sm:text-[11px] font-display font-bold tracking-wider uppercase mb-2">
              <Sparkles size={12} /> ENTERPRISE DIRECTORY
            </div>
            <h3 className="text-xl sm:text-2xl font-serif font-bold text-[#1F2B4D] tracking-tight">Employee Personnel Roster</h3>
            <p className="text-[#6B655C] text-xs sm:text-sm font-medium mt-0.5">Unified organizational directory displaying active personnel, role definitions, and office branches.</p>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1F2B4D] text-white text-xs font-display font-bold shrink-0">
            <Users size={13} className="text-emerald-400" />
            <span>{employees.length} Active Personnel</span>
          </div>
        </div>

        {/* Mobile View: Zero Sliding Cards Layout (< 650px) */}
        <div className="min-[650px]:hidden flex flex-col gap-2.5 w-full">
          {employees.length === 0 ? (
            <div className="px-4 py-8 text-center text-[#6B655C] text-xs font-bold bg-[#FAF8F5] rounded-xl border border-[#EAE7E0]">
              No active personnel found in workspace directory.
            </div>
          ) : (
            employees.map(emp => (
              <div key={emp.id} className="p-3 bg-[#FAF8F5] rounded-xl border border-[#EAE7E0] flex flex-col gap-2 w-full">
                <div className="flex justify-between items-start gap-2 pb-1.5 border-b border-[#EAE7E0]">
                  <div>
                    <h4 className="font-bold text-xs text-[#1F2B4D]">{emp.displayName || 'Unnamed'}</h4>
                    <p className="text-[10.5px] font-mono text-[#6B655C] truncate max-w-[180px]">{emp.email}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white text-[#1F2B4D] border border-[#EAE7E0] text-[10px] font-bold shrink-0">
                    <Shield size={10} /> {emp.roleDefinition?.name || 'NIL'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 pt-0.5 text-[10.5px]">
                  <div className="flex items-center gap-1 text-[#6B655C]">
                    <Building size={12} className="shrink-0 text-[#1F2B4D]" />
                    <span className="font-bold">{emp.department || 'NIL'}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[#6B655C]">
                    <MapPin size={12} className="shrink-0 text-[#1F2B4D]" />
                    <span className="font-bold">{emp.office?.name || 'NIL'}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop View: Directory Data Table (>= 650px) */}
        <div className="hidden min-[650px]:block overflow-x-auto [&::-webkit-scrollbar]:hidden border border-[#EAE7E0] rounded-2xl w-full">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-[#FAF8F5] text-[#6B655C] text-[10px] sm:text-xs font-display font-bold uppercase tracking-wider border-b border-[#EAE7E0]">
                <th className="px-4 sm:px-6 py-3">Personnel Name</th>
                <th className="px-4 sm:px-6 py-3">Email Address</th>
                <th className="px-4 sm:px-6 py-3">Role Designation</th>
                <th className="px-4 sm:px-6 py-3">Department</th>
                <th className="px-4 sm:px-6 py-3">Office Branch</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAE7E0] text-xs sm:text-sm">
              {employees.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-[#6B655C] text-xs font-bold">
                    No active personnel found in workspace directory.
                  </td>
                </tr>
              ) : (
                employees.map(emp => (
                  <tr key={emp.id} className="hover:bg-[#FAF8F5] transition-colors">
                    <td className="px-4 sm:px-6 py-3.5 font-bold text-[#1F2B4D]">
                      {emp.displayName || 'Unnamed'}
                    </td>
                    <td className="px-4 sm:px-6 py-3.5 text-[#6B655C] font-mono text-xs font-medium">
                      {emp.email}
                    </td>
                    <td className="px-4 sm:px-6 py-3.5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FAF8F5] text-[#1F2B4D] border border-[#EAE7E0] text-xs font-bold">
                        <Shield size={12} /> {emp.roleDefinition?.name || 'NIL'}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-3.5 text-[#6B655C] font-semibold">
                      {emp.department || 'NIL'}
                    </td>
                    <td className="px-4 sm:px-6 py-3.5 text-[#6B655C] font-semibold">
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
