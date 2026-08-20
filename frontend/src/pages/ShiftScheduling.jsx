import React, { useState, useEffect } from 'react';
import { hasPermission } from '../lib/permissions';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';
import { 
  CalendarDays, 
  Clock, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Coffee, 
  ShieldCheck, 
  X, 
  Sliders, 
  Info, 
  Check, 
  RotateCcw,
  Sparkles,
  Users
} from 'lucide-react';
import { format, addDays, startOfWeek, endOfWeek, isSameDay } from 'date-fns';
import { io } from 'socket.io-client';

const ShiftScheduling = ({ user }) => {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [policies, setPolicies] = useState([]);
  const [roster, setRoster] = useState([]);
  const [directoryUsers, setDirectoryUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCell, setSelectedCell] = useState(null); // { user, dateStr }
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [isDefaultModalOpen, setIsDefaultModalOpen] = useState(false);
  const [selectedUserForDefault, setSelectedUserForDefault] = useState(null);
  const [toast, setToast] = useState(null);

  const [policyForm, setPolicyForm] = useState({
    name: '',
    startTime: '09:00',
    endTime: '17:00',
    gracePeriodMinutes: 15,
    breakDurationMinutes: 60,
    color: '#1F2B4D'
  });
  const [policyError, setPolicyError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isAdmin = hasPermission(user, 'manage_shifts');
  const isManager = hasPermission(user, 'manage_shifts');

  const daysOfWeek = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  const startDateStr = format(currentWeekStart, 'yyyy-MM-dd');
  const endDateStr = format(daysOfWeek[6], 'yyyy-MM-dd');

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000';

      const [policiesRes, rosterRes, dirRes] = await Promise.all([
        fetch(`${apiBase}/api/shifts/policies`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${apiBase}/api/shifts/roster?startDate=${startDateStr}&endDate=${endDateStr}&scope=${isAdmin ? 'all' : 'team'}`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${apiBase}/api/users/directory?scope=${isAdmin ? 'all' : 'team'}`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (policiesRes.ok) setPolicies(await policiesRes.json());
      if (rosterRes.ok) setRoster(await rosterRes.json());
      if (dirRes.ok) setDirectoryUsers(await dirRes.json());
    } catch (err) {
      console.error('Error loading shift scheduling data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Real-time Socket.io listener for shift assignment updates
    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
      auth: { token: localStorage.getItem('token') }
    });

    socket.on('shift:updated', () => {
      fetchData();
      setToast('📅 Shift roster updated in real-time');
      setTimeout(() => setToast(null), 3000);
    });

    return () => {
      socket.disconnect();
    };
  }, [currentWeekStart]);

  const handlePrevWeek = () => setCurrentWeekStart(prev => addDays(prev, -7));
  const handleNextWeek = () => setCurrentWeekStart(prev => addDays(prev, 7));
  const handleToday = () => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

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
        color: '#1F2B4D'
      });
      fetchData();
    } catch (err) {
      setPolicyError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignShift = async (userId, dateStr, shiftPolicyId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/shifts/roster/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          assignments: [{ userId, date: dateStr, shiftPolicyId }]
        })
      });

      if (res.ok) {
        setSelectedCell(null);
        fetchData();
      } else {
        const errData = await res.json();
        alert(errData.error || 'Failed to assign shift');
      }
    } catch (err) {
      console.error('Assign shift error:', err);
    }
  };

  const handleClearOverride = async (userId, dateStr) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/shifts/roster/entry?userId=${userId}&date=${dateStr}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        setSelectedCell(null);
        fetchData();
      } else {
        const errData = await res.json();
        alert(errData.error || 'Failed to clear override');
      }
    } catch (err) {
      console.error('Clear override error:', err);
    }
  };

  const handleAssignDefaultShift = async (userId, shiftPolicyId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/shifts/roster/assign-default`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId, shiftPolicyId })
      });

      if (res.ok) {
        setIsDefaultModalOpen(false);
        fetchData();
      } else {
        const errData = await res.json();
        alert(errData.error || 'Failed to set default shift');
      }
    } catch (err) {
      console.error('Set default shift error:', err);
    }
  };

  const findRosterEntry = (userId, dayDate) => {
    const dayStr = format(dayDate, 'yyyy-MM-dd');
    return roster.find(r => {
      if (r.userId !== userId) return false;
      const rDateStr = typeof r.date === 'string' 
        ? r.date.split('T')[0] 
        : format(new Date(r.date), 'yyyy-MM-dd');
      return rDateStr === dayStr;
    });
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6 max-w-[1600px] mx-auto min-h-full flex flex-col gap-6 animate-pulse">
        {/* Header skeleton */}
        <div className="flex justify-between items-center pb-5 border-b border-[#EAE7E0]">
          <div className="space-y-2">
            <div className="h-8 w-64 bg-[#F0F3F9] rounded-xl" />
            <div className="h-4 w-80 bg-[#FAF8F5] rounded-lg" />
          </div>
          <div className="flex gap-2">
            <div className="h-10 w-32 bg-[#F0F3F9] rounded-xl" />
          </div>
        </div>
        {/* Palette skeleton */}
        <div className="h-16 w-full bg-[#FAF8F5] border border-[#EAE7E0] rounded-[20px]" />
        {/* Calendar grid skeleton */}
        <div className="bg-white rounded-[20px] border border-[#EAE7E0] p-4 space-y-3">
          <div className="grid grid-cols-8 gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={`h${i}`} className="h-8 bg-[#FAF8F5] rounded-xl" />
            ))}
            {Array.from({ length: 40 }).map((_, i) => (
              <div key={`c${i}`} className="h-12 bg-[#FAF9F6] rounded-xl border border-[#EAE7E0]" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto min-h-full flex flex-col gap-6">
      
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#FAF8F5] text-[#1F2B4D] px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5 duration-300 border border-[#CBD5E1] font-display font-bold text-xs">
          <Sparkles size={16} className="text-amber-500 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-5 border-b border-[#EAE7E0] gap-4">
        <div>
          <h1 className="font-serif font-bold text-3xl md:text-4xl text-[#1F2B4D] tracking-tight leading-none">
            Shift Rostering & Scheduling
          </h1>
          <p className="text-sm text-[#6B655C] mt-1.5 font-medium">
            Manage weekly employee shifts, overnight schedules, and rest day overrides.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {isAdmin && (
            <button
              type="button"
              onClick={() => setIsPolicyModalOpen(true)}
              className="bg-[#F0F3F9] hover:bg-[#E2E8F0] text-[#1F2B4D] border border-[#CBD5E1] font-display font-bold px-4 py-2 rounded-xl shadow-xs transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-1.5 text-xs"
            >
              <Plus size={16} strokeWidth={2.5} /> Shift Templates
            </button>
          )}
        </div>
      </div>

      {/* ── Shift Palette Header Bar (Bespoke Container - Zero Dark Mode Leak) ── */}
      <div className="p-4 bg-[#FAF8F5] border border-[#EAE7E0] rounded-[20px] shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider mr-2">Shift Palette:</span>
          {policies.map(pol => (
            <div 
              key={pol.id} 
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-display font-bold text-white shadow-xs transition-transform hover:scale-105"
              style={{ backgroundColor: pol.color }}
            >
              <Clock size={12} />
              <span>{pol.name} ({pol.startTime}–{pol.endTime})</span>
              <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px]">+{pol.gracePeriodMinutes}m grace</span>
            </div>
          ))}

          {/* Off Day Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-display font-bold bg-[#F4F1EA] text-[#6B655C] border border-[#EAE7E0]">
            <Coffee size={14} className="text-[#6B655C]" />
            <span>Off (Rest Day)</span>
          </div>
        </div>

        {/* Week Controls */}
        <div className="flex items-center gap-2">
          <button 
            type="button"
            onClick={handleToday} 
            className="bg-white hover:bg-[#FAF8F5] text-[#1F2B4D] border border-[#EAE7E0] font-display font-bold text-xs rounded-xl px-3 py-1.5 shadow-xs transition-all"
          >
            Today
          </button>
          <button 
            type="button"
            onClick={handlePrevWeek} 
            className="p-1.5 rounded-xl bg-white border border-[#EAE7E0] text-[#6B655C] hover:text-[#1F2B4D] hover:bg-[#FAF8F5] shadow-xs transition-all"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-serif font-bold text-[#1F2B4D] min-w-[160px] text-center">
            {format(currentWeekStart, 'MMM d')} – {format(daysOfWeek[6], 'MMM d, yyyy')}
          </span>
          <button 
            type="button"
            onClick={handleNextWeek} 
            className="p-1.5 rounded-xl bg-white border border-[#EAE7E0] text-[#6B655C] hover:text-[#1F2B4D] hover:bg-[#FAF8F5] shadow-xs transition-all"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* ── Weekly Matrix Grid Table (Bespoke Container - Zero Dark Mode Leak) ── */}
      <div className="p-0 border border-[#EAE7E0] rounded-[20px] shadow-xs overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-[#FAF8F5] border-b border-[#EAE7E0] text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider">
                <th className="p-4 w-[260px] sticky left-0 bg-[#FAF8F5] z-10 border-r border-[#EAE7E0]">Employee</th>
                {daysOfWeek.map((day, idx) => {
                  const isToday = isSameDay(day, new Date());
                  return (
                    <th key={idx} className={`p-3 text-center border-r border-[#EAE7E0] ${isToday ? 'bg-[#F0F3F9] text-[#1F2B4D] font-bold' : ''}`}>
                      <div className="font-display uppercase tracking-wider text-[10px]">{format(day, 'EEE')}</div>
                      <div className="text-xs font-serif font-bold text-[#1F2B4D] mt-0.5">{format(day, 'MMM d')}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4F1EA] text-sm">
              {directoryUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-[#9A948A] font-medium text-xs">No team members found.</td>
                </tr>
              ) : (
                directoryUsers.map((emp) => {
                  const defaultPolicy = policies.find(p => p.id === emp.shiftPolicyId);

                  // Calculate employee's weekly workload summary
                  let weeklyAssignedCount = 0;
                  let weeklyOffCount = 0;

                  daysOfWeek.forEach(dayDate => {
                    const entry = findRosterEntry(emp.id, dayDate);
                    if (entry) {
                      if (entry.shiftPolicyId === null) weeklyOffCount++;
                      else weeklyAssignedCount++;
                    } else if (defaultPolicy) {
                      weeklyAssignedCount++;
                    }
                  });

                  return (
                    <tr key={emp.id} className="hover:bg-[#FAF9F6]/80 transition-colors">
                      {/* Employee Profile Column */}
                      <td className="p-3 sticky left-0 bg-white z-10 border-r border-[#EAE7E0] shadow-xs">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Avatar src={emp.avatar} name={emp.displayName} className="w-8 h-8 rounded-full shrink-0 ring-2 ring-[#FAF9F6]" />
                            <div className="truncate">
                              <div className="font-serif font-semibold text-[#1F2B4D] text-xs truncate">{emp.displayName}</div>
                              <div className="text-[10px] font-medium text-[#6B655C] truncate">{emp.department || 'Team'}</div>
                              <div className="mt-0.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#FAF9F6] text-[#6B655C] border border-[#EAE7E0] text-[9px] font-display font-bold uppercase tracking-wider">
                                <span>{weeklyAssignedCount} Shift{weeklyAssignedCount !== 1 ? 's' : ''}</span>
                                {weeklyOffCount > 0 && <span>• {weeklyOffCount} Off</span>}
                              </div>
                            </div>
                          </div>

                          {/* Default Shift Badge Button */}
                          {isManager && (
                            <button
                              type="button"
                              onClick={() => { setSelectedUserForDefault(emp); setIsDefaultModalOpen(true); }}
                              className="p-1.5 text-[#9A948A] hover:text-[#1F2B4D] hover:bg-[#F0F3F9] rounded-lg transition-colors"
                              title="Set Default Shift"
                            >
                              <Sliders size={14} />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* 7 Days Columns */}
                      {daysOfWeek.map((dayDate, dayIdx) => {
                        const dayStr = format(dayDate, 'yyyy-MM-dd');
                        const rosterEntry = findRosterEntry(emp.id, dayDate);
                        const isToday = isSameDay(dayDate, new Date());

                        let displayPolicy = null;
                        let isExplicitOff = false;
                        let isOverride = false;

                        if (rosterEntry) {
                          isOverride = true;
                          if (rosterEntry.shiftPolicyId === null) {
                            isExplicitOff = true;
                          } else {
                            displayPolicy = rosterEntry.shiftPolicy;
                          }
                        } else {
                          displayPolicy = defaultPolicy;
                        }

                        // A cell is LOCKED if it has an explicit roster assignment (shift OR off day).
                        // Locked cells are NOT clickable — the shift is already set for that date.
                        // Only truly unassigned cells (no rosterEntry, no defaultPolicy) can be clicked.
                        const isRosterLocked = !!rosterEntry;
                        const canClick = isManager && !isRosterLocked;

                        return (
                          <td
                            key={dayIdx}
                            onClick={() => canClick && setSelectedCell({ user: emp, dateStr: dayStr, rosterEntry })}
                            className={`p-2 border-r border-[#EAE7E0] text-center transition-all
                              ${canClick ? 'cursor-pointer hover:bg-[#F0F3F9]/60' : 'cursor-default'}
                              ${isToday ? 'bg-[#F0F3F9]/40' : ''}
                            `}
                          >
                            {isExplicitOff ? (
                              /* OFF DAY — locked, unclickable */
                              <div className="relative py-2.5 px-2 rounded-xl bg-[#FAF8F5] text-[#6B655C] border border-[#EAE7E0] font-display font-bold text-xs flex items-center justify-center gap-1 shadow-xs select-none">
                                <Coffee size={12} className="text-[#6B655C]" /> Off
                                {isManager && (
                                  <button
                                    type="button"
                                    title="Remove off-day override"
                                    onClick={(e) => { e.stopPropagation(); handleClearOverride(emp.id, dayStr); }}
                                    className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[#EAE7E0] hover:bg-rose-100 hover:text-rose-600 text-[#9A948A] flex items-center justify-center transition-colors"
                                  >
                                    <X size={9} />
                                  </button>
                                )}
                              </div>
                            ) : displayPolicy && isRosterLocked ? (
                              /* LOCKED ROSTER SHIFT — visually blocked, cannot reassign by clicking */
                              <div
                                className="relative py-2.5 px-2 rounded-xl text-white font-display font-bold text-xs flex flex-col items-center justify-center gap-0.5 shadow-xs select-none"
                                style={{ backgroundColor: displayPolicy.color }}
                                title={`Shift locked: ${displayPolicy.name} (${displayPolicy.startTime}–${displayPolicy.endTime}). Remove to reassign.`}
                              >
                                {/* Locked badge */}
                                <span className="absolute top-1 left-1 text-[8px] bg-black/20 px-1 py-0.5 rounded font-bold tracking-wider flex items-center gap-0.5">
                                  🔒 LOCKED
                                </span>
                                <span className="truncate max-w-full flex items-center gap-1 mt-2">
                                  <Clock size={11} className="shrink-0" />
                                  {displayPolicy.name}
                                </span>
                                <span className="text-[10px] font-semibold opacity-95">{displayPolicy.startTime}–{displayPolicy.endTime}</span>
                                {/* Remove button for managers */}
                                {isManager && (
                                  <button
                                    type="button"
                                    title="Remove this roster assignment"
                                    onClick={(e) => { e.stopPropagation(); handleClearOverride(emp.id, dayStr); }}
                                    className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-white/30 hover:bg-rose-500 text-white flex items-center justify-center transition-colors"
                                  >
                                    <X size={9} />
                                  </button>
                                )}
                              </div>
                            ) : displayPolicy ? (
                              /* DEFAULT PROFILE SHIFT — shown but clickable to override */
                              <div
                                onClick={() => isManager && setSelectedCell({ user: emp, dateStr: dayStr, rosterEntry })}
                                className="py-2.5 px-2 rounded-xl text-white font-display font-bold text-xs flex flex-col items-center justify-center gap-0.5 shadow-xs relative transition-transform hover:scale-[1.03] cursor-pointer opacity-70"
                                style={{ backgroundColor: displayPolicy.color }}
                                title="Default shift — click to override for this date"
                              >
                                <span className="absolute top-1 right-1 text-[8px] bg-black/20 px-1 py-0.5 rounded font-bold tracking-wider">AUTO</span>
                                <span className="truncate max-w-full flex items-center gap-1">
                                  <Clock size={11} className="shrink-0" />
                                  {displayPolicy.name}
                                </span>
                                <span className="text-[10px] font-semibold opacity-95">{displayPolicy.startTime}–{displayPolicy.endTime}</span>
                              </div>
                            ) : (
                              /* UNASSIGNED — clickable */
                              <div className="py-2.5 px-2 text-[#9A948A] font-medium text-xs border border-dashed border-[#EAE7E0] rounded-xl hover:border-[#D8D4CA] transition-colors">
                                Unassigned
                              </div>
                            )}
                          </td>
                        );
                      })}

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Click-to-Assign Shift Modal ── */}
      {selectedCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1F2B4D]/20 backdrop-blur-xs p-4">
          <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-[#EAE7E0]">
            <div className="flex items-center justify-between p-5 border-b border-[#EAE7E0] bg-[#FAF8F5]">
              <div>
                <h3 className="font-serif font-bold text-lg text-[#1F2B4D]">Assign Shift Schedule</h3>
                <p className="text-xs text-[#6B655C] font-medium mt-0.5">
                  {selectedCell.user.displayName} • {format(new Date(selectedCell.dateStr), 'EEEE, MMM d, yyyy')}
                </p>
              </div>
              <button 
                type="button"
                onClick={() => setSelectedCell(null)} 
                className="p-1.5 text-[#6B655C] hover:text-[#1F2B4D] rounded-xl hover:bg-[#EAE7E0] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <p className="text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider">Select Shift Template:</p>
              
              {policies.map(pol => (
                <button
                  key={pol.id}
                  type="button"
                  onClick={() => handleAssignShift(selectedCell.user.id, selectedCell.dateStr, pol.id)}
                  className="w-full p-3 rounded-xl border border-[#EAE7E0] hover:border-[#1F2B4D] hover:bg-[#F0F3F9]/60 flex items-center justify-between transition-all text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full shadow-xs" style={{ backgroundColor: pol.color }} />
                    <div>
                      <div className="text-xs font-serif font-bold text-[#1F2B4D] group-hover:text-[#1F2B4D]">{pol.name}</div>
                      <div className="text-[11px] text-[#6B655C] font-medium">{pol.startTime} – {pol.endTime} ({pol.gracePeriodMinutes}m grace, {pol.breakDurationMinutes}m break)</div>
                    </div>
                  </div>
                  <Check size={16} className="text-[#1F2B4D] opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}

              {/* Explicit Off Day */}
              <button
                type="button"
                onClick={() => handleAssignShift(selectedCell.user.id, selectedCell.dateStr, null)}
                className="w-full p-3 rounded-xl border border-[#EAE7E0] hover:border-[#9A948A] hover:bg-[#FAF8F5] flex items-center justify-between transition-all text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-[#F4F1EA] border border-[#EAE7E0] flex items-center justify-center text-[#6B655C]"><Coffee size={10} /></div>
                  <div>
                    <div className="text-xs font-serif font-bold text-[#1F2B4D]">Off (Rest Day)</div>
                    <div className="text-[11px] text-[#6B655C] font-medium">Explicit day off override</div>
                  </div>
                </div>
              </button>

              {/* Clear Override */}
              {selectedCell.rosterEntry && (
                <button
                  type="button"
                  onClick={() => handleClearOverride(selectedCell.user.id, selectedCell.dateStr)}
                  className="w-full p-3 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 flex items-center justify-between transition-all text-left font-display font-bold text-xs mt-2"
                >
                  <span className="flex items-center gap-2">
                    <RotateCcw size={14} /> Clear Override (Reset to Default Shift)
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Policy Builder Modal (Admin Only) ── */}
      {isPolicyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1F2B4D]/20 backdrop-blur-xs p-4">
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
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreatePolicy} className="p-5 space-y-4 overflow-y-auto">
              {policyError && (
                <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200 flex items-center gap-2 font-medium">
                  <Info size={14} className="shrink-0" /> {policyError}
                </div>
              )}

              <div>
                <label className="block text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider mb-1.5">Shift Name</label>
                <Input 
                  value={policyForm.name} 
                  onChange={e => setPolicyForm({ ...policyForm, name: e.target.value })} 
                  placeholder="e.g. Morning Shift, Night Shift"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider mb-1.5">Start Time (24h)</label>
                  <Input 
                    type="time" 
                    value={policyForm.startTime} 
                    onChange={e => setPolicyForm({ ...policyForm, startTime: e.target.value })} 
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider mb-1.5">End Time (24h)</label>
                  <Input 
                    type="time" 
                    value={policyForm.endTime} 
                    onChange={e => setPolicyForm({ ...policyForm, endTime: e.target.value })} 
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider mb-1.5">Grace Period (mins)</label>
                  <Input 
                    type="number" 
                    min={0}
                    value={policyForm.gracePeriodMinutes} 
                    onChange={e => setPolicyForm({ ...policyForm, gracePeriodMinutes: parseInt(e.target.value) || 0 })} 
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider mb-1.5">Break Duration (mins)</label>
                  <Input 
                    type="number" 
                    min={0}
                    value={policyForm.breakDurationMinutes} 
                    onChange={e => setPolicyForm({ ...policyForm, breakDurationMinutes: parseInt(e.target.value) || 0 })} 
                    required
                  />
                </div>
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
                  <Input 
                    value={policyForm.color} 
                    onChange={e => setPolicyForm({ ...policyForm, color: e.target.value })} 
                    placeholder="#1F2B4D"
                    className="font-mono text-xs"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-[#EAE7E0]">
                <button 
                  type="button" 
                  onClick={() => setIsPolicyModalOpen(false)} 
                  className="text-[#6B655C] font-display font-bold text-xs rounded-xl px-4 py-2 hover:bg-[#F4F1EA] transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submitting} 
                  className="bg-[#F0F3F9] hover:bg-[#E2E8F0] text-[#1F2B4D] border border-[#CBD5E1] font-display font-bold text-xs px-5 py-2 rounded-xl shadow-xs transition-all hover:scale-[1.02] active:scale-95"
                >
                  {submitting ? 'Creating...' : 'Save Shift Policy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Set Default Shift Modal ── */}
      {isDefaultModalOpen && selectedUserForDefault && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1F2B4D]/20 backdrop-blur-xs p-4">
          <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-[#EAE7E0]">
            <div className="flex items-center justify-between p-5 border-b border-[#EAE7E0] bg-[#FAF8F5]">
              <div>
                <h3 className="font-serif font-bold text-lg text-[#1F2B4D]">Default Shift Fallback</h3>
                <p className="text-xs text-[#6B655C] font-medium mt-0.5">{selectedUserForDefault.displayName}</p>
              </div>
              <button 
                type="button"
                onClick={() => setIsDefaultModalOpen(false)} 
                className="p-1.5 text-[#6B655C] hover:text-[#1F2B4D] rounded-xl hover:bg-[#EAE7E0] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <p className="text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider">Select Default Shift Template:</p>
              
              {policies.map(pol => (
                <button
                  key={pol.id}
                  type="button"
                  onClick={() => handleAssignDefaultShift(selectedUserForDefault.id, pol.id)}
                  className={`w-full p-3 rounded-xl border flex items-center justify-between transition-all text-left ${
                    selectedUserForDefault.shiftPolicyId === pol.id 
                      ? 'border-[#1F2B4D] bg-[#F0F3F9]/80 font-bold' 
                      : 'border-[#EAE7E0] hover:border-[#1F2B4D] hover:bg-[#FAF8F5]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full shadow-xs" style={{ backgroundColor: pol.color }} />
                    <div>
                      <div className="text-xs font-serif font-bold text-[#1F2B4D]">{pol.name}</div>
                      <div className="text-[11px] text-[#6B655C] font-medium">{pol.startTime} – {pol.endTime}</div>
                    </div>
                  </div>
                  {selectedUserForDefault.shiftPolicyId === pol.id && <Check size={16} className="text-[#1F2B4D] font-bold" />}
                </button>
              ))}

              <button
                type="button"
                onClick={() => handleAssignDefaultShift(selectedUserForDefault.id, null)}
                className="w-full p-3 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 flex items-center justify-between transition-all text-left font-display font-bold text-xs mt-2"
              >
                <span>Clear Default Shift (Unassigned)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShiftScheduling;
