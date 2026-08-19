async function gatherUserMetrics(basePrisma, tenantId, userId, joinDate) {
  const now = new Date();
  const day30Ago = new Date(now - 30 * 86400000);
  const day90Ago = new Date(now - 90 * 86400000);
  const month3Ago = new Date(now - 90 * 86400000);

  const hasEnoughHistory = joinDate && (now - new Date(joinDate)) >= 90 * 86400000;

  // Overtime trend
  const recentAttendance = await basePrisma.attendance.findMany({
    where: { tenantId, userId, date: { gte: day30Ago } },
    select: { extraHours: true, checkIn: true },
  });
  const baselineAttendance = await basePrisma.attendance.findMany({
    where: { tenantId, userId, date: { gte: day90Ago, lt: day30Ago } },
    select: { extraHours: true, checkIn: true },
  });

  const avg = (arr, field) => arr.length ? arr.reduce((s, r) => s + (r[field] || 0), 0) / arr.length : 0;
  const recentAvgExtraHours = avg(recentAttendance, 'extraHours');
  const baselineAvgExtraHours = avg(baselineAttendance, 'extraHours');

  // Attendance variance (std dev of check-in time-of-day)
  const toMinutesSinceMidnight = (d) => d.getHours() * 60 + d.getMinutes();
  const stdDev = (arr) => {
    if (arr.length < 2) return 0;
    const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
    const variance = arr.reduce((s, v) => s + (v - mean) ** 2, 0) / arr.length;
    return Math.sqrt(variance);
  };
  const recentCheckInStdDevMinutes = stdDev(recentAttendance.filter(r => r.checkIn).map(r => toMinutesSinceMidnight(new Date(r.checkIn))));
  const baselineCheckInStdDevMinutes = stdDev(baselineAttendance.filter(r => r.checkIn).map(r => toMinutesSinceMidnight(new Date(r.checkIn))));

  // Leave frequency — sick / short-notice leave count in the last 3 months.
  // Using leavePolicy.name to find 'Sick' and evaluating short notice dynamically.
  const leaves = await basePrisma.leave.findMany({
    where: {
      tenantId, userId,
      createdAt: { gte: month3Ago },
    },
    include: { leavePolicy: true },
  });

  let sickOrShortNoticeLeaveCountLast3Months = 0;
  for (const leave of leaves) {
    const isSick = leave.leavePolicy?.name?.toLowerCase().includes('sick');
    // Consider short notice if start date is within 48 hours of creation
    const isShortNotice = (new Date(leave.startDate) - new Date(leave.createdAt)) < 48 * 3600000;
    if (isSick || isShortNotice) {
      sickOrShortNoticeLeaveCountLast3Months++;
    }
  }

  return {
    hasEnoughHistory,
    recentAvgExtraHours,
    baselineAvgExtraHours,
    recentCheckInStdDevMinutes,
    sickOrShortNoticeLeaveCountLast3Months,
    intelligenceSignals: await basePrisma.intelligenceSignal.findMany({
      where: {
        tenantId,
        userId,
        lifecycleState: { notIn: ['DISMISSED', 'EXPIRED'] }
      }
    })
  };
}

module.exports = { gatherUserMetrics };
