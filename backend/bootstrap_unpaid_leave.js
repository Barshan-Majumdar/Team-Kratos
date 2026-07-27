const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({where:{displayName: {contains: 'Soumyadip'}}});
  if (!user) {
    console.error("User not found!");
    return;
  }
  const tenantId = user.tenantId;

  const groupId = uuidv4();
  await prisma.leavePolicy.create({
    data: {
      tenantId,
      name: 'Unpaid Leave (LOP)',
      policyGroupId: groupId,
      annualQuota: 0,
      carryForward: false,
      isPaid: false,
      allowNegativeBalance: true
    }
  });

  console.log('Created Unpaid Leave (LOP) policy successfully.');
}

main().finally(() => prisma.$disconnect());
