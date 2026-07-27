const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const user = await prisma.user.findFirst({where:{displayName: {contains: 'Soumyadip'}}});
  console.log("User:", user.email, user.tenantId);
  const policies = await prisma.leavePolicy.findMany({where:{tenantId: user.tenantId}});
  console.log("Policies:", policies);
}
main().finally(() => prisma.$disconnect());
