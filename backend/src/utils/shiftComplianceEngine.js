const { getShiftWindowForDate } = require('./shiftWindow');

const FIXED_DAYS_PER_MONTH = 30; // standardized 240h/mo convention

function isDateOnApprovedLeave(date, approvedLeaveRequests) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return approvedLeaveRequests.some(lr => {
    const start = new Date(lr.startDate);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(lr.endDate);
    end.setUTCHours(0, 0, 0, 0);
    return d >= start && d <= end;
  });
}

function computeShiftCompliance(attendances, shiftPolicy, baseSalary, approvedLeaveRequests = []) {
  const deductions = [];
  const bonuses = [];
  let totalOvertimeMinutes = 0;
  let totalLateMinutes = 0;
  let totalEarlyMinutes = 0;

  if (!shiftPolicy) {
    return { overtimeHours: 0, overtimeBonus: 0, lateDeductions: 0, totalLateMinutes: 0, deductions, bonuses };
  }

  for (const record of attendances) {
    if (!record.checkIn || !record.checkOut) continue;
    if (isDateOnApprovedLeave(record.date, approvedLeaveRequests)) continue; // Q3: approved leave suppresses timing checks

    const { shiftStart, shiftEnd, shiftHours } = getShiftWindowForDate(shiftPolicy, record.date);
    const graceMs = shiftPolicy.graceMinutes * 60_000;

    const checkInMs = new Date(record.checkIn).getTime();
    const checkOutMs = new Date(record.checkOut).getTime();

    const isLate = checkInMs > (shiftStart.getTime() + graceMs);
    const lateMinutes = isLate ? Math.max(0, (checkInMs - shiftStart.getTime()) / 60_000) : 0;
    const overtimeMinutes = Math.max(0, (checkOutMs - shiftEnd.getTime()) / 60_000);
    const earlyMinutes = checkOutMs < shiftEnd.getTime() ? Math.max(0, (shiftEnd.getTime() - checkOutMs) / 60_000) : 0;

    const formattedDate = new Date(record.date).toISOString().split('T')[0];

    if (lateMinutes > 0) {
      totalLateMinutes += lateMinutes;
      const amt = Number((lateMinutes * shiftPolicy.lateDeductionPerMinute).toFixed(2));
      deductions.push({
        date: formattedDate,
        type: 'late_arrival',
        minutes: Math.round(lateMinutes),
        amount: amt,
        description: `Late arrival — ${Math.round(lateMinutes)} min beyond grace period`,
      });
    }

    if (earlyMinutes > 0) {
      totalEarlyMinutes += earlyMinutes;
      const amt = Number((earlyMinutes * shiftPolicy.lateDeductionPerMinute).toFixed(2));
      deductions.push({
        date: formattedDate,
        type: 'early_departure',
        minutes: Math.round(earlyMinutes),
        amount: amt,
        description: `Early departure — ${Math.round(earlyMinutes)} min before shift end`,
      });
    }

    if (overtimeMinutes >= shiftPolicy.minOvertimeMinutes) {
      totalOvertimeMinutes += overtimeMinutes;
      const hourlyRate = baseSalary / (FIXED_DAYS_PER_MONTH * shiftHours);
      const otHours = overtimeMinutes / 60;
      const amt = Number((otHours * hourlyRate * shiftPolicy.overtimeRateMultiplier).toFixed(2));
      bonuses.push({
        date: formattedDate,
        type: 'overtime',
        hours: Number(otHours.toFixed(2)),
        amount: amt,
        description: `Overtime — ${otHours.toFixed(1)}h beyond shift end at ${shiftPolicy.overtimeRateMultiplier}x`,
      });
    }
  }

  const overtimeBonus = Number(bonuses.reduce((sum, b) => sum + b.amount, 0).toFixed(2));
  const lateDeductions = Number(deductions.reduce((sum, d) => sum + d.amount, 0).toFixed(2)); // Q2: late + early combined

  return {
    overtimeHours: Number((totalOvertimeMinutes / 60).toFixed(2)),
    overtimeBonus,
    lateDeductions,
    totalLateMinutes: Math.round(totalLateMinutes + totalEarlyMinutes),
    deductions,
    bonuses,
  };
}

module.exports = { computeShiftCompliance, isDateOnApprovedLeave };
