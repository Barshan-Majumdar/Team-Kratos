const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clean() {
  const slots = await prisma.shiftSlot.findMany({
    include: { assignments: true }
  });
  
  const seen = new Set();
  let deleted = 0;

  for (const slot of slots) {
    if (slot.assignments.length === 0) {
      const key = `${slot.tenantId}-${slot.date.toISOString()}-${slot.shiftType}`;
      if (seen.has(key)) {
        await prisma.shiftSlot.delete({ where: { id: slot.id } });
        deleted++;
      } else {
        seen.add(key);
      }
    }
  }
  console.log(`Deleted ${deleted} duplicate empty slots.`);
}

clean().catch(console.error).finally(() => prisma.$disconnect());
