/**
 * Compute employee attendance status from their data.
 * Centralised logic — used by EmployeeDirectory, cards, and table rows.
 *
 * @param {Object} emp - Employee object with status, leaves[], attendances[]
 * @returns {{ text: string, variant: string }}
 */
export function getEmployeeStatus(emp) {
  if (!emp) return { text: 'Unknown', variant: 'gray' };

  if (emp.status === 'Inactive') {
    return { text: 'Offboarded', variant: 'red' };
  }

  if (emp.status !== 'Active') {
    return { text: emp.status || 'Unknown', variant: 'gray' };
  }

  // Active employee — check leaves first
  if (emp.leaves && emp.leaves.length > 0) {
    return { text: 'On Leave', variant: 'amber' };
  }

  // Check today's attendance
  if (emp.attendances && emp.attendances.length > 0) {
    const todayAtt = emp.attendances[0];
    if (!todayAtt.checkOut) {
      return { text: 'Present', variant: 'emerald' };
    }
    const hours = (new Date(todayAtt.checkOut) - new Date(todayAtt.checkIn)) / (1000 * 60 * 60);
    if (hours >= 8) {
      return { text: 'Present', variant: 'emerald' };
    }
    return { text: 'Half Day', variant: 'amber' };
  }

  return { text: 'Absent', variant: 'rose' };
}

/**
 * Get the Tailwind class string for a status variant.
 * @param {string} variant
 * @returns {string}
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
 * @param {string} variant
 * @returns {string}
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
