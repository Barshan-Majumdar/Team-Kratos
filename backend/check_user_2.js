const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const users = await prisma.user.findMany({
    where: { roleDefinition: { level: { lte: 1 } } },
    include: { tenant: true, roleDefinition: true }
  });
  console.log(JSON.stringify(users, null, 2));
}

check().catch(console.error).finally(() => prisma.$disconnect());
