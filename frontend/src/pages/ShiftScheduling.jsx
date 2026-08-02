import React, { useState, useEffect } from 'react';
import { hasPermission } from '../lib/permissions';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
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
    color: '#6366f1'
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
        color: '#6366f1'
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
      <div className="p-4 md:p-8 max-w-[1600px] mx-auto min-h-full flex flex-col gap-6 animate-pulse">
        {/* Header skeleton */}
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-7 w-48 bg-slate-200 rounded-lg" />
            <div className="h-4 w-64 bg-slate-100 rounded" />
          </div>
          <div className="flex gap-2">
            <div className="h-10 w-10 bg-slate-200 rounded-xl" />
            <div className="h-10 w-24 bg-slate-200 rounded-xl" />
            <div className="h-10 w-10 bg-slate-200 rounded-xl" />
          </div>
        </div>
        {/* Calendar grid skeleton */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="grid grid-cols-8 gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={`h${i}`} className="h-8 bg-slate-100 rounded" />
            ))}
            {Array.from({ length: 40 }).map((_, i) => (
              <div key={`c${i}`} className="h-12 bg-slate-50 rounded-lg border border-slate-100" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto min-h-full flex flex-col gap-6">
      
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5 duration-300 border border-slate-700">
          <Sparkles size={18} className="text-amber-400 shrink-0" />
          <span className="text-sm font-semibold">{toast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2.5">
            <CalendarDays size={28} className="text-indigo-600" />
            Shift Rostering & Scheduling
          </h1>
          <p className="text-slate-500 mt-1 text-sm">Manage weekly employee shifts, overnight schedules, and rest day overrides.</p>
        </div>

        <div className="flex items-center gap-3">
          {isAdmin && (
            <Button
              onClick={() => setIsPolicyModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-2 text-sm px-4 py-2 rounded-xl shadow-md shadow-indigo-600/20"
            >
              <Plus size={18} strokeWidth={2.5} /> Shift Templates
            </Button>
          )}
        </div>
      </div>

      {/* Shift Palette Header */}
      <Card className="p-4 bg-slate-50/80 border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-2">Shift Palette:</span>
          {policies.map(pol => (
            <div 
              key={pol.id} 
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold text-white shadow-sm transition-transform hover:scale-105"
              style={{ backgroundColor: pol.color }}
            >
              <Clock size={12} />
              <span>{pol.name} ({pol.startTime}–{pol.endTime})</span>
              <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px]">+{pol.gracePeriodMinutes}m grace</span>
            </div>
          ))}

          {/* Off Day Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-200 text-slate-700 border border-slate-300">
            <Coffee size={14} className="text-slate-500" />
            <span>Off (Rest Day)</span>
          </div>
        </div>

        {/* Week Controls */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleToday} className="text-xs font-bold border-slate-200">
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrevWeek} className="p-2 border-slate-200">
            <ChevronLeft size={16} />
          </Button>
          <span className="text-sm font-bold text-slate-700 min-w-[160px] text-center">
            {format(currentWeekStart, 'MMM d')} – {format(daysOfWeek[6], 'MMM d, yyyy')}
          </span>
          <Button variant="outline" size="sm" onClick={handleNextWeek} className="p-2 border-slate-200">
            <ChevronRight size={16} />
          </Button>
        </div>
      </Card>

      {/* Weekly Matrix Grid Table */}
      <Card className="p-0 border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[900px]">
          <thead>
            <tr className="bg-slate-100/70 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
              <th className="p-4 w-[250px] sticky left-0 bg-slate-100/90 backdrop-blur z-10 border-r border-slate-200">Employee</th>
              {daysOfWeek.map((day, idx) => {
                const isToday = isSameDay(day, new Date());
                return (
                  <th key={idx} className={`p-3 text-center border-r border-slate-200 ${isToday ? 'bg-indigo-50/80 text-indigo-700 font-black' : ''}`}>
                    <div>{format(day, 'EEE')}</div>
                    <div className="text-sm font-bold text-slate-800">{format(day, 'MMM d')}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {directoryUsers.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-400 font-medium">No team members found.</td>
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
                  <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                    {/* Employee Profile Column */}
                    <td className="p-3 sticky left-0 bg-white z-10 border-r border-slate-200 shadow-sm">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar src={emp.avatar} name={emp.displayName} className="w-8 h-8 rounded-full shrink-0" />
                          <div className="truncate">
                            <div className="font-bold text-slate-800 text-xs truncate">{emp.displayName}</div>
                            <div className="text-[10px] text-slate-400 truncate">{emp.department || 'Team'}</div>
                            <div className="mt-0.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-bold">
                              <span>{weeklyAssignedCount} Shift{weeklyAssignedCount !== 1 ? 's' : ''}</span>
                              {weeklyOffCount > 0 && <span>• {weeklyOffCount} Off</span>}
                            </div>
                          </div>
                        </div>

                        {/* Default Shift Badge Button */}
                        {isManager && (
                          <button
                            onClick={() => { setSelectedUserForDefault(emp); setIsDefaultModalOpen(true); }}
                            className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded transition-colors"
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

                      return (
                        <td 
                          key={dayIdx} 
                          onClick={() => isManager && setSelectedCell({ user: emp, dateStr: dayStr, rosterEntry })}
                          className={`p-2 border-r border-slate-200 text-center transition-all ${isManager ? 'cursor-pointer hover:bg-indigo-50/40' : ''} ${isToday ? 'bg-indigo-50/20' : ''}`}
                        >
                          {isExplicitOff ? (
                            <div className="py-2.5 px-2 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs flex items-center justify-center gap-1 shadow-2xs">
                              <Coffee size={12} className="text-slate-500" /> Off
                            </div>
                          ) : displayPolicy ? (
                            <div 
                              className="py-2.5 px-2 rounded-xl text-white font-bold text-xs flex flex-col items-center justify-center gap-0.5 shadow-sm relative transition-transform hover:scale-[1.03]"
                              style={{ backgroundColor: displayPolicy.color }}
                            >
                              {isOverride && (
                                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-300 ring-2 ring-white animate-pulse" title="Custom Roster Override" />
                              )}
                              <span className="truncate max-w-full flex items-center gap-1">
                                <Clock size={11} className="shrink-0" />
                                {displayPolicy.name}
                              </span>
                              <span className="text-[10px] font-semibold opacity-95">{displayPolicy.startTime}–{displayPolicy.endTime}</span>
                            </div>
                          ) : (
                            <div className="py-2.5 px-2 text-slate-300 font-medium text-xs border border-dashed border-slate-200 rounded-xl hover:border-slate-300 transition-colors">
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
      </Card>

      {/* Click-to-Assign Shift Modal */}
      {selectedCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/80">
              <div>
                <h3 className="text-base font-bold text-slate-800">Assign Shift Schedule</h3>
                <p className="text-xs text-slate-500">
                  {selectedCell.user.displayName} • {format(new Date(selectedCell.dateStr), 'EEEE, MMM d, yyyy')}
                </p>
              </div>
              <button onClick={() => setSelectedCell(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Shift Template:</p>
              
              {policies.map(pol => (
                <button
                  key={pol.id}
                  onClick={() => handleAssignShift(selectedCell.user.id, selectedCell.dateStr, pol.id)}
                  className="w-full p-3 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/50 flex items-center justify-between transition-all text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: pol.color }} />
                    <div>
                      <div className="text-sm font-bold text-slate-800 group-hover:text-indigo-600">{pol.name}</div>
                      <div className="text-xs text-slate-500">{pol.startTime} – {pol.endTime} ({pol.gracePeriodMinutes}m grace, {pol.breakDurationMinutes}m break)</div>
                    </div>
                  </div>
                  <Check size={16} className="text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}

              {/* Explicit Off Day */}
              <button
                onClick={() => handleAssignShift(selectedCell.user.id, selectedCell.dateStr, null)}
                className="w-full p-3 rounded-xl border border-slate-200 hover:border-slate-400 hover:bg-slate-100 flex items-center justify-between transition-all text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-slate-300 flex items-center justify-center text-slate-600"><Coffee size={10} /></div>
                  <div>
                    <div className="text-sm font-bold text-slate-800">Off (Rest Day)</div>
                    <div className="text-xs text-slate-500">Explicit day off override</div>
                  </div>
                </div>
              </button>

              {/* Clear Override */}
              {selectedCell.rosterEntry && (
                <button
                  onClick={() => handleClearOverride(selectedCell.user.id, selectedCell.dateStr)}
                  className="w-full p-3 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 flex items-center justify-between transition-all text-left font-semibold text-xs mt-2"
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

      {/* Policy Builder Modal (Admin Only) */}
      {isPolicyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/80">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Clock size={20} className="text-indigo-600" />
                Create Shift Policy Template
              </h2>
              <button onClick={() => setIsPolicyModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreatePolicy} className="p-6 space-y-4 overflow-y-auto">
              {policyError && (
                <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl border border-red-200 flex items-center gap-2">
                  <Info size={14} className="shrink-0" /> {policyError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Shift Name</label>
                <Input 
                  value={policyForm.name} 
                  onChange={e => setPolicyForm({ ...policyForm, name: e.target.value })} 
                  placeholder="e.g. Morning Shift, Night Shift"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Start Time (24h)</label>
                  <Input 
                    type="time" 
                    value={policyForm.startTime} 
                    onChange={e => setPolicyForm({ ...policyForm, startTime: e.target.value })} 
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">End Time (24h)</label>
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
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Grace Period (mins)</label>
                  <Input 
                    type="number" 
                    min={0}
                    value={policyForm.gracePeriodMinutes} 
                    onChange={e => setPolicyForm({ ...policyForm, gracePeriodMinutes: parseInt(e.target.value) || 0 })} 
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Break Duration (mins)</label>
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
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Badge Color</label>
                <div className="flex items-center gap-3">
                  <input 
                    type="color" 
                    value={policyForm.color} 
                    onChange={e => setPolicyForm({ ...policyForm, color: e.target.value })} 
                    className="w-10 h-10 rounded-xl border border-slate-200 cursor-pointer p-0.5 bg-white"
                  />
                  <Input 
                    value={policyForm.color} 
                    onChange={e => setPolicyForm({ ...policyForm, color: e.target.value })} 
                    placeholder="#6366f1"
                    className="font-mono text-xs"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <Button type="button" variant="ghost" onClick={() => setIsPolicyModalOpen(false)} className="text-slate-600 font-semibold">
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 shadow-md shadow-indigo-600/20">
                  {submitting ? 'Creating...' : 'Save Shift Policy'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Set Default Shift Modal */}
      {isDefaultModalOpen && selectedUserForDefault && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/80">
              <div>
                <h3 className="text-base font-bold text-slate-800">Default Shift Fallback</h3>
                <p className="text-xs text-slate-500">{selectedUserForDefault.displayName}</p>
              </div>
              <button onClick={() => setIsDefaultModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Default Shift Template:</p>
              
              {policies.map(pol => (
                <button
                  key={pol.id}
                  onClick={() => handleAssignDefaultShift(selectedUserForDefault.id, pol.id)}
                  className={`w-full p-3 rounded-xl border flex items-center justify-between transition-all text-left ${
                    selectedUserForDefault.shiftPolicyId === pol.id ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-200 hover:border-indigo-400'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: pol.color }} />
                    <div>
                      <div className="text-sm font-bold text-slate-800">{pol.name}</div>
                      <div className="text-xs text-slate-500">{pol.startTime} – {pol.endTime}</div>
                    </div>
                  </div>
                  {selectedUserForDefault.shiftPolicyId === pol.id && <Check size={16} className="text-indigo-600 font-bold" />}
                </button>
              ))}

              <button
                onClick={() => handleAssignDefaultShift(selectedUserForDefault.id, null)}
                className="w-full p-3 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 flex items-center justify-between transition-all text-left font-semibold text-xs mt-2"
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
