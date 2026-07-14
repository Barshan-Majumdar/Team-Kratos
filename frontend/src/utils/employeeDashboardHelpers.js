import { format, subDays, eachDayOfInterval, startOfMonth, endOfMonth, isSameDay, differenceInHours, differenceInMinutes, isBefore, isAfter, startOfDay } from 'date-fns';

/**
 * Calculates the current consecutive days worked streak.
 * @param {Array} attendanceData - Array of attendance records
 * @returns {number} Current streak in days
 */
export const calculateStreak = (attendanceData) => {
  if (!attendanceData || attendanceData.length === 0) return 0;
  
  // Sort descending by date
  const sorted = [...attendanceData].sort((a, b) => new Date(b.date) - new Date(a.date));
  let streak = 0;
  const today = startOfDay(new Date());

  for (let i = 0; i < sorted.length; i++) {
    const recordDate = startOfDay(new Date(sorted[i].date));
    
    // We only care about consecutive days
    const expectedDate = subDays(today, streak);
    
    if (isSameDay(recordDate, expectedDate) && sorted[i].status === 'Present') {
      streak++;
    } else if (isBefore(recordDate, expectedDate)) {
      break; // Streak broken
    }
  }
  return streak;
};

/**
 * Generates data for the Recharts weekly check-in graph.
 * @param {Array} attendanceData 
 * @returns {Array} Array of last 7 days with hours worked.
 */
export const getWeeklyChartData = (attendanceData) => {
  const today = new Date();
  const last7Days = eachDayOfInterval({
    start: subDays(today, 6),
    end: today
  });

  return last7Days.map(date => {
    const record = attendanceData.find(a => isSameDay(new Date(a.date), date));
    let hoursWorked = 0;
    
    if (record && record.clockIn && record.clockOut) {
      const start = new Date(record.clockIn);
      const end = new Date(record.clockOut);
      hoursWorked = differenceInMinutes(end, start) / 60;
    } else if (record && record.status === 'Present') {
      hoursWorked = 8;
    }

    return {
      day: format(date, 'EEE'),
      fullDate: format(date, 'MMM do'),
      hours: Number(hoursWorked.toFixed(1))
    };
  });
};

/**
 * Generates heatmap data for the current month.
 * @param {Array} attendanceData 
 * @param {Array} leaves 
 * @returns {Array} Array of objects { date, status, level }
 */
export const generateHeatmapData = (attendanceData, leaves) => {
  const today = new Date();
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  return daysInMonth.map(date => {
    const attendanceRecord = attendanceData.find(a => isSameDay(new Date(a.date), date));
    
    const leaveRecord = leaves.find(l => {
      if (l.status !== 'Approved') return false;
      const lStart = startOfDay(new Date(l.startDate));
      const lEnd = startOfDay(new Date(l.endDate));
      const current = startOfDay(date);
      return (isSameDay(current, lStart) || isAfter(current, lStart)) && 
             (isSameDay(current, lEnd) || isBefore(current, lEnd));
    });

    let status = 'none';
    let level = 0;
    let label = 'No record';

    if (attendanceRecord && attendanceRecord.status === 'Present') {
      status = 'present';
      level = 2;
      label = 'Present';
      
      if (attendanceRecord.clockIn && attendanceRecord.clockOut) {
         const hrs = differenceInHours(new Date(attendanceRecord.clockOut), new Date(attendanceRecord.clockIn));
         if (hrs > 8) level = 3;
      }
    } else if (leaveRecord) {
      status = 'leave';
      level = 1;
      label = `${leaveRecord.type} Leave`;
    } else if (isBefore(date, today) || isSameDay(date, today)) {
      const dayOfWeek = date.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        status = 'absent';
        label = 'Absent';
      } else {
        status = 'weekend';
        label = 'Weekend';
      }
    }

    return {
      date,
      status,
      level,
      label,
      dateString: format(date, 'yyyy-MM-dd')
    };
  });
};
