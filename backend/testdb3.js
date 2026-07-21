const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.user.findUnique({ where: { email: 'connect.barshan.majumdar@gmail.com' }, include: { roleDefinition: true } })
  .then(console.log)
  .catch(console.error)
  .finally(() => prisma.$disconnect());
