const prisma = require('../config/db');

/**
 * Checks if managerId is anywhere in employeeId's upward manager chain.
 * Reused by Performance Management and Leave Management.
 * Traverses up to 10 levels to prevent infinite loops.
 * 
 * @param {string} managerId - The potential manager's user ID
 * @param {string} employeeId - The employee's user ID
 * @returns {boolean} True if managerId is in the upward chain of employeeId
 */
async function isManagerOf(managerId, employeeId) {
  if (managerId === employeeId) return false;
  let currentEmployee = await prisma.user.findUnique({ where: { id: employeeId }, select: { managerId: true } });
  
  let levels = 0;
  while (currentEmployee && currentEmployee.managerId && levels < 10) {
    if (currentEmployee.managerId === managerId) return true;
    currentEmployee = await prisma.user.findUnique({ where: { id: currentEmployee.managerId }, select: { managerId: true } });
    levels++;
  }
  return false;
}

/**
 * Returns the ordered list of managers above a user (direct manager first, then skip-level, etc.).
 * Used to route a manager's own leave requests to the next level up.
 * 
 * @param {string} userId - The user whose manager chain to retrieve
 * @param {number} maxLevels - Maximum levels to traverse (default 10)
 * @returns {Array<string>} Array of manager user IDs, ordered from direct manager upward
 */
async function getManagerChain(userId, maxLevels = 10) {
  const chain = [];
  let current = await prisma.user.findUnique({ where: { id: userId }, select: { managerId: true } });
  
  let levels = 0;
  while (current && current.managerId && levels < maxLevels) {
    chain.push(current.managerId);
    current = await prisma.user.findUnique({ where: { id: current.managerId }, select: { managerId: true } });
    levels++;
  }
  return chain;
}

/**
 * Collects all subordinate IDs (direct + skip-level) for a manager.
 * Uses the same recursive pattern as Performance Management's getGoals.
 * 
 * @param {string} managerId - The manager's user ID
 * @param {string} tenantId - Tenant scope
 * @param {number} maxLevels - Maximum depth to traverse (default 5)
 * @returns {Array<string>} Array of subordinate user IDs
 */
async function getSubordinateIds(managerId, tenantId, maxLevels = 5) {
  const teamIds = [];
  
  const fetchSubordinates = async (currentManagerId, level = 0) => {
    if (level >= maxLevels) return;
    const subs = await prisma.user.findMany({
      where: { managerId: currentManagerId, tenantId },
      select: { id: true }
    });
    for (const sub of subs) {
      teamIds.push(sub.id);
      await fetchSubordinates(sub.id, level + 1);
    }
  };
  
  await fetchSubordinates(managerId);
  return teamIds;
}

module.exports = {
  isManagerOf,
  getManagerChain,
  getSubordinateIds
};
