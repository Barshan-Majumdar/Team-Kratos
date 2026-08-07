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
  Filter,
  Check,
  Sparkles,
  Building2
} from 'lucide-react';
import { API_BASE } from '../lib/api';
import { motion, AnimatePresence } from 'framer-motion';

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
        className="inline-flex items-center justify-between gap-2.5 px-4 py-2.5 rounded-xl bg-white border border-[#EAE7E0] text-[13px] font-medium text-[#1F2B4D] shadow-sm hover:bg-[#FAF8F5] transition-all"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-[#1F2B4D]" />
          <span className="text-[#6B655C]">{label}:</span>
          <span className="font-bold font-serif">{selectedOption?.label || selectedOption?.name}</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-[#9A948A] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.34, 1.56, 0.64, 1] }}
            role="listbox"
            className="absolute right-0 mt-2 w-64 rounded-2xl bg-white border border-[#EAE7E0] shadow-2xl z-50 py-2 overflow-hidden"
          >
            <div className="px-4 py-2 border-b border-[#F4F1EA] text-[10px] font-display font-bold text-[#9A948A] uppercase tracking-wider">
              {label} Selection
            </div>
            <div className="max-h-64 overflow-y-auto py-1 custom-scrollbar">
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
                    className={`w-full text-left px-4 py-2.5 text-[13px] flex items-center justify-between transition-colors ${
                      isSelected 
                        ? 'bg-[#F0F3F9] text-[#1F2B4D] font-bold' 
                        : 'text-[#1D1B16] hover:bg-[#FAF8F5] font-medium'
                    }`}
                  >
                    <span>{opt.label || opt.name}</span>
                    {isSelected && <Check className="w-4 h-4 text-[#1F2B4D]" />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Employee Inspection Drawer Component ---
const EmployeeDrawer = ({ employee, allEmployees, onClose }) => {
  if (!employee) return null;

  const manager = allEmployees.find(m => String(m.id) === String(employee.managerId));
  const directReports = allEmployees.filter(e => String(e.managerId) === String(employee.id));

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-[#1F2B4D]/30 backdrop-blur-sm">
      <motion.div 
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
        className="w-full max-w-md bg-[#FAF8F5] h-full border-l border-[#EAE7E0] shadow-2xl flex flex-col"
      >
        {/* Drawer Header */}
        <div className="p-6 bg-white border-b border-[#EAE7E0] flex items-center justify-between shrink-0">
          <h2 className="font-serif font-bold text-2xl text-[#1F2B4D]">Personnel File</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Inspection Drawer"
            className="w-10 h-10 rounded-full bg-[#FAF8F5] text-[#1F2B4D] border border-[#EAE7E0] flex items-center justify-center hover:bg-[#EAE7E0] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
          
          {/* Profile Card Summary (Doppelrand) */}
          <div className="bg-white border-[2px] border-[#EAE7E0] rounded-[24px] p-6 text-center flex flex-col items-center shadow-sm">
            <div className="w-20 h-20 rounded-full bg-[#1F2B4D] text-white flex items-center justify-center font-serif font-bold text-3xl mb-4 shadow-md border-4 border-white overflow-hidden">
              {employee.avatar ? (
                <img src={employee.avatar} alt={employee.displayName} className="w-full h-full object-cover rounded-full" />
              ) : (
                employee.displayName?.charAt(0) || 'U'
              )}
            </div>
            <h3 className="font-serif font-bold text-2xl text-[#1F2B4D]">{employee.displayName}</h3>
            <p className="text-xs font-display font-bold text-[#6B655C] uppercase tracking-wider mt-1.5">
              {employee.jobPosition || employee.role}
            </p>

            <div className="mt-5 flex items-center gap-2 flex-wrap justify-center">
              {employee.department && (
                <span className="px-3.5 py-1.5 rounded-xl bg-white text-[#1F2B4D] border border-[#EAE7E0] text-[10px] font-display font-bold uppercase tracking-wider shadow-2xs">
                  {employee.department}
                </span>
              )}
              {employee.role === 'CEO' || employee.role === 'SuperAdmin' || !employee.managerId ? (
                <span className="px-3.5 py-1.5 rounded-xl bg-[#1F2B4D] text-white border border-[#141C33] text-[10px] font-display font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-2xs">
                  <Crown className="w-3.5 h-3.5 text-amber-400" /> Executive Board
                </span>
              ) : directReports.length > 0 ? (
                <span className="px-3.5 py-1.5 rounded-xl bg-[#F0F3F9] text-[#1F2B4D] border border-[#CBD5E1] text-[10px] font-display font-bold uppercase tracking-wider shadow-2xs">
                  Division Leader
                </span>
              ) : (
                <span className="px-3.5 py-1.5 rounded-xl bg-white text-[#6B655C] border border-[#EAE7E0] text-[10px] font-display font-bold uppercase tracking-wider shadow-2xs">
                  Specialist
                </span>
              )}
            </div>
          </div>

          {/* Details & Contacts */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-display font-bold uppercase tracking-wider text-[#9A948A] px-2">Corporate Metadata</h4>
            <div className="bg-white border border-[#EAE7E0] rounded-[20px] p-5 space-y-4 text-sm text-[#1F2B4D] shadow-xs">
              <div className="flex items-center justify-between border-b border-[#F4F1EA] pb-3">
                <span className="text-[#6B655C] flex items-center gap-2 font-medium">
                  <Mail className="w-4 h-4 text-[#1F2B4D]" /> Email Address
                </span>
                <span className="font-bold truncate max-w-[180px]" title={employee.email}>
                  {employee.email || 'N/A'}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-[#F4F1EA] pb-3">
                <span className="text-[#6B655C] flex items-center gap-2 font-medium">
                  <ShieldCheck className="w-4 h-4 text-[#1F2B4D]" /> System Role
                </span>
                <span className="font-bold">{employee.role || 'Member'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#6B655C] flex items-center gap-2 font-medium">
                  <Briefcase className="w-4 h-4 text-[#1F2B4D]" /> Line Manager
                </span>
                <span className="font-bold text-right">{manager ? manager.displayName : 'Executive Directorate'}</span>
              </div>
            </div>
          </div>

          {/* Direct Reports List */}
          <div className="space-y-3 pb-8">
            <h4 className="text-[10px] font-display font-bold uppercase tracking-wider text-[#9A948A] px-2 flex justify-between items-center">
              <span>Direct Subordinates</span>
              <span className="bg-[#EAE7E0] text-[#1F2B4D] px-2 py-0.5 rounded-full">{directReports.length}</span>
            </h4>
            {directReports.length === 0 ? (
              <div className="text-sm text-[#6B655C] italic bg-white p-6 rounded-[20px] border border-[#EAE7E0] text-center shadow-xs">
                No direct subordinates assigned to this personnel.
              </div>
            ) : (
              <div className="space-y-3">
                {directReports.map(rep => (
                  <div key={rep.id} className="p-4 bg-white border border-[#EAE7E0] rounded-[20px] flex items-center justify-between hover:border-[#CBD5E1] hover:shadow-sm transition-all group">
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-full bg-[#FAF8F5] text-[#1F2B4D] border border-[#EAE7E0] flex items-center justify-center font-serif font-bold text-sm shrink-0">
                        {rep.displayName?.charAt(0)}
                      </div>
                      <div>
                        <span className="font-serif font-bold text-[#1F2B4D] block text-base leading-tight group-hover:text-indigo-700 transition-colors">{rep.displayName}</span>
                        <span className="text-[11px] font-display font-bold uppercase tracking-wider text-[#9A948A] block mt-0.5">{rep.jobPosition || rep.department}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#9A948A] group-hover:translate-x-1 transition-transform" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
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
      { id: 'all', label: 'All Divisions' },
      { id: 'Executive Directorate & Board', label: 'Executive Directorate' },
      ...depts.map(d => ({ id: d, label: d }))
    ];
  }, [employees]);

  // Render Loading State
  if (loading) {
    return (
      <div className="p-4 md:p-8 max-w-[1400px] mx-auto min-h-screen space-y-8 animate-pulse bg-transparent">
        <div className="h-12 w-80 bg-white border border-[#EAE7E0] rounded-xl shadow-xs" />
        <div className="h-16 w-full bg-white border border-[#EAE7E0] rounded-2xl shadow-xs" />
        <div className="h-64 w-full bg-[#FAF8F5] rounded-[24px] border border-[#EAE7E0]" />
        <div className="h-64 w-full bg-[#FAF8F5] rounded-[24px] border border-[#EAE7E0]" />
      </div>
    );
  }

  // Render Error State
  if (error) {
    return (
      <div className="p-4 md:p-8 max-w-[1400px] mx-auto min-h-screen flex flex-col items-center justify-center bg-transparent">
        <div className="bg-white border-[2px] border-[#EAE7E0] rounded-[24px] p-10 max-w-md w-full text-center shadow-sm">
          <AlertCircle className="w-14 h-14 text-rose-600 mx-auto mb-5" />
          <h2 className="font-serif font-bold text-2xl text-[#1F2B4D] mb-2">Architecture Error</h2>
          <p className="text-sm text-[#6B655C] mb-8">{error}</p>
          <button
            type="button"
            onClick={fetchOrgData}
            className="px-6 py-3 rounded-xl bg-[#1F2B4D] text-white font-display font-bold text-sm hover:bg-[#141C33] transition-all shadow-md active:scale-95"
          >
            Reload Architecture
          </button>
        </div>
      </div>
    );
  }

  const totalFilteredCount = filteredDepartmentGroups.reduce((acc, [_, members]) => acc + members.length, 0);

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto min-h-screen space-y-8 bg-transparent">
      {/* ── HEADER BAR & METRICS ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 pb-5 border-b border-[#EAE7E0]">
        <div>
          <h1 className="font-serif font-bold text-3xl md:text-4xl text-[#1F2B4D] tracking-tight leading-none flex items-center gap-3">
            <Network className="text-[#1F2B4D]" size={32} /> Organization Architecture
          </h1>
          <p className="text-[#6B655C] mt-2 font-medium">
            Departmental divisions & personnel governance hierarchy.
          </p>
        </div>

        {/* Executive Summary Pills */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="px-4 py-2 rounded-xl bg-white border border-[#EAE7E0] font-display font-bold text-xs flex items-center gap-2 shadow-xs text-[#1F2B4D]">
            <Building2 className="w-4 h-4 text-[#9A948A]" />
            <span>Divisions: <span className="font-serif text-sm ml-1">{departmentGroups.length}</span></span>
          </div>
          <div className="px-4 py-2 rounded-xl bg-[#1F2B4D] text-white border border-[#141C33] font-display font-bold text-xs flex items-center gap-2 shadow-md">
            <Users className="w-4 h-4 text-slate-300" />
            <span>Personnel: <span className="font-serif text-sm ml-1">{employees.length}</span></span>
          </div>
        </div>
      </div>

      {/* ── CONTROL TOOLBAR ── */}
      <div className="p-4 bg-white border border-[#EAE7E0] rounded-[24px] shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-[#9A948A] absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search personnel, position, or division..."
            className="w-full pl-11 pr-10 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#EAE7E0] text-sm font-medium text-[#1F2B4D] placeholder-[#9A948A] focus:outline-none focus:ring-2 focus:ring-[#1F2B4D] focus:bg-white transition-all shadow-inner"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9A948A] hover:text-[#1F2B4D] bg-white p-1 rounded-md border border-[#EAE7E0] shadow-2xs transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Department Filter */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <FloatingFilterDropdown
            options={departmentOptions}
            selectedValue={departmentFilter}
            onSelect={setDepartmentFilter}
            label="Division Filter"
            icon={Filter}
          />
        </div>
      </div>

      {/* ── MAIN DEPARTMENT SECTIONS ── */}
      {totalFilteredCount === 0 ? (
        <div className="bg-[#FAF8F5] border-[2px] border-[#EAE7E0] rounded-[32px] p-16 text-center shadow-xs">
          <Users className="w-12 h-12 text-[#9A948A] mx-auto mb-4" />
          <h3 className="font-serif font-bold text-2xl text-[#1F2B4D]">No Personnel Located</h3>
          <p className="text-sm text-[#6B655C] mt-2 mb-6">No records match your active search and filter parameters.</p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setDepartmentFilter('all');
            }}
            className="px-6 py-2.5 rounded-xl bg-white text-[#1F2B4D] border border-[#EAE7E0] font-display font-bold text-sm hover:bg-[#F0F3F9] transition-colors shadow-sm"
          >
            Clear Active Filters
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {filteredDepartmentGroups.map(([deptName, deptMembers]) => {
            const isExecDept = deptName.includes('Executive');

            return (
              <div key={deptName} className={`bg-white border-[2px] border-[#EAE7E0] rounded-[32px] p-6 md:p-8 space-y-5 shadow-sm ${isExecDept ? 'bg-gradient-to-b from-[#FAF8F5] to-white' : ''}`}>
                
                {/* Division Title Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#F4F1EA]">
                  <div className="flex items-center gap-3.5">
                    <div className={`p-2.5 rounded-[14px] shadow-sm ${isExecDept ? 'bg-[#1F2B4D] text-amber-400 border border-[#141C33]' : 'bg-white text-[#1F2B4D] border border-[#EAE7E0]'}`}>
                      {isExecDept ? <Crown className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
                    </div>
                    <h2 className="font-serif font-bold text-2xl text-[#1F2B4D]">
                      {deptName}
                    </h2>
                  </div>
                  <span className={`px-3 py-1.5 rounded-xl text-[11px] font-display font-bold uppercase tracking-wider border shadow-2xs ${
                    isExecDept 
                      ? 'bg-[#1F2B4D] text-white border-[#141C33]' 
                      : 'bg-white text-[#1F2B4D] border-[#EAE7E0]'
                  }`}>
                    {deptMembers.length} Members
                  </span>
                </div>

                {/* Personnel Strips Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {deptMembers.map(emp => {
                    const directReportsCount = employees.filter(e => String(e.managerId) === String(emp.id)).length;
                    const manager = employees.find(m => String(m.id) === String(emp.managerId));

                    return (
                      <div
                        key={emp.id}
                        onClick={() => setSelectedEmployee(emp)}
                        className={`group p-4 rounded-[20px] border-2 transition-all duration-300 cursor-pointer flex items-center justify-between gap-4 shadow-2xs hover:shadow-md hover:-translate-y-0.5 bg-white ${
                          isExecDept ? 'border-[#EAE7E0] hover:border-[#1F2B4D]' : 'border-[#F4F1EA] hover:border-[#CBD5E1]'
                        }`}
                      >
                        {/* Left: Avatar & Data */}
                        <div className="flex items-center gap-4 min-w-0 flex-1">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center font-serif font-bold text-lg shrink-0 overflow-hidden shadow-sm ${
                            isExecDept ? 'bg-[#1F2B4D] text-white border-2 border-[#141C33]' : 'bg-[#FAF8F5] text-[#1F2B4D] border border-[#EAE7E0]'
                          }`}>
                            {emp.avatar ? (
                              <img src={emp.avatar} alt={emp.displayName} className="w-full h-full object-cover" />
                            ) : (
                              emp.displayName?.charAt(0) || 'U'
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-0.5">
                              <h4 className="font-serif font-bold text-lg text-[#1F2B4D] truncate leading-tight group-hover:text-indigo-700 transition-colors" title={emp.displayName}>
                                {emp.displayName}
                              </h4>
                              {isExecDept && <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" title="Executive Board" />}
                            </div>
                            <p className="text-[12px] font-display font-bold uppercase tracking-wider text-[#9A948A] truncate" title={emp.jobPosition || emp.role}>
                              {emp.jobPosition || emp.role}
                            </p>
                          </div>
                        </div>

                        {/* Middle: Reporting Manager Tag */}
                        {manager && !isExecDept && (
                          <div className="hidden xl:flex flex-col shrink-0 text-right pr-4 border-r border-[#EAE7E0]">
                            <span className="text-[9px] font-display font-bold text-[#9A948A] uppercase tracking-wider mb-0.5">Reports to</span>
                            <span className="text-xs font-serif font-bold text-[#1F2B4D] truncate max-w-[140px]" title={manager.displayName}>
                              {manager.displayName}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center gap-3 shrink-0">
                          {/* Subordinates Count Badge */}
                          {directReportsCount > 0 && (
                            <span className="px-3 py-1 rounded-xl bg-[#F0F3F9] text-[#1F2B4D] border border-[#CBD5E1] text-[10px] font-display font-bold uppercase tracking-wider shadow-2xs">
                              {directReportsCount} Team
                            </span>
                          )}
                          
                          {/* Action Chevron */}
                          <div className="w-8 h-8 rounded-full bg-[#FAF8F5] flex items-center justify-center border border-[#EAE7E0] group-hover:bg-[#1F2B4D] group-hover:border-[#1F2B4D] group-hover:text-white text-[#9A948A] transition-all">
                            <ChevronRight className="w-4 h-4" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── SIDE INSPECTION DRAWER ── */}
      <AnimatePresence>
        {selectedEmployee && (
          <EmployeeDrawer
            employee={selectedEmployee}
            allEmployees={employees}
            onClose={() => setSelectedEmployee(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default OrgChart;
