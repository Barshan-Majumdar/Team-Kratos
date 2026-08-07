const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanAll() {
  await prisma.shiftAssignment.deleteMany({});
  await prisma.shiftSlot.deleteMany({});
  console.log('Deleted all shift slots and assignments.');
}

cleanAll().catch(console.error).finally(() => prisma.$disconnect());
