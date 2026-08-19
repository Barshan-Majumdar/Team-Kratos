const prisma = require('./src/config/db');

async function seed() {
  const tenant = await prisma.basePrisma.tenant.findFirst();
  let users = await prisma.basePrisma.user.findMany({
    where: { tenantId: tenant.id, department: 'Engineering' }
  });

  for (const user of users) {
    try {
      await prisma.basePrisma.attendance.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          date: new Date('2026-08-10T10:00:00Z'),
          checkIn: new Date('2026-08-10T10:00:00Z'),
          checkOut: new Date('2026-08-10T10:00:00Z'),
          status: 'Absent'
        }
      });
    } catch (e) {} // ignore duplicates
  }
  console.log("Attendance added.");
}

seed().catch(console.error).finally(() => process.exit(0));
