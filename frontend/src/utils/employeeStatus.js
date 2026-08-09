/**
 * Calculates the active shift window based on the employee's policy and current time.
 */
export function getActiveShiftWindow(shiftPolicy, referenceDate = new Date()) {
  const policy = shiftPolicy || { startTime: '09:00', endTime: '18:00' };
  
  const getShiftForDate = (dateObj) => {
    const [startH, startM] = policy.startTime.split(':').map(Number);
    const [endH, endM] = policy.endTime.split(':').map(Number);
    
    const start = new Date(dateObj);
    start.setHours(startH, startM, 0, 0);
    
    const end = new Date(dateObj);
    end.setHours(endH, endM, 0, 0);
    
    if ((endH * 60 + endM) < (startH * 60 + startM)) {
      end.setDate(end.getDate() + 1); // Overnight shift
    }
    
    return { start, end, baseDate: new Date(dateObj) };
  };

  const now = referenceDate.getTime();
  
  // 1. Try today's shift candidate
  const todayCandidate = getShiftForDate(referenceDate);
  const isTodayActive = now >= (todayCandidate.start.getTime() - 4 * 3600000) && now <= (todayCandidate.end.getTime() + 6 * 3600000);
  
  if (isTodayActive) return todayCandidate;
  
  // 2. Check yesterday's shift (useful for night shifts checking in the morning)
  const yesterdayDate = new Date(referenceDate);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayCandidate = getShiftForDate(yesterdayDate);
  const isYesterdayActive = now >= (yesterdayCandidate.start.getTime() - 4 * 3600000) && now <= (yesterdayCandidate.end.getTime() + 6 * 3600000);
  
  if (isYesterdayActive) return yesterdayCandidate;

  return todayCandidate;
}

/**
 * Compute employee attendance status from their data, context-aware.
 *
 * @param {Object} emp - Employee object
 * @returns {{ text: string, variant: string }}
 */
export function getEmployeeStatus(emp) {
  if (!emp) return { text: 'Unknown', variant: 'gray' };

  if (emp.status === 'Inactive') return { text: 'Offboarded', variant: 'red' };
  if (emp.status !== 'Active') return { text: emp.status || 'Unknown', variant: 'gray' };

  if (emp.leaves && emp.leaves.length > 0) return { text: 'On Leave', variant: 'amber' };

  const activeShift = getActiveShiftWindow(emp.shiftPolicy);
  const now = new Date();
  
  // Find an attendance record that belongs to the active shift window
  const activeRecord = emp.attendances?.find(a => {
    if (!a.checkIn) return false;
    const checkInTime = new Date(a.checkIn).getTime();
    // Allow check-ins from 4 hours before to 6 hours after shift
    return checkInTime >= (activeShift.start.getTime() - 4 * 3600000) && 
           checkInTime <= (activeShift.end.getTime() + 6 * 3600000);
  });

  if (activeRecord) {
    if (!activeRecord.checkOut) {
      return { text: 'Present', variant: 'emerald' }; // Clocked in actively
    }
    const hours = (new Date(activeRecord.checkOut) - new Date(activeRecord.checkIn)) / (1000 * 60 * 60);
    if (hours >= 8) {
      return { text: 'Present', variant: 'emerald' };
    }
    return { text: 'Half Day', variant: 'amber' };
  }

  // No active record found
  const dayOfWeek = now.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  if (isWeekend) {
    return { text: 'Off Day', variant: 'gray' };
  }

  if (now < activeShift.start) {
    return { text: 'Upcoming Shift', variant: 'gray' };
  } else if (now > activeShift.end) {
    return { text: 'Absent', variant: 'rose' };
  } else {
    return { text: 'Late / Pending', variant: 'rose' };
  }
}

/**
 * Get the Tailwind class string for a status variant.
 */
export function getStatusClasses(variant) {
  const map = {
    emerald: 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
    amber:   'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400',
    rose:    'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400',
    red:     'bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400',
    gray:    'bg-slate-500/10 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400',
  };
  return map[variant] || map.gray;
}

/**
 * Get the dot color class for the pulsing status indicator.
 */
export function getStatusDotColor(variant) {
  const map = {
    emerald: 'bg-emerald-500',
    amber:   'bg-amber-500',
    rose:    'bg-rose-500',
    red:     'bg-red-500',
    gray:    'bg-slate-400',
  };
  return map[variant] || map.gray;
}
