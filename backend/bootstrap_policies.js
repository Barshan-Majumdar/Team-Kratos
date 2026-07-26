const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({where:{displayName: {contains: 'Soumyadip'}}});
  const tenantId = user.tenantId;
  const userId = user.id;

  const policiesToCreate = [
    { name: 'Sick Leave', quota: 12 },
    { name: 'Casual Leave', quota: 8 }
  ];

  for (const p of policiesToCreate) {
    const groupId = uuidv4();
    await prisma.leavePolicy.create({
      data: {
        tenantId,
        name: p.name,
        policyGroupId: groupId,
        annualQuota: p.quota,
        carryForward: false,
        isPaid: true
      }
    });

    await prisma.leaveLedgerEntry.create({
      data: {
        tenantId,
        userId,
        policyGroupId: groupId,
        amount: p.quota,
        reason: 'ANNUAL_GRANT',
        notes: 'Auto-granted for testing'
      }
    });
    console.log(`Created ${p.name}`);
  }
}

main().finally(() => prisma.$disconnect());
