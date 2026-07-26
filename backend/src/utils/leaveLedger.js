const prisma = require('../config/db');

/**
 * Acquire a Postgres advisory lock to serialize ledger operations
 * for a specific user and policy group.
 * MUST be called within an active Prisma transaction.
 */
async function acquireAdvisoryLock(tx, tenantId, userId, policyGroupId) {
  // Use hashtext to convert the string key into an integer suitable for pg_advisory_xact_lock
  // The lock is automatically released when the transaction ends (commits or rolls back).
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${tenantId || ''} || ${userId} || ${policyGroupId}))`;
}

/**
 * Gets the current available balance for a user and policy group.
 * @param {object} tx Prisma transaction object.
 * @param {string} tenantId 
 * @param {string} userId 
 * @param {string} policyGroupId 
 * @returns {number} The current sum of the ledger amounts (can be negative).
 */
async function getAvailableBalance(tx, tenantId, userId, policyGroupId) {
  const result = await tx.leaveLedgerEntry.aggregate({
    _sum: {
      amount: true
    },
    where: {
      tenantId,
      userId,
      policyGroupId
    }
  });
  return parseFloat(result._sum.amount || 0);
}

/**
 * Grants leave credits (e.g. ANNUAL_GRANT, CARRY_FORWARD, ACCRUAL)
 * @param {object} tx Prisma transaction object.
 * @param {object} params Object with { tenantId, userId, policyGroupId, amount, reason }
 */
async function grantLeave(tx, { tenantId, userId, policyGroupId, amount, reason }) {
  await acquireAdvisoryLock(tx, tenantId, userId, policyGroupId);
  
  return await tx.leaveLedgerEntry.create({
    data: {
      tenantId,
      userId,
      policyGroupId,
      amount,
      reason
    }
  });
}

/**
 * Reserves leave by inserting a PENDING_HOLD debit entry.
 * Optionally throws if balance would drop below zero and policy blocks negative balances.
 * @param {object} tx Prisma transaction object.
 * @param {object} params Object with { tenantId, userId, policyGroupId, amount, leaveRequestId, allowNegativeBalance }
 */
async function reserveLeave(tx, { tenantId, userId, policyGroupId, amount, leaveRequestId, allowNegativeBalance }) {
  await acquireAdvisoryLock(tx, tenantId, userId, policyGroupId);
  
  const currentBalance = await getAvailableBalance(tx, tenantId, userId, policyGroupId);
  
  if (!allowNegativeBalance && (currentBalance - amount) < 0) {
    throw new Error(`Insufficient leave balance. Available: ${currentBalance}, Requested: ${amount}`);
  }
  
  return await tx.leaveLedgerEntry.create({
    data: {
      tenantId,
      userId,
      policyGroupId,
      amount: -amount, // Debit
      reason: 'PENDING_HOLD',
      leaveRequestId
    }
  });
}

/**
 * Reverses a PENDING_HOLD debit (used on rejection or cancellation).
 * @param {object} tx Prisma transaction object.
 * @param {string} tenantId 
 * @param {string} reversedEntryId The ID of the original PENDING_HOLD ledger entry.
 */
async function reverseLeave(tx, tenantId, reversedEntryId) {
  const originalEntry = await tx.leaveLedgerEntry.findUnique({
    where: { id: reversedEntryId }
  });
  
  if (!originalEntry || originalEntry.tenantId !== tenantId) {
    throw new Error('Original ledger entry not found or access denied.');
  }
  
  if (originalEntry.reason !== 'PENDING_HOLD') {
    throw new Error('Only PENDING_HOLD entries can be reversed.');
  }

  await acquireAdvisoryLock(tx, originalEntry.tenantId, originalEntry.userId, originalEntry.policyGroupId);
  
  // A reversal is a credit equal in magnitude to the debit
  const reversalAmount = Math.abs(parseFloat(originalEntry.amount));
  
  return await tx.leaveLedgerEntry.create({
    data: {
      tenantId: originalEntry.tenantId,
      userId: originalEntry.userId,
      policyGroupId: originalEntry.policyGroupId,
      amount: reversalAmount,
      reason: 'REVERSAL',
      leaveRequestId: originalEntry.leaveRequestId,
      reversedEntryId: originalEntry.id
    }
  });
}

/**
 * Automatically enrolls a new user into all active leave policies for the tenant.
 * Grants a prorated quota based on the user's dateOfJoining relative to each policy's leave year.
 * @param {string} tenantId 
 * @param {string} userId 
 * @param {Date|string|null} dateOfJoining - Employee's join date for proration
 */
async function enrollUserInLeaves(tenantId, userId, dateOfJoining) {
  const { calculateProratedQuota } = require('../jobs/leaveEnrollmentJob');
  
  // 1. Get all unique active policies
  const policies = await prisma.leavePolicy.findMany({
    where: { tenantId, isArchived: false, policyGroupId: { not: null } },
    orderBy: { effectiveFrom: 'desc' }
  });

  const uniquePoliciesMap = new Map();
  for (const p of policies) {
    if (!uniquePoliciesMap.has(p.policyGroupId)) {
      uniquePoliciesMap.set(p.policyGroupId, p);
    }
  }

  // 2. Grant prorated quota for each policy
  for (const policy of uniquePoliciesMap.values()) {
    const proratedAmount = calculateProratedQuota(policy, dateOfJoining);
    if (proratedAmount > 0) {
      try {
        await prisma.$transaction(async (tx) => {
          await grantLeave(tx, {
            tenantId,
            userId,
            policyGroupId: policy.policyGroupId,
            amount: proratedAmount,
            reason: 'ANNUAL_GRANT'
          });
        }, { maxWait: 10000, timeout: 30000 });
      } catch (err) {
        console.error(`Failed to enroll user ${userId} in policy ${policy.name}:`, err);
      }
    }
  }
}

module.exports = {
  acquireAdvisoryLock,
  getAvailableBalance,
  grantLeave,
  reserveLeave,
  reverseLeave,
  enrollUserInLeaves
};
