const prisma = require('../config/db');
const { grantLeave } = require('../utils/leaveLedger');

/**
 * Calculates a prorated leave quota based on the employee's join date
 * relative to the policy's leave year.
 * 
 * A policy created in October shouldn't give a June joiner the same balance
 * as a January joiner — this prorates based on remaining months in the leave year.
 * 
 * @param {object} policy - The LeavePolicy object
 * @param {Date|string} dateOfJoining - Employee's join date
 * @returns {number} Prorated quota rounded to nearest 0.5
 */
function calculateProratedQuota(policy, dateOfJoining) {
  const annualQuota = parseFloat(policy.annualQuota);
  if (annualQuota <= 0) return 0;

  const now = new Date();
  
  // Determine the current leave year boundaries
  let yearStart = new Date(now.getFullYear(), (policy.leaveYearStartMonth || 1) - 1, policy.leaveYearStartDay || 1);
  if (yearStart > now) {
    yearStart.setFullYear(yearStart.getFullYear() - 1);
  }
  const yearEnd = new Date(yearStart);
  yearEnd.setFullYear(yearEnd.getFullYear() + 1);

  const totalDaysInYear = (yearEnd - yearStart) / (1000 * 60 * 60 * 24);
  
  const joiningDate = dateOfJoining ? new Date(dateOfJoining) : now;
  
  // Effective start is the later of: join date or leave year start
  const effectiveStart = joiningDate > yearStart ? joiningDate : yearStart;
  
  // If effective start is after year end, no grant
  if (effectiveStart >= yearEnd) return 0;
  
  const remainingDays = Math.max(0, (yearEnd - effectiveStart) / (1000 * 60 * 60 * 24));
  
  // Prorate and round to nearest 0.5
  const prorated = (remainingDays / totalDaysInYear) * annualQuota;
  return Math.round(prorated * 2) / 2;
}

/**
 * Asynchronously enrolls all active employees in a newly created leave policy.
 * Called via setImmediate from the createPolicy handler to avoid blocking the HTTP response.
 * 
 * Each user enrollment is independently try/caught so one failure doesn't block others.
 * When BullMQ + Redis infrastructure is wired up, this becomes the worker handler 
 * with zero logic changes.
 * 
 * @param {string} tenantId 
 * @param {object} policy - The created LeavePolicy record
 */
async function enrollAllUsersInPolicy(tenantId, policy) {
  try {
    const users = await prisma.basePrisma.user.findMany({
      where: { tenantId, status: 'Active' },
      select: { id: true, dateOfJoining: true }
    });

    console.log(`[LeaveEnrollment] Enrolling ${users.length} users in policy "${policy.name}" (${policy.policyGroupId})`);

    let enrolled = 0;
    let skipped = 0;
    let failed = 0;

    for (const user of users) {
      try {
        const proratedAmount = calculateProratedQuota(policy, user.dateOfJoining);
        
        if (proratedAmount > 0) {
          await prisma.basePrisma.$transaction(async (tx) => {
            await grantLeave(tx, {
              tenantId,
              userId: user.id,
              policyGroupId: policy.policyGroupId,
              amount: proratedAmount,
              reason: 'ANNUAL_GRANT'
            });
          }, { maxWait: 10000, timeout: 30000 });
          enrolled++;
        } else {
          skipped++;
        }
      } catch (err) {
        console.error(`[LeaveEnrollment] Failed for user ${user.id}:`, err.message);
        failed++;
      }
    }

    console.log(`[LeaveEnrollment] Done — enrolled: ${enrolled}, skipped: ${skipped}, failed: ${failed}`);
  } catch (err) {
    console.error('[LeaveEnrollment] Job failed:', err);
  }
}

module.exports = {
  calculateProratedQuota,
  enrollAllUsersInPolicy
};
