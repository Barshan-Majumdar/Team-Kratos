const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const users = await prisma.user.findMany({
    include: { tenant: true, roleDefinition: true },
    take: 5,
    orderBy: { createdAt: 'desc' }
  });
  console.log(JSON.stringify(users, null, 2));
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
