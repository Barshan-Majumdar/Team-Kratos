const prisma = require('./src/config/db');

async function main() {
  const payrolls = await prisma.basePrisma.payroll.findMany({
    select: { month: true, user: { select: { department: true } } },
    take: 10
  });
  console.log("All Payrolls (sample):", payrolls);

  const absences = await prisma.basePrisma.attendance.count({
    where: { status: 'Absent' }
  });
  console.log("Total Absences:", absences);
}

main().catch(console.error).finally(() => process.exit(0));
