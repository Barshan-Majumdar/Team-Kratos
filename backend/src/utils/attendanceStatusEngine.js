const { getShiftWindowForDate } = require('./shiftWindow');

/**
 * Derive attendance status from actual hours worked against the tenant's shift policy.
 *
 * Thresholds (for a 09:00–18:00 shift, 60min break, 15min grace):
 *   >= 7.75h  → Present
 *   >= 4.0h   → HalfDay
 *   <  4.0h   → Absent (insufficient)
 *
 * All boundaries are derived from ShiftPolicy fields — nothing is hardcoded.
 *
 * @param {number} netWorkHours — actual net hours worked (after break deduction)
 * @param {object} shiftPolicy — the tenant/user's ShiftPolicy record
 * @param {Date}   recordDate  — the attendance record's date (used for shift window calculation)
 * @returns {string} 'Present' | 'HalfDay' | 'Absent'
 */
function deriveAttendanceStatus(netWorkHours, shiftPolicy, recordDate) {
  const { shiftHours } = getShiftWindowForDate(shiftPolicy, recordDate);
  const breakHours = (shiftPolicy.breakDurationMinutes ?? 60) / 60;
  const expectedNetHours = shiftHours - breakHours;
  const graceHours = (shiftPolicy.gracePeriodMinutes ?? 15) / 60;

  const fullDayFloor = expectedNetHours - graceHours;
  const halfDayFloor = expectedNetHours / 2;

  if (netWorkHours >= fullDayFloor) return 'Present';
  if (netWorkHours >= halfDayFloor)  return 'HalfDay';
  return 'Absent';
}

module.exports = { deriveAttendanceStatus };
