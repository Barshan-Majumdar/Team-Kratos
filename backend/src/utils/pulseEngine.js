const state = new Map(); // tenantId -> TenantPulseState

function getOrCreateTenantState(tenantId) {
  if (!state.has(tenantId)) {
    state.set(tenantId, {
      presentUsers: new Map(),      // userId -> hourlyRate
      cumulativeCostToday: 0,
      lastResetDate: new Date().toDateString(),
      rollingHistory: [],           // { timestamp, headcount, burnRate, cumulativeCost }
      recentEvents: [],             // { type, userId, displayName, department, avatarUrl, timestamp }
    });
  }
  return state.get(tenantId);
}

function resetIfNewDay(tenantState) {
  const today = new Date().toDateString();
  if (tenantState.lastResetDate !== today) {
    tenantState.cumulativeCostToday = 0;
    tenantState.lastResetDate = today;
  }
}

function computeSnapshot(tenantState) {
  const headcount = tenantState.presentUsers.size;
  const burnRate = [...tenantState.presentUsers.values()].reduce((sum, r) => sum + r, 0);
  return { headcount, burnRate, cumulativeCost: tenantState.cumulativeCostToday };
}

function pushHistoryPoint(tenantState) {
  const snap = computeSnapshot(tenantState);
  tenantState.rollingHistory.push({ timestamp: Date.now(), ...snap });
  if (tenantState.rollingHistory.length > 30) tenantState.rollingHistory.shift();
  return snap;
}

function pushEvent(tenantState, type, user) {
  tenantState.recentEvents.unshift({
    type,
    userId: user.id,
    displayName: user.displayName,
    department: user.department,
    avatarUrl: user.avatarUrl || null,
    timestamp: Date.now(),
  });
  if (tenantState.recentEvents.length > 20) tenantState.recentEvents.pop();
}

async function seedStateFromDB(prisma, tenantId) {
  const tenantState = getOrCreateTenantState(tenantId);
  
  // Find currently clocked-in users (checkIn exists, checkOut is null)
  const activeAttendance = await prisma.attendance.findMany({
    where: { tenantId, checkOut: null },
    include: { user: { select: { id: true, displayName: true, department: true, avatar: true, baseSalary: true } } },
  });

  // Clear current Map and rebuild it to avoid drift or double-clock entries
  tenantState.presentUsers.clear();

  for (const record of activeAttendance) {
    if (record.user) {
      tenantState.presentUsers.set(record.user.id, (record.user.baseSalary || 0) / 240);
    }
  }
  pushHistoryPoint(tenantState);
  return tenantState;
}

function registerCheckIn(tenantId, user) {
  const tenantState = getOrCreateTenantState(tenantId);
  resetIfNewDay(tenantState);
  tenantState.presentUsers.set(user.id, (user.baseSalary || 0) / 240);
  pushEvent(tenantState, 'checkin', user);
  return pushHistoryPoint(tenantState);
}

function registerCheckOut(tenantId, user) {
  const tenantState = getOrCreateTenantState(tenantId);
  resetIfNewDay(tenantState);
  tenantState.presentUsers.delete(user.id);
  pushEvent(tenantState, 'checkout', user);
  return pushHistoryPoint(tenantState);
}

function tickAllTenants() {
  for (const [tenantId, tenantState] of state.entries()) {
    resetIfNewDay(tenantState);
    const { burnRate } = computeSnapshot(tenantState);
    tenantState.cumulativeCostToday += burnRate / 60; // accrued cost per minute
    pushHistoryPoint(tenantState);
  }
}

function getTenantState(tenantId) {
  const tenantState = getOrCreateTenantState(tenantId);
  return {
    ...computeSnapshot(tenantState),
    rollingHistory: tenantState.rollingHistory,
    recentEvents: tenantState.recentEvents,
  };
}

function getActiveTenantIds() {
  return [...state.keys()];
}

function clearStateForTesting(tenantId) {
  state.delete(tenantId);
}

module.exports = {
  seedStateFromDB,
  registerCheckIn,
  registerCheckOut,
  tickAllTenants,
  getTenantState,
  getActiveTenantIds,
  clearStateForTesting,
};
// NOTE: Single-process in-memory state. In cluster environments, utilize Redis-backed state adapter.
