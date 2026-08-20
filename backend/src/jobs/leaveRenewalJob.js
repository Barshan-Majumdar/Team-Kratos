const prisma = require('../config/db');
const { getAvailableBalance } = require('../utils/leaveLedger');

/**
 * Runs daily. Finds any leave policies where the leaveYearStartMonth and leaveYearStartDay
 * match "today". For each such policy, it evaluates every active employee's carry-forward
 * and issues a new ANNUAL_GRANT.
 */
const runLeaveRenewal = async () => {
  try {
    const today = new Date();
    const month = today.getMonth() + 1; // 1-12
    const day = today.getDate();

    // 1. Find all active policies that renew today
    const policies = await prisma.basePrisma.leavePolicy.findMany({
      where: {
        isArchived: false,
        leaveYearStartMonth: month,
        leaveYearStartDay: day
      },
      orderBy: { effectiveFrom: 'desc' }
    });

    // 2. Group by tenant and unique policyGroupId
    const uniquePoliciesMap = new Map();
    for (const p of policies) {
      const key = `${p.tenantId}_${p.policyGroupId}`;
      if (!uniquePoliciesMap.has(key)) {
        uniquePoliciesMap.set(key, p);
      }
    }

    // 3. For each policy, find eligible users and run the renewal
    for (const p of uniquePoliciesMap.values()) {
      const users = await prisma.basePrisma.user.findMany({
        where: { tenantId: p.tenantId, status: 'Active' }
      });

      for (const u of users) {
        try {
          await prisma.basePrisma.$transaction(async (tx) => {
            // Get current balance
            const balance = await getAvailableBalance(tx, p.tenantId, u.id, p.policyGroupId);
            
            // Handle Carry Forward
            if (p.carryForward && balance > 0) {
              const cfAmount = p.maxCarryForward !== null 
                ? Math.min(balance, parseFloat(p.maxCarryForward)) 
                : balance;
              
              if (cfAmount > 0) {
                await tx.leaveLedgerEntry.create({
                  data: {
                    tenantId: p.tenantId,
                    userId: u.id,
                    policyGroupId: p.policyGroupId,
                    amount: cfAmount,
                    reason: 'CARRY_FORWARD',
                    notes: `Carried forward from previous year (capped at ${p.maxCarryForward || 'unlimited'})`
                  }
                });
              }
            }

            // Optional: You could write a 'YEAR_END_LAPSE' debit entry here to explicitly clear the remaining old balance
            // but our ledger naturally just adds the new stuff. Wait, if we don't clear the old balance, 
            // the getAvailableBalance sums ALL history. Thus the unused balance + new carry forward + new annual grant 
            // will effectively double-count the remaining balance!
            
            // If getAvailableBalance aggregates everything forever, we MUST clear the existing balance down to zero 
            // before we add the carry forward and the new grant.
            
            if (balance !== 0) {
              await tx.leaveLedgerEntry.create({
                data: {
                  tenantId: p.tenantId,
                  userId: u.id,
                  policyGroupId: p.policyGroupId,
                  amount: -balance,
                  reason: 'YEAR_END_LAPSE',
                  notes: 'Lapsing remaining balance at end of leave year'
                }
              });
            }

            // Issue new Annual Grant
            await tx.leaveLedgerEntry.create({
              data: {
                tenantId: p.tenantId,
                userId: u.id,
                policyGroupId: p.policyGroupId,
                amount: p.annualQuota,
                reason: 'ANNUAL_GRANT',
                notes: `Annual grant for leave year starting ${month}/${day}`
              }
            });
          });
        } catch (err) {
          console.error(`Failed renewal for user ${u.id} policy ${p.policyGroupId}:`, err);
        }
      }
    }
  } catch (err) {
    console.error('Leave renewal job failed:', err);
  }
};

module.exports = {
  runLeaveRenewal
};
