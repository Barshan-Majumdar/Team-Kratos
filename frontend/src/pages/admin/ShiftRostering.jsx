import React, { useState, useEffect } from 'react';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { CalendarDays, Clock, Plus, ChevronLeft, ChevronRight, User as UserIcon, RotateCcw, AlertTriangle, X, Wand2 } from 'lucide-react';

const ShiftRostering = ({ user }) => {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [employees, setEmployees] = useState([]);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [unresolvable, setUnresolvable] = useState([]);
  const [selectedCell, setSelectedCell] = useState(null);
  const [policies, setPolicies] = useState([]);
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [policyForm, setPolicyForm] = useState({
    name: '',
    startTime: '09:00',
    endTime: '17:00',
    gracePeriodMinutes: 15,
    breakDurationMinutes: 60,
    assignmentDays: '',
    color: '#1F2B4D'
  });
  const [submitting, setSubmitting] = useState(false);
  const [policyError, setPolicyError] = useState('');
  const [isSeedModalOpen, setIsSeedModalOpen] = useState(false);

  // Simulation State
  const [isSimulationModalOpen, setIsSimulationModalOpen] = useState(false);
  const [simulationData, setSimulationData] = useState(null);
  const [simulationError, setSimulationError] = useState('');

  const canManageRoster = user?.roleDefinition?.level !== 3;

  const daysOfWeek = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  const weekISO = format(currentWeekStart, 'yyyy-MM-dd');

  const fetchRoster = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const [rosterRes, policiesRes] = await Promise.all([
        fetch(`${apiBase}/api/shifts/engine/roster?weekISO=${weekISO}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${apiBase}/api/shifts/policies`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (rosterRes.ok) {
        const data = await rosterRes.json();
        setEmployees(data.employees || []);
        setSlots(data.slots || []);
      }
      if (policiesRes.ok) {
        const pData = await policiesRes.json();
        setPolicies(pData || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoster();
  }, [currentWeekStart]);

  const handleSimulateRoster = async () => {
    try {
      setProcessing(true);
      setSimulationError('');
      setUnresolvable([]);
      const token = localStorage.getItem('token');
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await fetch(`${apiBase}/api/shifts/engine/simulate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ weekISO })
      });
      const data = await res.json();
      if (res.ok) {
        setSimulationData(data.simulation);
        setIsSimulationModalOpen(true);
      } else {
        setSimulationError(data.error || 'Failed to simulate roster');
      }
    } catch (err) {
      console.error(err);
      setSimulationError('An unexpected error occurred');
    } finally {
      setProcessing(false);
    }
  };

  const handleApplyRoster = async () => {
    try {
      setProcessing(true);
      setSimulationError('');
      const token = localStorage.getItem('token');
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await fetch(`${apiBase}/api/shifts/engine/auto-assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ planId: simulationData.id })
      });
      const data = await res.json();
      
      if (res.ok) {
        setIsSimulationModalOpen(false);
        setSimulationData(null);
        await fetchRoster();
      } else {
        setSimulationError(data.error || 'Failed to apply roster');
      }
    } catch (err) {
      console.error(err);
      setSimulationError('An unexpected error occurred');
    } finally {
      setProcessing(false);
    }
  };

  const handleManualAssign = async (slotId, employeeId) => {
    try {
      const token = localStorage.getItem('token');
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await fetch(`${apiBase}/api/shifts/engine/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ slotId, employeeId })
      });
      if (res.ok) {
        setSelectedCell(null);
        await fetchRoster();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateSlot = async (dayDate, shiftType, startTime, endTime, assignmentDays = 1) => {
     try {
      const token = localStorage.getItem('token');
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await fetch(`${apiBase}/api/shifts/engine/slots`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          date: format(dayDate, 'yyyy-MM-dd'), 
          shiftType, 
          startTime, 
          endTime,
          assignmentDays // Dynamically from policy
        })
      });
      if (res.ok) {
        await fetchRoster();
      }
     } catch (err) {
       console.error(err);
     }
  };

  const handleSeedSpecificPolicy = async (pol) => {
    const input = await window.promptDialog(`How many employees do you need per day for the "${pol.name}" shift? (Max: ${employees.length})`, "1");
    if (input === null) return;
    
    const count = parseInt(input, 10);
    if (isNaN(count) || count < 1) {
      alert('Error: Please enter a valid positive number.');
      return;
    }
    if (count > employees.length) {
      alert(`Error: You only have ${employees.length} active employees. You cannot request ${count} people per day.`);
      return;
    }

    try {
      setProcessing(true);
      setIsSeedModalOpen(false);
      const token = localStorage.getItem('token');
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      
      // Loop over every day of the week and create `count` empty slots for the selected policy
      for (const day of daysOfWeek) {
        const dateStr = format(day, 'yyyy-MM-dd');
        
        const existingCount = slots.filter(s => 
          new Date(s.date).toISOString().split('T')[0] === dateStr && 
          s.shiftType === pol.name
        ).length;

        const needed = count - existingCount;

        for (let i = 0; i < needed; i++) {
          await fetch(`${apiBase}/api/shifts/engine/slots`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ 
              date: dateStr, 
              shiftType: pol.name, 
              startTime: pol.startTime, 
              endTime: pol.endTime 
            })
          });
        }
      }
      await fetchRoster();
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  const handleClearRoster = async () => {
    if (!(await window.confirmDialog("Are you sure you want to clear all slots and assignments?"))) return;
    try {
      setProcessing(true);
      const token = localStorage.getItem('token');
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      
      await fetch(`${apiBase}/api/shifts/engine/roster`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      await fetchRoster();
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteSlot = async (slotId) => {
    try {
      setProcessing(true);
      const token = localStorage.getItem('token');
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      await fetch(`${apiBase}/api/shifts/engine/slots/${slotId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setSelectedCell(null);
      await fetchRoster();
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  const handleUnassignShift = async (assignmentId) => {
    try {
      setProcessing(true);
      const token = localStorage.getItem('token');
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      await fetch(`${apiBase}/api/shifts/engine/assign/${assignmentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setSelectedCell(null);
      await fetchRoster();
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  const handleCreatePolicy = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setPolicyError('');

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/shifts/policies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(policyForm)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create shift policy');
      }

      setIsPolicyModalOpen(false);
      setPolicyForm({
        name: '',
        startTime: '09:00',
        endTime: '17:00',
        gracePeriodMinutes: 15,
        breakDurationMinutes: 60,
        assignmentDays: '',
        color: '#1F2B4D'
      });
      await fetchRoster();
    } catch (err) {
      setPolicyError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Build a lookup map for faster grid rendering
  const assignmentsByEmpAndDate = {};
  slots.forEach(slot => {
    slot.assignments.forEach(assignment => {
      const empId = assignment.employeeId;
      const dateStr = new Date(slot.date).toISOString().split('T')[0];
      if (!assignmentsByEmpAndDate[empId]) assignmentsByEmpAndDate[empId] = {};
      assignmentsByEmpAndDate[empId][dateStr] = { slot, assignment };
    });
  });

  return (
    <div className="p-3 sm:p-4 md:p-6 max-w-[1600px] mx-auto min-h-full flex flex-col gap-4 sm:gap-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-4 sm:pb-5 border-b border-[#EAE7E0] gap-4">
        <div>
          <h1 className="font-serif font-bold text-2xl sm:text-3xl md:text-4xl text-[#1F2B4D] tracking-tight leading-tight">
            Weekly Shift Engine
          </h1>
          <p className="text-xs sm:text-sm text-[#6B655C] mt-1 font-medium">
            Powered by deterministic 7-day rolling constraints.
          </p>
        </div>

        {/* Action Button Controls Grid */}
        {canManageRoster && (
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto">
            <button
              type="button"
              onClick={handleClearRoster}
              disabled={processing}
              className="flex-1 sm:flex-initial whitespace-nowrap justify-center bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 font-display font-bold px-3 sm:px-4 py-2.5 rounded-xl shadow-xs transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-1.5 text-xs disabled:opacity-50"
            >
              Clear Roster
            </button>
            <button
              type="button"
              onClick={() => setIsSeedModalOpen(true)}
              disabled={processing || policies.length === 0}
              className="flex-1 sm:flex-initial whitespace-nowrap justify-center bg-[#FAF8F5] hover:bg-[#F4F1EA] text-[#1F2B4D] border border-[#CBD5E1] font-display font-bold px-3 sm:px-4 py-2.5 rounded-xl shadow-xs transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-1.5 text-xs disabled:opacity-50"
            >
              <CalendarDays size={15} strokeWidth={2.5} className="shrink-0" />
              <span>Seed Slots</span>
            </button>
            <button
              type="button"
              onClick={() => setIsPolicyModalOpen(true)}
              className="flex-1 sm:flex-initial whitespace-nowrap justify-center bg-[#F0F3F9] hover:bg-[#E2E8F0] text-[#1F2B4D] border border-[#CBD5E1] font-display font-bold px-3 sm:px-4 py-2.5 rounded-xl shadow-xs transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-1.5 text-xs"
            >
              <Plus size={15} strokeWidth={2.5} className="shrink-0" />
              <span>Templates</span>
            </button>
            <button 
              type="button"
              onClick={handleSimulateRoster}
              disabled={processing}
              className="w-full sm:w-auto whitespace-nowrap justify-center bg-[#1F2B4D] hover:bg-[#151D36] text-white font-display font-bold px-4 sm:px-5 py-2.5 rounded-xl shadow-md transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-2 text-xs sm:text-sm disabled:opacity-50"
            >
              {processing ? <RotateCcw size={15} className="shrink-0 animate-spin" /> : <Wand2 size={15} className="shrink-0 text-amber-300" />}
              <span>{processing ? 'Simulating...' : 'Generate Optimal Roster'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Legend & Date Controls Bar */}
      <div className="p-2.5 sm:p-4 bg-[#FAF8F5] border border-[#EAE7E0] rounded-[20px] shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-4">
        <div className="flex items-center justify-between sm:justify-start gap-2.5 sm:gap-3.5 flex-wrap">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#1F2B4D] opacity-30 shrink-0"></span>
            <span className="text-[9px] sm:text-[11px] font-bold text-[#6B655C]">AUTO</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500 opacity-40 shrink-0"></span>
            <span className="text-[9px] sm:text-[11px] font-bold text-[#6B655C]">MANUAL</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500 opacity-40 shrink-0"></span>
            <span className="text-[9px] sm:text-[11px] font-bold text-[#6B655C]">UNRESOLVABLE</span>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-1 sm:gap-2 w-full sm:w-auto shrink-0">
          <button onClick={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))} className="bg-white hover:bg-[#FAF8F5] text-[#1F2B4D] border border-[#EAE7E0] font-display font-bold text-[10px] sm:text-xs rounded-xl px-2 py-1 sm:px-2.5 sm:py-1.5 shadow-xs transition-all shrink-0">
            Today
          </button>
          <button onClick={() => setCurrentWeekStart(addDays(currentWeekStart, -7))} className="p-1 sm:p-1.5 rounded-xl bg-white border border-[#EAE7E0] text-[#6B655C] hover:text-[#1F2B4D] shadow-xs shrink-0">
            <ChevronLeft size={14} />
          </button>
          <span className="text-[10px] sm:text-sm font-serif font-bold text-[#1F2B4D] text-center whitespace-nowrap px-1 flex-1 sm:flex-initial">
            {format(currentWeekStart, 'MMM d')} – {format(daysOfWeek[6], 'MMM d, yyyy')}
          </span>
          <button onClick={() => setCurrentWeekStart(addDays(currentWeekStart, 7))} className="p-1 sm:p-1.5 rounded-xl bg-white border border-[#EAE7E0] text-[#6B655C] hover:text-[#1F2B4D] shadow-xs shrink-0">
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Roster Main Table Grid - 100% Fit On Screen At Once (No Horizontal Sliding) */}
      <div className="border border-[#EAE7E0] rounded-[16px] sm:rounded-[20px] shadow-xs overflow-hidden bg-white w-full">
        <table className="w-full table-fixed text-left border-collapse">
          <thead>
            <tr className="bg-[#FAF8F5] border-b border-[#EAE7E0]">
              <th className="p-1 sm:p-2.5 md:p-3 w-[24%] sm:w-[20%] border-r border-[#EAE7E0] text-[8px] sm:text-[10px] font-display font-bold text-[#6B655C] uppercase leading-tight">
                Employee
              </th>
              {daysOfWeek.map((day, idx) => {
                const isToday = isSameDay(day, new Date());
                return (
                  <th key={idx} className={`p-0.5 sm:p-2 text-center border-r border-[#EAE7E0] last:border-r-0 w-[10.8%] sm:w-[11.4%] ${isToday ? 'bg-[#F0F3F9]' : ''}`}>
                    <div className="font-display uppercase tracking-wider text-[7.5px] sm:text-[10px] text-[#6B655C] leading-none">
                      <span className="sm:hidden">{format(day, 'EEEEEE')}</span>
                      <span className="hidden sm:inline">{format(day, 'EEE')}</span>
                    </div>
                    <div className="text-[8.5px] sm:text-xs font-serif font-bold text-[#1F2B4D] mt-0.5 leading-tight">
                      <span className="sm:hidden">{format(day, 'd')}</span>
                      <span className="hidden sm:inline">{format(day, 'MMM d')}</span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F4F1EA] text-sm">
            {/* Special Row: Unassigned Slots */}
            <tr className="bg-[#FAF8F5]/50 hover:bg-[#FAF8F5] transition-colors border-b-2 border-[#EAE7E0]">
              <td className="p-1 sm:p-2 border-r border-[#EAE7E0]">
                <div className="font-serif font-bold text-rose-700 text-[8.5px] sm:text-xs flex items-center gap-0.5 sm:gap-1 leading-tight">
                  <AlertTriangle size={10} className="shrink-0 text-rose-600 hidden sm:inline" />
                  <span className="truncate">Unassigned</span>
                </div>
                <div className="text-[7px] sm:text-[10px] font-medium text-[#6B655C] leading-tight truncate">Pending</div>
              </td>
              {daysOfWeek.map((day, dIdx) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const unassignedSlots = slots.filter(s => 
                  new Date(s.date).toISOString().split('T')[0] === dateStr && 
                  s.assignments.length === 0
                );

                return (
                  <td key={`unassigned-${dIdx}`} className={`p-0.5 sm:p-1.5 border-r border-[#EAE7E0] last:border-r-0 text-center relative transition-colors ${canManageRoster ? 'hover:bg-[#F4F1EA] cursor-pointer' : ''}`} onClick={canManageRoster ? () => setSelectedCell({ day, dateStr, emp: null, isUnassignedRow: true }) : undefined}>
                    <div className="flex flex-col gap-0.5 max-w-full overflow-hidden">
                      {Object.entries(
                        unassignedSlots.reduce((acc, slot) => {
                          acc[slot.shiftType] = acc[slot.shiftType] || { count: 0, slot };
                          acc[slot.shiftType].count++;
                          return acc;
                        }, {})
                      ).map(([shiftType, data], sIdx) => (
                        <div 
                          key={sIdx}
                          className="p-0.5 rounded border border-dashed border-rose-300 bg-rose-50 text-rose-700 flex flex-col items-center justify-center transition-all hover:border-rose-400 max-w-full overflow-hidden"
                          title="Click to manage slot"
                        >
                          <span className="text-[7.5px] sm:text-[10px] font-bold leading-none truncate max-w-full">
                            {data.count > 1 ? `${data.count}× ` : ''}{shiftType}
                          </span>
                          <span className="text-[6.5px] sm:text-[9px] font-medium opacity-80 leading-none truncate max-w-full hidden min-[360px]:block">{data.slot.startTime}-{data.slot.endTime}</span>
                        </div>
                      ))}
                      {unassignedSlots.length === 0 && (
                        <span className="text-[7px] sm:text-[10px] text-emerald-600 font-semibold tracking-tight block leading-none truncate max-w-full text-center py-0.5">
                          <span className="min-[380px]:hidden">✓</span>
                          <span className="hidden min-[380px]:inline">Covered</span>
                        </span>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>

            {employees.length === 0 && !loading && (
              <tr><td colSpan={8} className="p-6 text-center text-slate-400 font-medium text-xs sm:text-sm">No employees found.</td></tr>
            )}
            {employees.map(emp => (
              <tr key={emp.id} className="hover:bg-[#FAF9F6]/80 transition-colors">
                <td className="p-1 sm:p-2 border-r border-[#EAE7E0] max-w-0">
                  <div className="font-serif font-bold text-[#1F2B4D] text-[8.5px] sm:text-xs leading-tight truncate">{emp.displayName}</div>
                  <div className="text-[7px] sm:text-[10px] font-medium text-[#6B655C] leading-tight truncate">{emp.department || 'General'}</div>
                </td>
                {daysOfWeek.map((day, dIdx) => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const match = assignmentsByEmpAndDate[emp.id]?.[dateStr];
                  const unresolvableSlot = slots.find(s => new Date(s.date).toISOString().split('T')[0] === dateStr && unresolvable.includes(s.id));

                  // Determine if this is a continuation of the same shift block
                  let isContinuation = false;
                  if (match && dIdx > 0) {
                    const prevDateStr = format(daysOfWeek[dIdx - 1], 'yyyy-MM-dd');
                    const prevMatch = assignmentsByEmpAndDate[emp.id]?.[prevDateStr];
                    if (prevMatch && prevMatch.slot.shiftType === match.slot.shiftType) {
                      isContinuation = true;
                    }
                  }

                  return (
                    <td key={dIdx} className="p-0 sm:p-0 border-r border-[#EAE7E0] last:border-r-0 text-center relative max-w-0 h-full">
                      {match ? (
                        <div className="w-full h-full p-0.5 sm:p-1.5 flex items-center justify-center relative">
                          {isContinuation ? (
                            /* CONTINUATION: Dotted connecting bar */
                            <div 
                              className="w-full h-4 sm:h-6 border-y-2 border-dashed border-[#DCD6CA] bg-[#F4F1EA]/50 absolute left-0 right-0 z-0 select-none flex items-center justify-center"
                              title={`Continuing shift: ${match.slot.shiftType} (${match.slot.startTime}–${match.slot.endTime})`}
                            >
                              <span className="text-[6px] sm:text-[8px] font-bold text-[#6B655C] tracking-widest opacity-40 uppercase">CONTINUING</span>
                            </div>
                          ) : (
                            /* START BLOCK: Solid prominent block */
                            <div 
                              className={`w-full p-0.5 sm:p-1.5 rounded sm:rounded-xl border flex flex-col items-center justify-center gap-0.5 transition-all max-w-full overflow-hidden relative select-none cursor-default z-10 shadow-xs ${
                                match.assignment.mode === 'AUTO' 
                                  ? 'bg-[#F4F1EA] border-[#EAE7E0] text-[#1F2B4D]' 
                                  : 'bg-blue-50 border-blue-200 text-blue-800'
                              }`}
                              title={`Shift locked: ${match.slot.shiftType} (${match.slot.startTime}–${match.slot.endTime})`}
                            >
                              <span className="absolute top-0.5 left-0.5 text-[6px] sm:text-[7px] bg-black/10 px-1 py-0.5 rounded font-bold tracking-wider hidden min-[360px]:flex items-center gap-0.5">
                                🔒 LCK
                              </span>
                              
                              <span className="text-[7.5px] min-[360px]:text-[8.5px] sm:text-xs font-bold leading-none truncate max-w-full mt-2 sm:mt-3">{match.slot.shiftType}</span>
                              <span className="text-[6.5px] sm:text-[9.5px] font-medium opacity-80 leading-none truncate max-w-full hidden min-[360px]:block">{match.slot.startTime}-{match.slot.endTime}</span>
                              <span className="text-[6px] sm:text-[8px] font-display font-bold uppercase tracking-widest opacity-50 hidden sm:block">{match.assignment.mode}</span>
                            </div>
                          )}
                          
                          {/* Remove button for managers (applies to both start and continuations) */}
                          {canManageRoster && (
                            <button
                              type="button"
                              title="Unassign this shift"
                              onClick={(e) => { e.stopPropagation(); handleUnassignShift(match.assignment.id); }}
                              className="absolute -top-1 -right-1 sm:top-1 sm:right-1 w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-rose-100 hover:bg-rose-500 hover:text-white text-rose-600 flex items-center justify-center transition-colors z-20"
                            >
                              <X size={10} className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
                            </button>
                          )}
                        </div>
                      ) : unresolvableSlot ? (
                        <div 
                          onClick={canManageRoster ? () => setSelectedCell({ emp, dateStr, day }) : undefined}
                          className={`p-0.5 sm:p-1.5 rounded bg-rose-50 border border-rose-200 text-rose-700 flex flex-col items-center justify-center gap-0.5 max-w-full overflow-hidden ${canManageRoster ? 'cursor-pointer' : ''}`}
                        >
                          <AlertTriangle size={10} className="shrink-0 hidden min-[360px]:inline" />
                          <span className="text-[7.5px] sm:text-[10px] font-bold leading-none truncate max-w-full">FAIL</span>
                        </div>
                      ) : (
                        <div 
                          onClick={canManageRoster ? () => setSelectedCell({ emp, dateStr, day }) : undefined}
                          className={`h-7 sm:h-10 border border-dashed border-transparent rounded flex items-center justify-center text-[#9A948A] transition-colors ${canManageRoster ? 'cursor-pointer group-hover:border-[#EAE7E0] hover:text-[#1F2B4D]' : ''}`}
                        >
                          <Plus size={10} className="opacity-0 group-hover:opacity-100 shrink-0" />
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Seed Specific Shift Modal */}
      {isSeedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1F2B4D]/20 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-sm overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200 border border-[#EAE7E0]">
            <div className="flex items-center justify-between p-5 border-b border-[#EAE7E0] bg-[#FAF8F5]">
              <h2 className="font-serif font-bold text-xl text-[#1F2B4D] tracking-tight">Select Shift to Seed</h2>
              <button onClick={() => setIsSeedModalOpen(false)} className="p-2 text-[#6B655C] hover:text-[#1F2B4D] hover:bg-[#EAE7E0] rounded-xl transition-colors">
                <span className="font-bold text-xl leading-none">&times;</span>
              </button>
            </div>
            <div className="p-5 space-y-2">
              <p className="text-xs text-[#6B655C] mb-4">Choose which shift template you want to populate on the calendar for this week.</p>
              {policies.map(pol => (
                <button
                  key={pol.id}
                  onClick={() => handleSeedSpecificPolicy(pol)}
                  className="w-full flex items-center justify-between p-4 rounded-xl border border-[#EAE7E0] hover:border-[#CBD5E1] hover:bg-[#FAF8F5] transition-all text-left"
                >
                  <div>
                    <div className="font-bold text-sm text-[#1F2B4D]">{pol.name}</div>
                    <div className="text-[10px] font-medium text-[#6B655C] mt-1">{pol.startTime} - {pol.endTime}</div>
                  </div>
                  <div className="w-3 h-3 rounded-full shadow-inner" style={{ backgroundColor: pol.color }}></div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Manual Override Modal */}
      {selectedCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1F2B4D]/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-sm overflow-hidden border border-[#EAE7E0]">
            <div className="p-5 border-b border-[#EAE7E0] bg-[#FAF8F5]">
              <h3 className="font-serif font-bold text-lg text-[#1F2B4D]">{selectedCell.isUnassignedRow ? 'Manage Unassigned Slots' : 'Manual Override'}</h3>
              <p className="text-xs text-[#6B655C]">{selectedCell.isUnassignedRow ? 'Unassigned Requirements' : selectedCell.emp?.displayName} • {format(selectedCell.day, 'MMM d, yyyy')}</p>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider">
                {selectedCell.isUnassignedRow ? 'Delete Slots:' : 'Select Slot to Assign:'}
              </p>
              
              {slots.filter(s => new Date(s.date).toISOString().split('T')[0] === selectedCell.dateStr).length === 0 && (
                <div className="text-xs text-[#6B655C] pb-2">No shift slots exist for this day. Need to initialize slots first.</div>
              )}

              {slots
                .filter(s => new Date(s.date).toISOString().split('T')[0] === selectedCell.dateStr)
                .map(slot => {
                  const assignment = slot.assignments.find(a => a.employeeId === selectedCell.emp?.id);
                  const isUnassigned = slot.assignments.length === 0;

                  return (
                    <div key={slot.id} className="w-full flex items-center justify-between p-3 rounded-xl border border-[#EAE7E0] hover:border-[#1F2B4D] hover:bg-[#F0F3F9] transition-colors">
                      <div 
                        className="flex-1 cursor-pointer"
                        onClick={() => {
                          if (!selectedCell.isUnassignedRow && !assignment) {
                            handleManualAssign(slot.id, selectedCell.emp.id);
                          }
                        }}
                      >
                        <div className="font-bold text-[#1F2B4D] text-sm">{slot.shiftType}</div>
                        <div className="text-xs text-[#6B655C]">{slot.startTime} – {slot.endTime}</div>
                      </div>
                      
                      {assignment && !selectedCell.isUnassignedRow && (
                        <button
                          onClick={() => handleUnassignShift(assignment.id)}
                          className="px-3 py-1 bg-rose-100 text-rose-700 text-[10px] font-bold rounded-lg hover:bg-rose-200 transition-colors"
                        >
                          Unassign
                        </button>
                      )}
                      {(isUnassigned || selectedCell.isUnassignedRow) && (
                        <button
                          onClick={() => handleDeleteSlot(slot.id)}
                          className="px-3 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-lg hover:bg-slate-200 transition-colors"
                        >
                          Delete Slot
                        </button>
                      )}
                    </div>
                  );
              })}

              <div className="pt-4 border-t border-[#EAE7E0]">
                <p className="text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider mb-2">Create New Slot for this Day:</p>
                <div className="flex flex-wrap gap-2">
                  {policies.map(pol => (
                    <button 
                      key={pol.id}
                      onClick={() => handleCreateSlot(selectedCell.day, pol.name, pol.startTime, pol.endTime, pol.assignmentDays)} 
                      className="flex-1 min-w-[80px] py-2 text-[10px] font-bold rounded-lg text-white shadow-xs transition-transform hover:scale-[1.02]"
                      style={{ backgroundColor: pol.color }}
                      title={pol.assignmentDays > 1 ? `Creates a ${pol.assignmentDays}-day shift block` : 'Single day shift'}
                    >
                      {pol.name.toUpperCase()}
                      {pol.assignmentDays > 1 && <span className="ml-1 opacity-70">({pol.assignmentDays}d)</span>}
                    </button>
                  ))}
                  {policies.length === 0 && (
                    <div className="text-xs text-[#6B655C] italic">No shift templates found. Create one first.</div>
                  )}
                </div>
              </div>
            </div>
            <div className="p-3 border-t border-[#EAE7E0] bg-[#FAF8F5] text-right">
              <button onClick={() => setSelectedCell(null)} className="px-4 py-2 text-xs font-bold text-[#6B655C] hover:bg-[#EAE7E0] rounded-xl transition-colors">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Policy Builder Modal */}
      {isPolicyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1F2B4D]/30 backdrop-blur-sm p-3 sm:p-4">
          <div className="bg-white rounded-[20px] sm:rounded-[24px] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200 border border-[#EAE7E0]">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#EAE7E0] bg-[#FAF8F5]">
              <h2 className="font-serif font-bold text-lg sm:text-xl text-[#1F2B4D] tracking-tight">
                Create Shift Policy Template
              </h2>
              <button 
                type="button"
                onClick={() => setIsPolicyModalOpen(false)} 
                className="p-1.5 text-[#6B655C] hover:text-[#1F2B4D] hover:bg-[#EAE7E0] rounded-xl transition-colors shrink-0"
              >
                <AlertTriangle size={18} className="opacity-0 hidden" />
                <span className="font-bold text-xl leading-none">&times;</span>
              </button>
            </div>

            <form onSubmit={handleCreatePolicy} className="p-4 sm:p-5 border-b border-[#EAE7E0] bg-[#FAF8F5]/50 overflow-y-auto space-y-3 sm:space-y-4">
              {policyError && (
                <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200 flex items-center gap-2 font-medium">
                  {policyError}
                </div>
              )}

              <div>
                <label className="block text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider mb-1">Shift Name</label>
                <input 
                  type="text"
                  value={policyForm.name} 
                  onChange={e => setPolicyForm({ ...policyForm, name: e.target.value })} 
                  placeholder="e.g. Morning Shift, Night Shift"
                  className="w-full bg-white border border-[#EAE7E0] rounded-xl px-3 py-2 text-xs sm:text-sm text-[#1F2B4D] focus:outline-none focus:ring-2 focus:ring-[#1F2B4D]/20 transition-all"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider mb-1">Start Time (24h)</label>
                  <input 
                    type="time" 
                    value={policyForm.startTime} 
                    onChange={e => setPolicyForm({ ...policyForm, startTime: e.target.value })} 
                    className="w-full bg-white border border-[#EAE7E0] rounded-xl px-3 py-2 text-xs sm:text-sm text-[#1F2B4D] focus:outline-none focus:ring-2 focus:ring-[#1F2B4D]/20 transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider mb-1">End Time (24h)</label>
                  <input 
                    type="time" 
                    value={policyForm.endTime} 
                    onChange={e => setPolicyForm({ ...policyForm, endTime: e.target.value })} 
                    className="w-full bg-white border border-[#EAE7E0] rounded-xl px-3 py-2 text-xs sm:text-sm text-[#1F2B4D] focus:outline-none focus:ring-2 focus:ring-[#1F2B4D]/20 transition-all"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider mb-1">Grace Period (mins)</label>
                  <input 
                    type="number" 
                    min={0}
                    value={policyForm.gracePeriodMinutes} 
                    onChange={e => setPolicyForm({ ...policyForm, gracePeriodMinutes: parseInt(e.target.value) || 0 })} 
                    className="w-full bg-white border border-[#EAE7E0] rounded-xl px-3 py-2 text-xs sm:text-sm text-[#1F2B4D] focus:outline-none focus:ring-2 focus:ring-[#1F2B4D]/20 transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider mb-1">Break Duration (mins)</label>
                  <input 
                    type="number" 
                    min={0}
                    value={policyForm.breakDurationMinutes} 
                    onChange={e => setPolicyForm({ ...policyForm, breakDurationMinutes: parseInt(e.target.value) || 0 })} 
                    className="w-full bg-white border border-[#EAE7E0] rounded-xl px-3 py-2 text-xs sm:text-sm text-[#1F2B4D] focus:outline-none focus:ring-2 focus:ring-[#1F2B4D]/20 transition-all"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider mb-1">Assignment Duration (Days)</label>
                  <input 
                    type="number" 
                    min={1}
                    value={policyForm.assignmentDays} 
                    onChange={e => setPolicyForm({ ...policyForm, assignmentDays: e.target.value ? parseInt(e.target.value) : '' })} 
                    placeholder="e.g. 7 (Default: Infinite)"
                    className="w-full bg-white border border-[#EAE7E0] rounded-xl px-3 py-2 text-xs sm:text-sm text-[#1F2B4D] focus:outline-none focus:ring-2 focus:ring-[#1F2B4D]/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider mb-1">Badge Color</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="color" 
                      value={policyForm.color} 
                      onChange={e => setPolicyForm({ ...policyForm, color: e.target.value })} 
                      className="w-9 h-9 rounded-xl border border-[#EAE7E0] cursor-pointer p-0.5 bg-white shrink-0"
                    />
                    <input 
                      type="text"
                      value={policyForm.color} 
                      onChange={e => setPolicyForm({ ...policyForm, color: e.target.value })} 
                      placeholder="#1F2B4D"
                      className="font-mono text-xs w-full bg-white border border-[#EAE7E0] rounded-xl px-3 py-2 text-[#1F2B4D] focus:outline-none min-w-0"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button 
                  type="submit" 
                  disabled={submitting} 
                  className="bg-[#F0F3F9] hover:bg-[#E2E8F0] text-[#1F2B4D] border border-[#CBD5E1] font-display font-bold text-xs px-5 py-2.5 rounded-xl shadow-xs transition-all hover:scale-[1.01] active:scale-95 w-full"
                >
                  {submitting ? 'Creating...' : 'Create New Template'}
                </button>
              </div>
            </form>

            <div className="p-4 sm:p-5 overflow-y-auto bg-white">
              <h3 className="text-xs font-display font-bold text-[#6B655C] uppercase tracking-wider mb-2.5">Existing Templates</h3>
              {policies.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No shift templates created yet.</p>
              ) : (
                <div className="space-y-2">
                  {policies.map(pol => (
                    <div key={pol.id} className="flex items-center justify-between p-3 rounded-xl border border-[#EAE7E0] bg-[#FAF8F5]">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: pol.color }}></div>
                        <div className="min-w-0">
                          <div className="font-bold text-xs sm:text-sm text-[#1F2B4D] truncate">{pol.name}</div>
                          <div className="text-[10px] text-[#6B655C] font-medium truncate">
                            {pol.startTime} - {pol.endTime} • {pol.assignmentDays ? `${pol.assignmentDays} Days` : 'Infinite'}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const token = localStorage.getItem('token');
                            const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000';
                            await fetch(`${apiBase}/api/shifts/policies/${pol.id}`, {
                              method: 'DELETE',
                              headers: { 'Authorization': `Bearer ${token}` }
                            });
                            fetchRoster();
                          } catch (err) {}
                        }}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Simulation Modal */}
      {isSimulationModalOpen && simulationData && (
        <div className="fixed inset-0 bg-[#1F2B4D]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#FAF8F5] rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-[#EAE7E0]">
            <div className="p-5 sm:p-6 bg-white border-b border-[#EAE7E0] flex justify-between items-center">
              <div>
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#1F2B4D] flex items-center gap-2">
                  <Wand2 size={24} className="text-amber-500" />
                  Proposed Optimal Roster
                </h2>
                <p className="text-xs text-[#6B655C] mt-1">Review the AI-generated schedule changes before applying.</p>
              </div>
              <button 
                onClick={() => setIsSimulationModalOpen(false)} 
                className="p-2 hover:bg-[#F4F1EA] rounded-full text-[#6B655C] transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 sm:p-6 overflow-y-auto flex-1 flex flex-col gap-6">
              {simulationError && (
                <div className="bg-rose-50 text-rose-700 p-3 rounded-xl text-xs sm:text-sm border border-rose-200">
                  {simulationError}
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Current Metrics */}
                <div className="bg-white p-4 rounded-2xl border border-[#EAE7E0] shadow-xs">
                  <h3 className="text-xs font-display font-bold text-slate-400 uppercase tracking-wider mb-4">Current Roster</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#6B655C] font-medium">Coverage</span>
                      <span className="font-bold text-[#1F2B4D]">{simulationData.metrics.current.coverage}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#6B655C] font-medium">Overtime</span>
                      <span className="font-bold text-[#1F2B4D]">{simulationData.metrics.current.overtime}h</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#6B655C] font-medium">Rest Violations</span>
                      <span className="font-bold text-[#1F2B4D]">{simulationData.metrics.current.restViolations}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-[#F4F1EA]">
                      <span className="text-sm text-rose-600 font-bold">Understaffed Shifts</span>
                      <span className="font-bold text-rose-600">{simulationData.metrics.current.understaffed}</span>
                    </div>
                  </div>
                </div>

                {/* Proposed Metrics */}
                <div className="bg-[#1F2B4D] p-4 rounded-2xl border border-[#1F2B4D] shadow-xs relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-500/20 to-transparent rounded-bl-full pointer-events-none"></div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-4 relative z-10">
                      <h3 className="text-xs font-display font-bold text-amber-300 uppercase tracking-wider">Proposed</h3>
                      <div className="flex items-center gap-2 bg-black/20 px-2 py-1 rounded-lg">
                        <span className="text-[10px] text-slate-300 font-medium">Quality Score</span>
                        <span className="text-sm font-bold text-amber-400">{simulationData.metrics.proposed.qualityScore}/100</span>
                      </div>
                    </div>
                    
                    <div className="space-y-3 relative z-10">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-300 font-medium">Coverage</span>
                        <span className="font-bold text-emerald-400">{simulationData.metrics.proposed.coverage}%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-300 font-medium">Overtime</span>
                        <span className="font-bold text-emerald-400">{simulationData.metrics.proposed.overtime}h</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-300 font-medium">Rest Violations</span>
                        <span className="font-bold text-emerald-400">{simulationData.metrics.proposed.restViolations}</span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-slate-700/50">
                        <span className="text-sm text-rose-300 font-bold">Understaffed Shifts</span>
                        <span className="font-bold text-rose-300">{simulationData.metrics.proposed.understaffed}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Detailed Scores Mini-Bar */}
                  <div className="mt-4 pt-3 border-t border-slate-700/50 relative z-10 grid grid-cols-2 gap-x-2 gap-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] text-slate-400 uppercase">Skill Match</span>
                      <span className="text-[10px] font-bold text-emerald-400">{simulationData.metrics.proposed.details.skillCoverage}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] text-slate-400 uppercase">Rest Comp.</span>
                      <span className="text-[10px] font-bold text-emerald-400">{simulationData.metrics.proposed.details.restCompliance}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] text-slate-400 uppercase">Fairness</span>
                      <span className="text-[10px] font-bold text-amber-400">{simulationData.metrics.proposed.details.workloadFairness}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] text-slate-400 uppercase">Pref Match</span>
                      <span className="text-[10px] font-bold text-amber-400">{simulationData.metrics.proposed.details.preferenceMatch}%</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-serif font-bold text-[#1F2B4D] mb-3">Actionable Changes</h3>
                <div className="bg-white rounded-2xl border border-[#EAE7E0] overflow-hidden">
                  <div className="flex divide-x divide-[#EAE7E0] text-xs font-bold font-display text-[#6B655C] uppercase bg-[#FAF8F5]">
                    <div className="px-4 py-2 flex-1">Impact</div>
                    <div className="px-4 py-2 w-24 text-center">Stats</div>
                  </div>
                  <div className="divide-y divide-[#F4F1EA]">
                    <div className="flex divide-x divide-[#EAE7E0] p-3 text-sm hover:bg-[#FAF8F5] transition-colors">
                      <div className="flex-1 px-1 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        <span className="text-[#1F2B4D] font-medium">New Assignments Scheduled</span>
                      </div>
                      <div className="w-24 text-center font-bold text-[#1F2B4D]">{simulationData.metrics.proposed.assignmentsAdded}</div>
                    </div>
                    <div className="flex divide-x divide-[#EAE7E0] p-3 text-sm hover:bg-[#FAF8F5] transition-colors">
                      <div className="flex-1 px-1 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                        <span className="text-[#1F2B4D] font-medium">Shifts Remaining Unstaffed</span>
                      </div>
                      <div className="w-24 text-center font-bold text-rose-600">{simulationData.metrics.proposed.understaffed}</div>
                    </div>
                  </div>
                </div>
              </div>

              {simulationData.plan.filter(p => p.action === 'UNRESOLVED').length > 0 && (
                <div>
                  <h3 className="text-sm font-serif font-bold text-rose-700 mb-3 flex items-center gap-2">
                    <AlertTriangle size={16} /> Unresolvable Shifts
                  </h3>
                  <div className="space-y-2">
                    {simulationData.plan.filter(p => p.action === 'UNRESOLVED').map((p, idx) => (
                      <div key={idx} className="bg-rose-50 border border-rose-100 rounded-xl p-3 text-xs">
                        <div className="font-bold text-rose-800 mb-1">Slot ID: {p.slotId}</div>
                        <ul className="list-disc list-inside text-rose-600/80">
                          {p.reasons.map((r, i) => <li key={i}>{r}</li>)}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            <div className="p-4 sm:p-5 bg-white border-t border-[#EAE7E0] flex justify-end gap-3">
              <button 
                onClick={() => setIsSimulationModalOpen(false)}
                className="px-5 py-2.5 rounded-xl font-display font-bold text-sm text-[#6B655C] hover:bg-[#FAF8F5] transition-colors"
              >
                Discard
              </button>
              <button 
                onClick={handleApplyRoster}
                disabled={processing}
                className="px-6 py-2.5 rounded-xl font-display font-bold text-sm text-white bg-emerald-600 hover:bg-emerald-700 shadow-md transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 flex items-center gap-2"
              >
                {processing ? 'Applying...' : 'Apply Roster'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShiftRostering;
