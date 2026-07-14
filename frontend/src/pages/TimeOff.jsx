import React, { useState, useEffect, useRef } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Plus, X, Calendar as CalendarIcon, UploadCloud, Info, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfYear, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay, isAfter, isBefore, startOfDay, subMonths } from 'date-fns';

const HOLIDAYS = [
  { date: '2026-01-26', name: 'Republic Day' },
  { date: '2026-03-03', name: 'Maha Shivaratri' },
  { date: '2026-03-24', name: 'Holi' },
  { date: '2026-08-15', name: 'Independence Day' },
  { date: '2026-10-02', name: 'Gandhi Jayanti' },
  { date: '2026-11-08', name: 'Diwali' },
  { date: '2026-12-25', name: 'Christmas Day' }
];

const LEAVE_COLORS = {
  Approved: 'bg-emerald-500',
  Pending: 'bg-amber-400',
  Rejected: 'bg-red-500',
};

const LargeSlidingCalendar = ({ leaves }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const handlePrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const daysInMonth = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const startDay = getDay(startOfMonth(currentMonth));

  const getLeavesForDate = (date) => {
    return leaves.filter(leave => {
      const start = startOfDay(new Date(leave.startDate));
      const end = startOfDay(new Date(leave.endDate));
      const target = startOfDay(date);
      return (isSameDay(target, start) || isAfter(target, start)) && (isSameDay(target, end) || isBefore(target, end));
    });
  };



  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
        <h2 className="text-xl font-black text-slate-800 tracking-tight">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <div className="flex items-center gap-2">
          <button 
            onClick={handlePrevMonth}
            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-100"
          >
            <ChevronLeft size={20} />
          </button>
          <button 
            onClick={handleNextMonth}
            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-100"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="p-2 md:p-4 overflow-x-hidden">
        <div className="w-full">
          <div className="grid grid-cols-7 gap-1 md:gap-3 mb-2">
            {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, i) => (
              <div key={i} className="text-[10px] md:text-xs font-bold text-slate-400 text-center uppercase tracking-wider">
                <span className="hidden md:inline">{day.slice(0,3)}</span>
                <span className="md:hidden">{day.slice(0,1)}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 md:gap-3 w-full">
              {Array.from({ length: startDay }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[50px] md:min-h-[100px] bg-slate-50/50 rounded-lg md:rounded-xl border border-slate-100/50"></div>
              ))}
              
              {daysInMonth.map((date) => {
                const dayLeaves = getLeavesForDate(date);
                const isWeekend = getDay(date) === 0 || getDay(date) === 6;
                const isHoliday = HOLIDAYS.find(h => isSameDay(new Date(h.date), date));
                const isToday = isSameDay(date, new Date());

                return (
                  <div 
                    key={date.toISOString()} 
                    className={`min-h-[50px] md:min-h-[100px] rounded-lg md:rounded-xl border p-1 md:p-1.5 flex flex-col transition-all
                      ${isToday ? 'border-indigo-500 ring-2 md:ring-4 ring-indigo-50 shadow-md bg-indigo-50/20' : 'border-slate-100'}
                      ${isWeekend && !isToday ? 'bg-slate-50/80' : 'bg-white'}
                      ${isHoliday ? 'bg-indigo-50/40 border-indigo-100' : ''}
                    `}
                  >
                    <div className="flex justify-center md:justify-between items-start mb-0.5 md:mb-1">
                      <span className={`text-[10px] md:text-xs font-bold ${isToday ? 'text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded-full' : (isWeekend ? 'text-slate-400' : 'text-slate-700')}`}>
                        {format(date, 'd')}
                      </span>
                      {isHoliday && (
                        <span className="hidden md:block text-[10px] font-bold text-indigo-500 max-w-[70px] leading-tight text-right line-clamp-2">
                          {isHoliday.name}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex-1 space-y-0.5 md:space-y-1 mt-1 flex flex-col items-center md:items-stretch">
                      {dayLeaves.map((leave, i) => (
                        <div 
                          key={i} 
                          className={`text-[8px] md:text-[10px] font-bold p-0.5 md:px-1.5 md:py-1 rounded-full md:rounded-lg flex items-center justify-center md:justify-start gap-1 shadow-sm
                            ${leave.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 md:border border-emerald-200' : 
                              leave.status === 'Rejected' ? 'bg-red-50 text-red-700 md:border border-red-200' : 
                              'bg-amber-50 text-amber-700 md:border border-amber-200'}
                          `}
                          title={leave.type}
                        >
                          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${LEAVE_COLORS[leave.status]}`}></div>
                          <span className="hidden md:inline truncate">{leave.type}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
};

const RangePicker = ({ startDate, endDate, onChange }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [hoverDate, setHoverDate] = useState(null);
  const [selecting, setSelecting] = useState(false);

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });

  const handleDateClick = (date) => {
    if (!selecting || !startDate) {
      onChange(date, null);
      setSelecting(true);
    } else {
      if (isBefore(date, startDate)) {
        onChange(date, startDate);
      } else {
        onChange(startDate, date);
      }
      setSelecting(false);
    }
  };

  const handleMouseEnter = (date) => {
    if (selecting && startDate) {
      setHoverDate(date);
    }
  };

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(addMonths(currentMonth, -1));

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm select-none">
      <div className="flex justify-between items-center mb-4">
        <button type="button" onClick={prevMonth} className="p-1 hover:bg-slate-100 rounded text-slate-500 transition-colors">&lt;</button>
        <span className="font-bold text-slate-700">{format(currentMonth, 'MMMM yyyy')}</span>
        <button type="button" onClick={nextMonth} className="p-1 hover:bg-slate-100 rounded text-slate-500 transition-colors">&gt;</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day, i) => (
          <div key={i} className="text-xs font-bold text-slate-400">{day}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {Array.from({ length: getDay(startOfMonth(currentMonth)) }).map((_, i) => (
          <div key={`empty-${i}`} className="h-8"></div>
        ))}
        {days.map((date) => {
          let isSelected = false;
          let isInRange = false;
          
          const start = startDate ? startOfDay(startDate) : null;
          const end = endDate ? startOfDay(endDate) : (hoverDate ? startOfDay(hoverDate) : null);
          const current = startOfDay(date);

          if (start && isSameDay(current, start)) isSelected = true;
          if (endDate && isSameDay(current, startOfDay(endDate))) isSelected = true;

          if (start && end) {
            const rangeStart = isBefore(start, end) ? start : end;
            const rangeEnd = isBefore(start, end) ? end : start;
            if ((isAfter(current, rangeStart) || isSameDay(current, rangeStart)) && (isBefore(current, rangeEnd) || isSameDay(current, rangeEnd))) {
              isInRange = true;
            }
          }

          let className = "h-8 flex items-center justify-center text-sm rounded-lg cursor-pointer transition-colors ";
          if (isSelected) {
            className += "bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30";
          } else if (isInRange) {
            className += "bg-indigo-50 text-indigo-700 font-medium";
          } else {
            className += "hover:bg-slate-100 text-slate-700";
          }

          return (
            <div
              key={date.toISOString()}
              className={className}
              onClick={() => handleDateClick(date)}
              onMouseEnter={() => handleMouseEnter(date)}
            >
              {format(date, 'd')}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const NewTimeOffModal = ({ isOpen, onClose, user, onSuccess }) => {
  const [formData, setFormData] = useState({
    type: 'Paid',
    startDate: null,
    endDate: null,
    reason: '',
    attachment: null
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const calculateDays = () => {
    if (!formData.startDate || !formData.endDate) return 0;
    const start = startOfDay(formData.startDate);
    const end = startOfDay(formData.endDate);
    const rangeStart = isBefore(start, end) ? start : end;
    const rangeEnd = isBefore(start, end) ? end : start;
    
    let days = 0;
    const interval = eachDayOfInterval({ start: rangeStart, end: rangeEnd });
    interval.forEach(date => {
      const day = getDay(date);
      if (day !== 0 && day !== 6) days++; // excluding weekends for simplicity
    });
    return days;
  };

  const allocatedDays = calculateDays();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.startDate || !formData.endDate) {
      setError('Please select a valid date range.');
      return;
    }
    if (!formData.attachment) {
      setError('A supporting document (attachment) is required for all time off requests.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = new FormData();
      payload.append('type', formData.type);
      payload.append('startDate', format(formData.startDate, 'yyyy-MM-dd'));
      payload.append('endDate', format(formData.endDate, 'yyyy-MM-dd'));
      payload.append('reason', formData.reason || `Applied via self-view (${allocatedDays} days)`);
      if (formData.attachment) {
        payload.append('attachment', formData.attachment);
      }

      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/leave/apply`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: payload
      });

      if (!res.ok) {
        const data = await res.json().catch(()=>({}));
        throw new Error(data.error || 'Failed to submit request');
      }
      
      onSuccess();
      onClose();
      // Reset form
      setFormData({ type: 'Paid', startDate: null, endDate: null, reason: '', attachment: null });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/80">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <CalendarIcon size={20} className="text-indigo-600" />
            New Time Off
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 text-sm rounded-xl border border-red-200 flex items-start gap-2">
              <Info size={16} className="mt-0.5 shrink-0" /> {error}
            </div>
          )}

          <form id="timeoff-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Employee</label>
                <div className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-sm cursor-not-allowed">
                  {user?.displayName || 'Loading...'} (You)
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Time Off Type</label>
                <select 
                  value={formData.type} 
                  onChange={e => setFormData({...formData, type: e.target.value})}
                  className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm transition-all text-slate-700 font-medium"
                >
                  <option value="Paid">Paid Time Off</option>
                  <option value="Sick">Sick Leave</option>
                  <option value="Unpaid">Unpaid Leaves</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Validity Period <span className="text-slate-400 font-normal ml-1">(Click start & end dates)</span>
              </label>
              <RangePicker 
                startDate={formData.startDate} 
                endDate={formData.endDate} 
                onChange={(start, end) => setFormData({...formData, startDate: start, endDate: end})}
              />
            </div>

            <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 flex justify-between items-center">
              <span className="text-sm font-semibold text-slate-700">Allocation</span>
              <span className="text-lg font-black text-indigo-600">
                {allocatedDays} <span className="text-sm font-medium text-slate-500">Days</span>
              </span>
            </div>

            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                Supporting Document <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-slate-500 mb-2">Required proof for your time off request.</p>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-all group"
              >
                <UploadCloud size={24} className="mx-auto text-slate-400 mb-2 group-hover:text-indigo-500 transition-colors" />
                <span className="text-sm font-semibold text-slate-600 group-hover:text-indigo-700">
                  {formData.attachment ? formData.attachment.name : 'Click to upload document'}
                </span>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  onChange={e => setFormData({...formData, attachment: e.target.files[0]})} 
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                />
              </div>
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/80">
          <Button variant="ghost" type="button" onClick={onClose} className="text-slate-600 hover:bg-slate-200 font-semibold px-5">
            Discard
          </Button>
          <Button type="submit" form="timeoff-form" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20 px-6 font-bold">
            {loading ? 'Submitting...' : 'Submit'}
          </Button>
        </div>
      </div>
    </div>
  );
};

const TimeOff = ({ user }) => {
  const [leaves, setLeaves] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const currentYear = new Date();

  const fetchMyLeaves = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/leave/me`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setLeaves(Array.isArray(data) ? data : []);
    } catch (e) { console.error('Failed to fetch leaves:', e); }
  };

  useEffect(() => {
    fetchMyLeaves();
  }, []);

  // Compute taken balances 
  const paidTaken = leaves.filter(l => l.type === 'Paid' && l.status === 'Approved').length * 2; 
  const sickTaken = leaves.filter(l => l.type === 'Sick' && l.status === 'Approved').length * 2;
  
  const totalPaid = 24;
  const totalSick = 7;

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto min-h-full flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Time Off</h1>
          <p className="text-slate-500 mt-0.5 text-xs">Manage your leaves and track your available balances.</p>
        </div>
        <Button 
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20 gap-2 font-bold px-4 py-2 rounded-lg transition-all hover:scale-[1.02] active:scale-95 flex items-center text-sm"
        >
          <Plus size={18} strokeWidth={2.5} /> NEW
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        <Card className="p-4 border-transparent bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/20 relative overflow-hidden group hover:shadow-indigo-500/30 transition-shadow">
          <div className="absolute -top-4 -right-4 p-8 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:rotate-12 duration-500">
            <CalendarIcon size={100} />
          </div>
          <div className="relative z-10">
            <h3 className="text-blue-100 font-semibold mb-1 text-xs uppercase tracking-wider">Paid time Off</h3>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black tracking-tight">{Math.max(0, totalPaid - paidTaken)}</span>
              <span className="text-blue-100 font-medium text-sm">Days Available</span>
            </div>
            <div className="mt-3 w-full bg-black/20 rounded-full h-1 overflow-hidden">
              <div className="bg-white h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${((totalPaid - paidTaken)/totalPaid)*100}%` }}></div>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-transparent bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-lg shadow-teal-500/20 relative overflow-hidden group hover:shadow-teal-500/30 transition-shadow">
          <div className="absolute -top-4 -right-4 p-8 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:-rotate-12 duration-500">
             <CalendarIcon size={100} />
          </div>
          <div className="relative z-10">
            <h3 className="text-emerald-100 font-semibold mb-1 text-xs uppercase tracking-wider">Sick time off</h3>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black tracking-tight">0{Math.max(0, totalSick - sickTaken)}</span>
              <span className="text-emerald-100 font-medium text-sm">Days Available</span>
            </div>
            <div className="mt-3 w-full bg-black/20 rounded-full h-1 overflow-hidden">
              <div className="bg-white h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${((totalSick - sickTaken)/totalSick)*100}%` }}></div>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex flex-col lg:flex-row gap-5 flex-1">
        <div className="flex-1 flex flex-col w-full">
          <LargeSlidingCalendar leaves={leaves} />
        </div>

        {/* Right Rail */}
        <div className="w-full lg:w-56 shrink-0 space-y-4">
          <Card className="p-3 shadow-sm border-slate-100 sticky top-6">
            <h3 className="text-[10px] font-bold text-slate-800 mb-2 uppercase tracking-wider">Legend</h3>
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 group">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-50 group-hover:ring-emerald-100 transition-all"></div>
                <span className="text-xs font-semibold text-slate-700">Validated</span>
              </div>
              <div className="flex items-center gap-2 group">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-amber-50 group-hover:ring-amber-100 transition-all"></div>
                <span className="text-xs font-semibold text-slate-700">To Approve</span>
              </div>
              <div className="flex items-center gap-2 group">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-red-50 group-hover:ring-red-100 transition-all"></div>
                <span className="text-xs font-semibold text-slate-700">Refused</span>
              </div>
            </div>
          </Card>

          <Card className="p-3 shadow-sm border-slate-100">
            <h3 className="text-[10px] font-bold text-slate-800 mb-2 uppercase tracking-wider">Public Holidays</h3>
            <div className="space-y-2.5">
              {HOLIDAYS.map((holiday, i) => (
                <div key={i} className="flex flex-col">
                  <span className="text-[9px] font-bold text-indigo-500 mb-0.5">
                    {format(new Date(holiday.date), 'MMM do, yyyy')}
                  </span>
                  <span className="text-xs font-bold text-slate-700 leading-tight">{holiday.name}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Leave History Table for Employee to see their documents */}
      <div className="mt-6 bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800 mb-4">My Leave History</h3>
        {leaves.length === 0 ? (
          <p className="text-sm text-slate-500 italic">No leave records found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-bold text-slate-400 uppercase">
                  <th className="py-2 px-4">Type</th>
                  <th className="py-2 px-4">Dates</th>
                  <th className="py-2 px-4">Status</th>
                  <th className="py-2 px-4">Reason</th>
                  <th className="py-2 px-4 text-right">Document</th>
                </tr>
              </thead>
              <tbody>
                {leaves.map(leave => (
                  <tr key={leave.id} className="border-b border-slate-100 text-sm hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-semibold text-slate-700">{leave.type}</td>
                    <td className="py-3 px-4 text-slate-600">
                      {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        leave.status === 'Approved' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 
                        leave.status === 'Rejected' ? 'bg-rose-100 text-rose-700 border border-rose-200' : 
                        'bg-amber-100 text-amber-700 border border-amber-200'
                      }`}>
                        {leave.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 truncate max-w-[200px]" title={leave.reason}>{leave.reason}</td>
                    <td className="py-3 px-4 text-right">
                      {leave.attachment ? (
                        <a 
                          href={leave.attachment} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors border border-indigo-100"
                        >
                          View Proof ↗
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400 italic">None</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <NewTimeOffModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        user={user}
        onSuccess={fetchMyLeaves}
      />
    </div>
  );
};

export default TimeOff;

