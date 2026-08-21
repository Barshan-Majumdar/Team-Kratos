/**
 * Returns { shiftStart, shiftEnd, shiftHours } as Date objects and duration for a given date,
 * correctly handling overnight shifts (e.g. 22:00 -> 06:00) by rolling shiftEnd
 * forward by a day when endTime is numerically before startTime.
 * All computations are performed in UTC to remain host-timezone-independent.
 */
function getShiftWindowForDate(shiftPolicy, date) {
  const [startH, startM] = shiftPolicy.startTime.split(':').map(Number);
  const [endH, endM] = shiftPolicy.endTime.split(':').map(Number);

  const dateString = new Intl.DateTimeFormat('en-CA', { 
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' 
  }).format(date);

  const hhS = String(startH).padStart(2, '0');
  const mmS = String(startM).padStart(2, '0');
  const shiftStart = new Date(`${dateString}T${hhS}:${mmS}:00+05:30`);

  const hhE = String(endH).padStart(2, '0');
  const mmE = String(endM).padStart(2, '0');
  const shiftEnd = new Date(`${dateString}T${hhE}:${mmE}:00+05:30`);

  const isOvernight = (endH * 60 + endM) < (startH * 60 + startM);
  if (isOvernight) {
    shiftEnd.setDate(shiftEnd.getDate() + 1);
  }

  const shiftHours = (shiftEnd.getTime() - shiftStart.getTime()) / 3600000;

  return { shiftStart, shiftEnd, shiftHours };
}

module.exports = { getShiftWindowForDate };
