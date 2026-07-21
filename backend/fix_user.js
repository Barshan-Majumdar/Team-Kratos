const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const updatedUser = await prisma.user.update({
    where: { email: 'connect.barshan.majumdar@gmail.com' },
    data: { roleDefinitionId: '33db69ca-6797-4d6d-9e5a-cce71054a484' }
  });
  console.log('User upgraded to Owner:', updatedUser.email);
}

main().catch(console.error).finally(() => prisma.$disconnect());
