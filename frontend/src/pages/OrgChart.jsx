import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Network, 
  Users, 
  ChevronDown, 
  ChevronRight, 
  User, 
  Search, 
  X, 
  Crown, 
  Briefcase, 
  Mail, 
  ShieldCheck, 
  AlertCircle, 
  ChevronRight as ArrowRight,
  Filter,
  Check,
  Building,
  Layers,
  Sparkles,
  ArrowDown
} from 'lucide-react';
import { API_BASE } from '../lib/api';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

// --- Custom Floating Filter Dropdown Component ---
const FloatingFilterDropdown = ({ 
  options, 
  selectedValue, 
  onSelect, 
  label = "Filter",
  icon: Icon = Filter 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const selectedOption = options.find(opt => opt.id === selectedValue) || options[0];

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-800 shadow-xs hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F2B4D] focus-visible:ring-offset-1 transition-all"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-3.5 h-3.5 text-[#1F2B4D]" />
          <span className="text-slate-500 font-normal">{label}:</span>
          <span className="font-bold">{selectedOption?.label || selectedOption?.name}</span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div 
          role="listbox"
          className="absolute right-0 mt-1.5 w-60 rounded-[14px] bg-white border border-slate-200 shadow-[0_12px_32px_rgba(15,23,42,0.12)] backdrop-blur-md z-50 py-1.5 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="px-3 py-1.5 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {label} Selection
          </div>
          <div className="max-h-60 overflow-y-auto py-1">
            {options.map((opt) => {
              const isSelected = opt.id === selectedValue;
              return (
                <button
                  key={opt.id}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onSelect(opt.id);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors ${
                    isSelected ? 'bg-[#F0F3F9] text-[#1F2B4D] font-bold' : 'text-slate-800 hover:bg-slate-50 font-medium'
                  }`}
                >
                  <span>{opt.label || opt.name}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#1F2B4D]" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// --- Employee Inspection Drawer Component ---
const EmployeeDrawer = ({ employee, allEmployees, onClose }) => {
  if (!employee) return null;

  const manager = allEmployees.find(m => String(m.id) === String(employee.managerId));
  const directReports = allEmployees.filter(e => String(e.managerId) === String(employee.id));

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white h-full border-l border-[#EAE7E0] shadow-2xl flex flex-col overflow-y-auto animate-in slide-in-from-right duration-300">
        {/* Drawer Header */}
        <div className="p-5 bg-[#FAF8F5] border-b border-[#EAE7E0] flex items-center justify-between">
          <h2 className="font-serif font-bold text-xl text-[#1D1B16]">Governance Profile</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Inspection Drawer"
            className="p-1.5 rounded-xl text-[#6B655C] hover:bg-[#EAE7E0] hover:text-[#1D1B16] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profile Card Summary */}
        <div className="p-6 space-y-6 flex-1">
          <div className="bg-white border border-[#EAE7E0] rounded-[18px] p-5 text-center flex flex-col items-center shadow-xs">
            <div className="w-16 h-16 rounded-full bg-[#1F2B4D] text-white flex items-center justify-center font-serif font-bold text-2xl mb-3 shadow-md border-2 border-white overflow-hidden">
              {employee.avatar ? (
                <img src={employee.avatar} alt={employee.displayName} className="w-full h-full object-cover rounded-full" />
              ) : (
                employee.displayName?.charAt(0) || 'U'
              )}
            </div>
            <h3 className="font-serif font-bold text-xl text-[#1D1B16]">{employee.displayName}</h3>
            <p className="text-xs font-display font-bold text-[#1F2B4D] uppercase tracking-wider mt-1">{employee.jobPosition || employee.role}</p>

            <div className="mt-3.5 flex items-center gap-2 flex-wrap justify-center">
              {employee.department && (
                <span className="px-3 py-1 rounded-lg bg-[#FAF9F6] text-[#1D1B16] border border-[#EAE7E0] text-[10px] font-display font-bold uppercase tracking-wider">
                  {employee.department}
                </span>
              )}
              {employee.role === 'CEO' || employee.role === 'SuperAdmin' || !employee.managerId ? (
                <span className="px-3 py-1 rounded-lg bg-[#0F172A] text-white border border-slate-700 text-[10px] font-display font-bold uppercase tracking-wider flex items-center gap-1">
                  <Crown className="w-3 h-3 text-slate-300" /> Executive Directorate
                </span>
              ) : directReports.length > 0 ? (
                <span className="px-3 py-1 rounded-lg bg-[#F0F3F9] text-[#1F2B4D] border border-[#CBD5E1] text-[10px] font-display font-bold uppercase tracking-wider">
                  Division Director
                </span>
              ) : (
                <span className="px-3 py-1 rounded-lg bg-[#F4F1EA] text-[#6B655C] border border-[#EAE7E0] text-[10px] font-display font-bold uppercase tracking-wider">
                  Functional Specialist
                </span>
              )}
            </div>
          </div>

          {/* Details & Contacts */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-display font-bold uppercase tracking-wider text-[#9A948A]">Corporate Metadata</h4>
            <div className="bg-[#FAF8F5] border border-[#EAE7E0] rounded-xl p-4 space-y-3 text-xs text-[#1D1B16]">
              <div className="flex items-center justify-between">
                <span className="text-[#6B655C] flex items-center gap-2 font-medium">
                  <Mail className="w-4 h-4 text-[#1F2B4D]" /> Email:
                </span>
                <span className="font-bold truncate max-w-[200px]" title={employee.email}>
                  {employee.email || 'N/A'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#6B655C] flex items-center gap-2 font-medium">
                  <ShieldCheck className="w-4 h-4 text-[#1F2B4D]" /> System Role:
                </span>
                <span className="font-bold">{employee.role || 'Member'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#6B655C] flex items-center gap-2 font-medium">
                  <Briefcase className="w-4 h-4 text-[#1F2B4D]" /> Line Manager:
                </span>
                <span className="font-bold">{manager ? manager.displayName : 'Executive Directorate'}</span>
              </div>
            </div>
          </div>

          {/* Direct Reports List */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-display font-bold uppercase tracking-wider text-[#9A948A]">
              Direct Subordinates ({directReports.length})
            </h4>
            {directReports.length === 0 ? (
              <p className="text-xs text-[#6B655C] italic bg-[#FAF8F5] p-3 rounded-xl border border-[#EAE7E0]">
                No direct reporting subordinates assigned.
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {directReports.map(rep => (
                  <div key={rep.id} className="p-3 bg-[#FAF9F6] border border-[#EAE7E0] rounded-xl flex items-center justify-between text-xs hover:bg-white transition-colors">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-[#1F2B4D] text-white flex items-center justify-center font-serif font-bold text-xs">
                        {rep.displayName?.charAt(0)}
                      </div>
                      <div>
                        <span className="font-serif font-bold text-[#1D1B16] block leading-tight">{rep.displayName}</span>
                        <span className="text-[10px] font-medium text-[#6B655C]">{rep.jobPosition || rep.department}</span>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-[#9A948A]" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main Department-Divided Corporate Architecture Component ---
const OrgChart = () => {
  // State Definitions
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const shouldReduceMotion = useReducedMotion();

  // Fetch Org Hierarchy Data
  const fetchOrgData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/users/org-chart`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      setEmployees(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to load org hierarchy:", e);
      setError("Failed to load organization structure. Please verify network connection or permissions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrgData();
  }, []);

  // Department Grouping Logic (Executive Board + Departments Divided)
  const departmentGroups = useMemo(() => {
    const map = {};

    employees.forEach(emp => {
      const isExec = emp.role === 'CEO' || emp.role === 'SuperAdmin' || !emp.managerId;
      const deptName = isExec ? 'Executive Directorate & Board' : (emp.department || 'General Workforce');

      if (!map[deptName]) {
        map[deptName] = [];
      }
      map[deptName].push(emp);
    });

    // Ensure Executive Board comes first
    const entries = Object.entries(map).sort(([nameA], [nameB]) => {
      if (nameA.includes('Executive')) return -1;
      if (nameB.includes('Executive')) return 1;
      return nameA.localeCompare(nameB);
    });

    return entries;
  }, [employees]);

  // Apply Search and Department Dropdown Filters
  const filteredDepartmentGroups = useMemo(() => {
    return departmentGroups
      .map(([deptName, deptMembers]) => {
        const filteredMembers = deptMembers.filter(emp => {
          const matchesSearch = !searchQuery || 
            emp.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            emp.jobPosition?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            emp.department?.toLowerCase().includes(searchQuery.toLowerCase());

          const matchesDept = departmentFilter === 'all' || 
            deptName.toLowerCase() === departmentFilter.toLowerCase() ||
            emp.department?.toLowerCase() === departmentFilter.toLowerCase();

          return matchesSearch && matchesDept;
        });

        return [deptName, filteredMembers];
      })
      .filter(([_, members]) => members.length > 0);
  }, [departmentGroups, searchQuery, departmentFilter]);

  // Department Dropdown Options
  const departmentOptions = useMemo(() => {
    const depts = Array.from(new Set(employees.map(e => e.department).filter(Boolean)));
    return [
      { id: 'all', label: 'All Departments' },
      { id: 'Executive Directorate & Board', label: 'Executive Directorate' },
      ...depts.map(d => ({ id: d, label: d }))
    ];
  }, [employees]);

  // Render Loading State
  if (loading) {
    return (
      <div className="p-4 md:p-8 max-w-[1400px] mx-auto min-h-screen space-y-6 animate-pulse">
        <div className="h-10 w-72 bg-slate-200 rounded-xl" />
        <div className="h-12 w-full bg-slate-200 rounded-2xl" />
        <div className="h-44 w-full bg-slate-100 rounded-[20px] border border-slate-200" />
        <div className="h-60 w-full bg-slate-100 rounded-[20px] border border-slate-200" />
      </div>
    );
  }

  // Render Error State
  if (error) {
    return (
      <div className="p-4 md:p-8 max-w-[1400px] mx-auto min-h-screen flex flex-col items-center justify-center">
        <div className="bg-white border border-slate-200 rounded-[18px] p-8 max-w-md w-full text-center shadow-xs">
          <AlertCircle className="w-12 h-12 text-slate-700 mx-auto mb-4" />
          <h2 className="font-serif font-bold text-xl text-slate-900 mb-2">Error Loading Departmental Hierarchy</h2>
          <p className="text-xs text-slate-500 mb-6">{error}</p>
          <button
            type="button"
            onClick={fetchOrgData}
            className="px-5 py-2.5 rounded-xl bg-[#1F2B4D] text-white font-bold text-xs hover:bg-[#141C33] transition-colors"
          >
            Reload Architecture
          </button>
        </div>
      </div>
    );
  }

  const totalFilteredCount = filteredDepartmentGroups.reduce((acc, [_, members]) => acc + members.length, 0);

  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto min-h-screen space-y-6">
      {/* Header Bar & Metrics */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#EAE7E0]">
        <div>
          <h1 className="font-serif font-bold text-3xl md:text-4xl text-[#1D1B16] tracking-tight leading-none">
            Organization Architecture
          </h1>
          <p className="text-xs md:text-sm text-[#6B655C] mt-1.5 font-medium">
            Departmental Divisions & Personnel Governance Tree
          </p>
        </div>

        {/* Summary Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="px-3 py-1.5 rounded-xl bg-[#F0F3F9] text-[#1F2B4D] border border-[#CBD5E1] font-display font-bold text-xs flex items-center gap-1.5 shadow-xs">
            <Briefcase className="w-3.5 h-3.5 text-[#1F2B4D]" />
            <span>Divisions: <strong>{departmentGroups.length}</strong></span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-[#FAF8F5] text-[#1D1B16] border border-[#EAE7E0] font-display font-bold text-xs flex items-center gap-1.5 shadow-xs">
            <Users className="w-3.5 h-3.5 text-[#6B655C]" />
            <span>Personnel: <strong>{employees.length}</strong></span>
          </div>
        </div>
      </div>

      {/* Control Toolbar */}
      <div className="p-3.5 bg-white border border-[#EAE7E0] rounded-[18px] shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-[#9A948A] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search employee, position, department..."
            className="w-full pl-10 pr-9 py-2 rounded-xl bg-[#FAF9F6] border border-[#EAE7E0] text-xs font-medium text-[#1D1B16] placeholder-[#9A948A] focus:outline-none focus:ring-2 focus:ring-[#1F2B4D] focus:bg-white transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9A948A] hover:text-[#1D1B16]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Department Filter */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          <FloatingFilterDropdown
            options={departmentOptions}
            selectedValue={departmentFilter}
            onSelect={setDepartmentFilter}
            label="Department Division"
            icon={Filter}
          />
        </div>
      </div>

      {/* Main Department Divided Sections */}
      {totalFilteredCount === 0 ? (
        <div className="bg-white border border-[#EAE7E0] rounded-[18px] p-10 text-center shadow-xs">
          <Users className="w-10 h-10 text-[#9A948A] mx-auto mb-3" />
          <h3 className="font-serif font-bold text-base text-[#1D1B16]">No Personnel Located</h3>
          <p className="text-xs text-[#6B655C] mt-1 mb-4">No employees match your search or department filter.</p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setDepartmentFilter('all');
            }}
            className="px-4 py-2 rounded-xl bg-[#F0F3F9] text-[#1F2B4D] border border-[#CBD5E1] font-display font-bold text-xs hover:bg-[#E2E8F0] transition-colors"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredDepartmentGroups.map(([deptName, deptMembers]) => {
            const isExecDept = deptName.includes('Executive');

            return (
              <div key={deptName} className="bg-white border border-[#EAE7E0] rounded-[18px] p-5 space-y-3 shadow-xs">
                {/* Department Title Header */}
                <div className="flex items-center justify-between pb-3 border-b border-[#F4F1EA]">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-1.5 rounded-lg ${isExecDept ? 'bg-[#0F172A] text-white' : 'bg-[#F0F3F9] text-[#1F2B4D] border border-[#D0D9E8]'}`}>
                      {isExecDept ? <Crown className="w-4 h-4 text-slate-300" /> : <Briefcase className="w-4 h-4" />}
                    </div>
                    <h2 className="font-serif font-bold text-lg text-[#1D1B16]">
                      {deptName}
                    </h2>
                  </div>
                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-display font-bold uppercase tracking-wider border ${
                    isExecDept 
                      ? 'bg-[#0F172A] text-white border-slate-700' 
                      : 'bg-[#F0F3F9] text-[#1F2B4D] border-[#CBD5E1]'
                  }`}>
                    {deptMembers.length} Members
                  </span>
                </div>

                {/* Compact Long Strips Stacked One by One */}
                <div className="space-y-2">
                  {deptMembers.map(emp => {
                    const isSelected = String(selectedEmployee?.id) === String(emp.id);
                    const directReportsCount = employees.filter(e => String(e.managerId) === String(emp.id)).length;
                    const manager = employees.find(m => String(m.id) === String(emp.managerId));

                    return (
                      <div
                        key={emp.id}
                        onClick={() => setSelectedEmployee(emp)}
                        className={`group p-2.5 sm:p-3 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected 
                            ? 'bg-[#F0F3F9] text-[#1F2B4D] border-[#1F2B4D] ring-1 ring-[#1F2B4D]' 
                            : 'bg-[#FAF9F6] hover:bg-white text-[#1D1B16] border-[#EAE7E0] hover:border-[#D8D4CA] hover:shadow-xs'
                        }`}
                      >
                        {/* Left: Compact Avatar & Metadata */}
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-serif font-bold text-xs shrink-0 overflow-hidden ${
                            isExecDept ? 'bg-[#0F172A] text-white border border-slate-700' : 'bg-[#1F2B4D] text-white'
                          }`}>
                            {emp.avatar ? (
                              <img src={emp.avatar} alt={emp.displayName} className="w-full h-full object-cover" />
                            ) : (
                              emp.displayName?.charAt(0) || 'U'
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <h4 className="font-serif font-semibold text-sm text-[#1D1B16] truncate leading-tight" title={emp.displayName}>
                                {emp.displayName}
                              </h4>
                              {isExecDept && <Crown className="w-3.5 h-3.5 text-[#0F172A] shrink-0" title="Executive Directorate" />}
                            </div>
                            <p className="text-xs font-medium text-[#6B655C] truncate mt-0.5" title={emp.jobPosition || emp.role}>
                              {emp.jobPosition || emp.role}
                            </p>
                          </div>
                        </div>

                        {/* Middle: Reporting Manager Tag */}
                        {manager && !isExecDept && (
                          <div className="hidden md:block shrink-0 text-right">
                            <span className="text-[10px] font-display text-[#9A948A] uppercase tracking-wider block">Reports to</span>
                            <span className="text-xs font-bold text-[#1D1B16] truncate max-w-[130px] block" title={manager.displayName}>
                              {manager.displayName}
                            </span>
                          </div>
                        )}

                        {/* Middle-Right: Subordinates Count Badge */}
                        {directReportsCount > 0 && (
                          <span className="px-2.5 py-0.5 rounded-lg bg-[#F0F3F9] text-[#1F2B4D] border border-[#CBD5E1] text-[10px] font-display font-bold uppercase tracking-wider shrink-0">
                            {directReportsCount} Direct Reports
                          </span>
                        )}

                        {/* Right: Chevron Trigger */}
                        <ChevronRight className="w-4 h-4 text-[#9A948A] group-hover:text-[#1F2B4D] group-hover:translate-x-0.5 transition-all shrink-0" />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Side Inspection Drawer */}
      <EmployeeDrawer
        employee={selectedEmployee}
        allEmployees={employees}
        onClose={() => setSelectedEmployee(null)}
      />
    </div>
  );
};

export default OrgChart;
