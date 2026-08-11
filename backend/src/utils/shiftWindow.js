/**
 * Returns { shiftStart, shiftEnd, shiftHours } as Date objects and duration for a given date,
 * correctly handling overnight shifts (e.g. 22:00 -> 06:00) by rolling shiftEnd
 * forward by a day when endTime is numerically before startTime.
 * All computations are performed in UTC to remain host-timezone-independent.
 */
function getShiftWindowForDate(shiftPolicy, date) {
  const [startH, startM] = shiftPolicy.startTime.split(':').map(Number);
  const [endH, endM] = shiftPolicy.endTime.split(':').map(Number);

  // Set baseline to local time of the target date
  const shiftStart = new Date(date);
  shiftStart.setHours(startH, startM, 0, 0);

  const shiftEnd = new Date(date);
  shiftEnd.setHours(endH, endM, 0, 0);

  const isOvernight = (endH * 60 + endM) < (startH * 60 + startM);
  if (isOvernight) {
    shiftEnd.setDate(shiftEnd.getDate() + 1);
  }

  const shiftHours = (shiftEnd.getTime() - shiftStart.getTime()) / 3600000;

  return { shiftStart, shiftEnd, shiftHours };
}

module.exports = { getShiftWindowForDate };
