const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Get all active users
  const users = await prisma.user.findMany({
    where: {
      // You can filter by status if applicable, or just get all users
      // status: 'Active'
    }
  });

  for (const user of users) {
    if (!user.tenantId) continue;

    // Get active policies for this user's tenant
    const policies = await prisma.leavePolicy.findMany({
      where: { tenantId: user.tenantId, isArchived: false, policyGroupId: { not: null } },
      orderBy: { effectiveFrom: 'desc' }
    });

    const uniquePoliciesMap = new Map();
    for (const p of policies) {
      if (!uniquePoliciesMap.has(p.policyGroupId)) {
        uniquePoliciesMap.set(p.policyGroupId, p);
      }
    }

    for (const policy of uniquePoliciesMap.values()) {
      if (parseFloat(policy.annualQuota) > 0) {
        // Check if user already has an ANNUAL_GRANT for this policy
        const existingGrant = await prisma.leaveLedgerEntry.findFirst({
          where: {
            tenantId: user.tenantId,
            userId: user.id,
            policyGroupId: policy.policyGroupId,
            reason: 'ANNUAL_GRANT'
          }
        });

        if (!existingGrant) {
          console.log(`Granting ${policy.annualQuota} to user ${user.email} for policy ${policy.name}`);
          await prisma.leaveLedgerEntry.create({
            data: {
              tenantId: user.tenantId,
              userId: user.id,
              policyGroupId: policy.policyGroupId,
              amount: policy.annualQuota,
              reason: 'ANNUAL_GRANT',
              notes: 'Auto-granted missing leaves during backfill'
            }
          });
        }
      }
    }
  }
  console.log('Done backfilling missing leaves.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
