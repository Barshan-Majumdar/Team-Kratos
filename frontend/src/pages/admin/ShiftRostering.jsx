import React, { useState, useEffect } from 'react';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { CalendarDays, Clock, Plus, ChevronLeft, ChevronRight, User as UserIcon, RotateCcw, AlertTriangle } from 'lucide-react';

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

  const handleAutoAssign = async () => {
    try {
      setProcessing(true);
      setUnresolvable([]);
      const token = localStorage.getItem('token');
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await fetch(`${apiBase}/api/shifts/engine/auto-assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ weekISO })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.unresolvableSlots?.length > 0) {
          setUnresolvable(data.unresolvableSlots);
        }
        await fetchRoster();
      }
    } catch (err) {
      console.error(err);
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

  const handleCreateSlot = async (dayDate, shiftType, startTime, endTime) => {
     try {
      const token = localStorage.getItem('token');
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await fetch(`${apiBase}/api/shifts/engine/slots`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ date: format(dayDate, 'yyyy-MM-dd'), shiftType, startTime, endTime })
      });
      if (res.ok) {
        await fetchRoster();
      }
     } catch (err) {
       console.error(err);
     }
  };

  const handleSeedSpecificPolicy = async (pol) => {
    try {
      setProcessing(true);
      setIsSeedModalOpen(false);
      const token = localStorage.getItem('token');
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      
      // Loop over every day of the week and create 1 empty slot for the selected policy
      for (const day of daysOfWeek) {
        const dateStr = format(day, 'yyyy-MM-dd');
        const slotExists = slots.some(s => 
          new Date(s.date).toISOString().split('T')[0] === dateStr && 
          s.shiftType === pol.name
        );

        if (!slotExists) {
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
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto min-h-full flex flex-col gap-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-5 border-b border-[#EAE7E0] gap-4">
        <div>
          <h1 className="font-serif font-bold text-3xl md:text-4xl text-[#1F2B4D] tracking-tight leading-none">
            Weekly Shift Engine
          </h1>
          <p className="text-sm text-[#6B655C] mt-1.5 font-medium">
            Powered by deterministic 7-day rolling constraints.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleClearRoster}
            disabled={processing}
            className="bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 font-display font-bold px-4 py-2.5 rounded-xl shadow-xs transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-1.5 text-xs disabled:opacity-50"
          >
            Clear Roster
          </button>
          <button
            type="button"
            onClick={() => setIsSeedModalOpen(true)}
            disabled={processing || policies.length === 0}
            className="bg-[#FAF8F5] hover:bg-[#F4F1EA] text-[#1F2B4D] border border-[#CBD5E1] font-display font-bold px-4 py-2.5 rounded-xl shadow-xs transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-1.5 text-xs disabled:opacity-50"
          >
            <CalendarDays size={16} strokeWidth={2.5} /> Seed Empty Slots
          </button>
          <button
            type="button"
            onClick={() => setIsPolicyModalOpen(true)}
            className="bg-[#F0F3F9] hover:bg-[#E2E8F0] text-[#1F2B4D] border border-[#CBD5E1] font-display font-bold px-4 py-2.5 rounded-xl shadow-xs transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-1.5 text-xs"
          >
            <Plus size={16} strokeWidth={2.5} /> Shift Templates
          </button>
           <button 
            type="button"
            onClick={handleAutoAssign}
            disabled={processing}
            className="bg-[#1F2B4D] hover:bg-[#151D36] text-white font-display font-bold px-5 py-2.5 rounded-xl shadow-md transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-2 text-sm disabled:opacity-50"
          >
            <RotateCcw size={16} className={processing ? 'animate-spin' : ''} /> 
            {processing ? 'Running Engine...' : 'Auto-Assign Unassigned Slots'}
          </button>
        </div>
      </div>

      <div className="p-4 bg-[#FAF8F5] border border-[#EAE7E0] rounded-[20px] shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#1F2B4D] opacity-10"></span>
            <span className="text-xs font-bold text-[#6B655C]">AUTO</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500 opacity-20"></span>
            <span className="text-xs font-bold text-[#6B655C]">MANUAL</span>
          </div>
          <div className="flex items-center gap-2">
             <span className="w-3 h-3 rounded-full bg-rose-500 opacity-20"></span>
             <span className="text-xs font-bold text-[#6B655C]">UNRESOLVABLE</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))} className="bg-white hover:bg-[#FAF8F5] text-[#1F2B4D] border border-[#EAE7E0] font-display font-bold text-xs rounded-xl px-3 py-1.5 shadow-xs transition-all">
            Today
          </button>
          <button onClick={() => setCurrentWeekStart(addDays(currentWeekStart, -7))} className="p-1.5 rounded-xl bg-white border border-[#EAE7E0] text-[#6B655C] hover:text-[#1F2B4D] shadow-xs">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-serif font-bold text-[#1F2B4D] min-w-[160px] text-center">
            {format(currentWeekStart, 'MMM d')} – {format(daysOfWeek[6], 'MMM d, yyyy')}
          </span>
          <button onClick={() => setCurrentWeekStart(addDays(currentWeekStart, 7))} className="p-1.5 rounded-xl bg-white border border-[#EAE7E0] text-[#6B655C] hover:text-[#1F2B4D] shadow-xs">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="border border-[#EAE7E0] rounded-[20px] shadow-xs overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-[#FAF8F5] border-b border-[#EAE7E0]">
                <th className="p-4 w-[240px] sticky left-0 bg-[#FAF8F5] z-10 border-r border-[#EAE7E0] text-[10px] font-display font-bold text-[#6B655C] uppercase">
                  Employee
                </th>
                {daysOfWeek.map((day, idx) => {
                  const isToday = isSameDay(day, new Date());
                  return (
                    <th key={idx} className={`p-3 text-center border-r border-[#EAE7E0] ${isToday ? 'bg-[#F0F3F9]' : ''}`}>
                      <div className="font-display uppercase tracking-wider text-[10px] text-[#6B655C]">{format(day, 'EEE')}</div>
                      <div className="text-xs font-serif font-bold text-[#1F2B4D] mt-0.5">{format(day, 'MMM d')}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4F1EA] text-sm">
              {/* Special Row: Unassigned Slots */}
              <tr className="bg-[#FAF8F5]/50 hover:bg-[#FAF8F5] transition-colors border-b-2 border-[#EAE7E0]">
                <td className="p-3 sticky left-0 bg-[#FAF8F5] z-10 border-r border-[#EAE7E0] shadow-xs">
                  <div className="font-serif font-bold text-rose-700 text-sm flex items-center gap-2">
                    <AlertTriangle size={14} /> Unassigned Slots
                  </div>
                  <div className="text-[10px] font-medium text-[#6B655C]">Pending coverage</div>
                </td>
                {daysOfWeek.map((day, dIdx) => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  // Find all unassigned slots for this day
                  const unassignedSlots = slots.filter(s => 
                    new Date(s.date).toISOString().split('T')[0] === dateStr && 
                    s.assignments.length === 0
                  );

                  return (
                    <td key={`unassigned-${dIdx}`} className="p-2 border-r border-[#EAE7E0] text-center relative hover:bg-[#F4F1EA] transition-colors cursor-pointer" onClick={() => setSelectedCell({ day, dateStr, emp: null, isUnassignedRow: true })}>
                      <div className="flex flex-col gap-1">
                        {unassignedSlots.map((slot, sIdx) => (
                          <div 
                            key={sIdx}
                            className="p-1.5 rounded-lg border border-dashed border-rose-300 bg-rose-50 text-rose-700 flex flex-col items-center justify-center transition-all hover:border-rose-400"
                            title="Click to manage slot"
                          >
                            <span className="text-[10px] font-bold">{slot.shiftType}</span>
                            <span className="text-[9px] font-medium opacity-80">{slot.startTime}-{slot.endTime}</span>
                          </div>
                        ))}
                        {unassignedSlots.length === 0 && (
                          <span className="text-[10px] text-slate-300 font-medium italic">Fully covered</span>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>

              {employees.length === 0 && !loading && (
                <tr><td colSpan={8} className="p-8 text-center text-slate-400 font-medium">No employees found.</td></tr>
              )}
              {employees.map(emp => (
                <tr key={emp.id} className="hover:bg-[#FAF9F6]/80 transition-colors">
                  <td className="p-3 sticky left-0 bg-white z-10 border-r border-[#EAE7E0] shadow-xs">
                    <div className="font-serif font-semibold text-[#1F2B4D] text-sm">{emp.displayName}</div>
                    <div className="text-[10px] font-medium text-[#6B655C]">{emp.department || 'General'}</div>
                  </td>
                  {daysOfWeek.map((day, dIdx) => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const match = assignmentsByEmpAndDate[emp.id]?.[dateStr];

                    // Find if there is an unresolvable slot on this day
                    const unresolvableSlot = slots.find(s => new Date(s.date).toISOString().split('T')[0] === dateStr && unresolvable.includes(s.id));

                    return (
                      <td key={dIdx} className="p-2 border-r border-[#EAE7E0] text-center relative group">
                        {match ? (
                          <div 
                            onClick={() => setSelectedCell({ emp, dateStr, day })}
                            className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 cursor-pointer transition-all hover:scale-[1.03] ${
                              match.assignment.mode === 'AUTO' 
                                ? 'bg-[#F4F1EA] border-[#EAE7E0] text-[#1F2B4D]' 
                                : 'bg-blue-50 border-blue-200 text-blue-800'
                            }`}
                          >
                            <span className="text-xs font-bold">{match.slot.shiftType}</span>
                            <span className="text-[10px] font-medium opacity-80">{match.slot.startTime}-{match.slot.endTime}</span>
                            <span className="text-[8px] font-display font-bold uppercase tracking-widest opacity-50">{match.assignment.mode}</span>
                          </div>
                        ) : unresolvableSlot ? (
                          <div 
                            onClick={() => setSelectedCell({ emp, dateStr, day })}
                            className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex flex-col items-center justify-center gap-1 cursor-pointer"
                          >
                            <AlertTriangle size={14} />
                            <span className="text-[10px] font-bold">UNRESOLVABLE</span>
                          </div>
                        ) : (
                          <div 
                            onClick={() => setSelectedCell({ emp, dateStr, day })}
                            className="h-12 border-2 border-dashed border-transparent group-hover:border-[#EAE7E0] rounded-xl flex items-center justify-center cursor-pointer text-[#9A948A] hover:text-[#1F2B4D] transition-colors"
                          >
                            <Plus size={16} className="opacity-0 group-hover:opacity-100" />
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
                      onClick={() => handleCreateSlot(selectedCell.day, pol.name, pol.startTime, pol.endTime)} 
                      className="flex-1 min-w-[80px] py-2 text-[10px] font-bold rounded-lg text-white shadow-xs transition-transform hover:scale-[1.02]"
                      style={{ backgroundColor: pol.color }}
                    >
                      {pol.name.toUpperCase()}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1F2B4D]/20 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200 border border-[#EAE7E0]">
            <div className="flex items-center justify-between p-5 border-b border-[#EAE7E0] bg-[#FAF8F5]">
              <h2 className="font-serif font-bold text-xl text-[#1F2B4D] tracking-tight">
                Create Shift Policy Template
              </h2>
              <button 
                type="button"
                onClick={() => setIsPolicyModalOpen(false)} 
                className="p-2 text-[#6B655C] hover:text-[#1F2B4D] hover:bg-[#EAE7E0] rounded-xl transition-colors"
              >
                <AlertTriangle size={18} className="opacity-0 hidden" /> {/* Just to keep imports clean */}
                <span className="font-bold text-xl leading-none">&times;</span>
              </button>
            </div>

            <form onSubmit={handleCreatePolicy} className="p-5 border-b border-[#EAE7E0] bg-[#FAF8F5]/50">
              {policyError && (
                <div className="p-3 mb-4 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200 flex items-center gap-2 font-medium">
                  {policyError}
                </div>
              )}

              <div>
                <label className="block text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider mb-1.5">Shift Name</label>
                <input 
                  type="text"
                  value={policyForm.name} 
                  onChange={e => setPolicyForm({ ...policyForm, name: e.target.value })} 
                  placeholder="e.g. Morning Shift, Night Shift"
                  className="w-full bg-[#FAF8F5] border border-[#EAE7E0] rounded-xl px-3 py-2 text-sm text-[#1F2B4D] focus:outline-none focus:ring-2 focus:ring-[#1F2B4D]/20 transition-all"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider mb-1.5">Start Time (24h)</label>
                  <input 
                    type="time" 
                    value={policyForm.startTime} 
                    onChange={e => setPolicyForm({ ...policyForm, startTime: e.target.value })} 
                    className="w-full bg-[#FAF8F5] border border-[#EAE7E0] rounded-xl px-3 py-2 text-sm text-[#1F2B4D] focus:outline-none focus:ring-2 focus:ring-[#1F2B4D]/20 transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider mb-1.5">End Time (24h)</label>
                  <input 
                    type="time" 
                    value={policyForm.endTime} 
                    onChange={e => setPolicyForm({ ...policyForm, endTime: e.target.value })} 
                    className="w-full bg-[#FAF8F5] border border-[#EAE7E0] rounded-xl px-3 py-2 text-sm text-[#1F2B4D] focus:outline-none focus:ring-2 focus:ring-[#1F2B4D]/20 transition-all"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider mb-1.5">Grace Period (mins)</label>
                  <input 
                    type="number" 
                    min={0}
                    value={policyForm.gracePeriodMinutes} 
                    onChange={e => setPolicyForm({ ...policyForm, gracePeriodMinutes: parseInt(e.target.value) || 0 })} 
                    className="w-full bg-[#FAF8F5] border border-[#EAE7E0] rounded-xl px-3 py-2 text-sm text-[#1F2B4D] focus:outline-none focus:ring-2 focus:ring-[#1F2B4D]/20 transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider mb-1.5">Break Duration (mins)</label>
                  <input 
                    type="number" 
                    min={0}
                    value={policyForm.breakDurationMinutes} 
                    onChange={e => setPolicyForm({ ...policyForm, breakDurationMinutes: parseInt(e.target.value) || 0 })} 
                    className="w-full bg-[#FAF8F5] border border-[#EAE7E0] rounded-xl px-3 py-2 text-sm text-[#1F2B4D] focus:outline-none focus:ring-2 focus:ring-[#1F2B4D]/20 transition-all"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider mb-1.5">Assignment Duration (Days)</label>
                  <input 
                    type="number" 
                    min={1}
                    value={policyForm.assignmentDays} 
                    onChange={e => setPolicyForm({ ...policyForm, assignmentDays: e.target.value ? parseInt(e.target.value) : '' })} 
                    placeholder="e.g. 7 (Leave empty for infinite)"
                    className="w-full bg-[#FAF8F5] border border-[#EAE7E0] rounded-xl px-3 py-2 text-sm text-[#1F2B4D] focus:outline-none focus:ring-2 focus:ring-[#1F2B4D]/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider mb-1.5">Badge Color</label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="color" 
                      value={policyForm.color} 
                      onChange={e => setPolicyForm({ ...policyForm, color: e.target.value })} 
                      className="w-10 h-10 rounded-xl border border-[#EAE7E0] cursor-pointer p-0.5 bg-white"
                    />
                    <input 
                      type="text"
                      value={policyForm.color} 
                      onChange={e => setPolicyForm({ ...policyForm, color: e.target.value })} 
                      placeholder="#1F2B4D"
                      className="font-mono text-xs w-full bg-[#FAF8F5] border border-[#EAE7E0] rounded-xl px-3 py-2 text-[#1F2B4D] focus:outline-none"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-4">
                <button 
                  type="submit" 
                  disabled={submitting} 
                  className="bg-[#F0F3F9] hover:bg-[#E2E8F0] text-[#1F2B4D] border border-[#CBD5E1] font-display font-bold text-xs px-5 py-2 rounded-xl shadow-xs transition-all hover:scale-[1.02] active:scale-95 w-full"
                >
                  {submitting ? 'Creating...' : 'Create New Template'}
                </button>
              </div>
            </form>

            <div className="p-5 overflow-y-auto bg-white">
              <h3 className="text-xs font-display font-bold text-[#6B655C] uppercase tracking-wider mb-3">Existing Templates</h3>
              {policies.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No shift templates created yet.</p>
              ) : (
                <div className="space-y-2">
                  {policies.map(pol => (
                    <div key={pol.id} className="flex items-center justify-between p-3 rounded-xl border border-[#EAE7E0] bg-[#FAF8F5]">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: pol.color }}></div>
                        <div>
                          <div className="font-bold text-sm text-[#1F2B4D]">{pol.name}</div>
                          <div className="text-[10px] text-[#6B655C] font-medium">
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
    </div>
  );
};

export default ShiftRostering;
