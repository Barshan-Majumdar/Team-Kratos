const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.user.findFirst({ include: { roleDefinition: true } })
  .then(console.log)
  .catch(console.error)
  .finally(() => prisma.$disconnect());
