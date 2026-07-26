const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCols() {
  try {
    const cols = await prisma.$queryRaw`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'User';
    `;
    console.log(cols.map(c => c.column_name));
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}
checkCols();
