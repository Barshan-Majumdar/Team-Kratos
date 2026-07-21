const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

prisma.user.findUnique({
  where: { email: 'connect.barshan.majumdar@gmail.com' },
  include: { tenant: true, roleDefinition: true }
}).then(user => {
  console.log(JSON.stringify(user, null, 2));
}).finally(() => prisma.$disconnect());
