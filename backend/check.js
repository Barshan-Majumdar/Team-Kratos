const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.user.findUnique({ where: { email: 'barshanmajumdar249@gmail.com' }, include: { roleDefinition: true } })
  .then(console.log)
  .finally(() => prisma.$disconnect());
