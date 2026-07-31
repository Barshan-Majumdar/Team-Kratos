const MIN_OVERLAP_HOURS_THRESHOLD = 3;   // per pair, over the whole 30-day window
const MIN_OVERLAP_DAYS_THRESHOLD = 3;    // alternative qualifying condition

function overlapHours(checkIn1, checkOut1, checkIn2, checkOut2) {
  const start = Math.max(new Date(checkIn1).getTime(), new Date(checkIn2).getTime());
  const end = Math.min(new Date(checkOut1).getTime(), new Date(checkOut2).getTime());
  return Math.max(0, end - start) / 3_600_000;
}

/**
 * attendanceRecords: all Present, checked-out Attendance rows for the tenant
 * over the analysis window, each with { userId, officeId, date, checkIn, checkOut }.
 * users: [{ id, displayName, department }] for node metadata.
 */
function computeColocationGraph(attendanceRecords, users) {
  const userMap = new Map(users.map(u => [u.id, u]));

  // Group by officeId + date
  const groups = new Map();
  for (const record of attendanceRecords) {
    if (!record.officeId || !record.date) continue;
    const dateStr = record.date instanceof Date ? record.date.toISOString().slice(0, 10) : String(record.date).slice(0, 10);
    const key = `${record.officeId}:${dateStr}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(record);
  }

  // pairKey -> { totalHours, days }
  const pairStats = new Map();
  const pairKey = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);

  for (const [groupKey, records] of groups.entries()) {
    const dateStr = groupKey.split(':')[1];
    for (let i = 0; i < records.length; i++) {
      for (let j = i + 1; j < records.length; j++) {
        const a = records[i], b = records[j];
        if (a.userId === b.userId) continue;
        const hours = overlapHours(a.checkIn, a.checkOut, b.checkIn, b.checkOut);
        if (hours <= 0) continue;

        const key = pairKey(a.userId, b.userId);
        if (!pairStats.has(key)) pairStats.set(key, { totalHours: 0, days: new Set() });
        const stat = pairStats.get(key);
        stat.totalHours += hours;
        stat.days.add(dateStr);
      }
    }
  }

  const links = [];
  const involvedUserIds = new Set();
  for (const [key, stat] of pairStats.entries()) {
    const qualifies = stat.totalHours >= MIN_OVERLAP_HOURS_THRESHOLD || stat.days.size >= MIN_OVERLAP_DAYS_THRESHOLD;
    if (!qualifies) continue;
    const [source, target] = key.split('|');
    links.push({ source, target, value: Number(stat.totalHours.toFixed(1)), daysOverlapped: stat.days.size });
    involvedUserIds.add(source);
    involvedUserIds.add(target);
  }

  const nodes = [...involvedUserIds].map(id => {
    const u = userMap.get(id);
    return { id, name: u?.displayName || 'Unknown', department: u?.department || 'Unassigned' };
  });

  return { nodes, links };
}

module.exports = { computeColocationGraph, overlapHours };
