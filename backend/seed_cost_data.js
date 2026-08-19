const prisma = require('./src/config/db');

async function seed() {
  const tenant = await prisma.basePrisma.tenant.findFirst();
  if (!tenant) return console.log("No tenant found. Cannot seed.");

  // Get some users in Engineering
  let users = await prisma.basePrisma.user.findMany({
    where: { tenantId: tenant.id, department: 'Engineering' }
  });

  if (users.length === 0) {
    console.log("No Engineering users found, creating some mock users...");
    for (let i = 0; i < 3; i++) {
      users.push(await prisma.basePrisma.user.create({
        data: {
          tenantId: tenant.id,
          name: `Eng User ${i}`,
          displayName: `Engineer ${i}`,
          department: 'Engineering',
          level: 1,
          email: `eng${i}@test.com`,
          password: 'mock',
          baseSalary: 120000
        }
      }));
    }
  }

  console.log("Creating mock payroll and attendance data for 2026-07 and 2026-08...");

  for (const user of users) {
    // 2026-07 Baseline (Normal)
    await prisma.basePrisma.payroll.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        month: '2026-07',
        monthWage: 120000,
        payableDays: 22,
        basicSalary: 60000,
        hra: 30000,
        performanceBonus: 5000,
        lta: 0,
        pfEmployee: 0,
        pfEmployer: 0,
        fixedAllowance: 0,
        grossSalary: 125000,
        netSalary: 125000,
        overtimeBonus: 2000 // Small overtime
      }
    });

    // 2026-08 Current (High Overtime Anomaly)
    await prisma.basePrisma.payroll.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        month: '2026-08',
        monthWage: 120000,
        payableDays: 22,
        basicSalary: 60000,
        hra: 30000,
        performanceBonus: 5000,
        lta: 0,
        pfEmployee: 0,
        pfEmployer: 0,
        fixedAllowance: 0,
        grossSalary: 135000,
        netSalary: 135000,
        overtimeBonus: 12000 // Big overtime spike!
      }
    });

    // Add some absences in August
    await prisma.basePrisma.attendance.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        date: new Date('2026-08-10T10:00:00Z'),
        checkIn: new Date('2026-08-10T10:00:00Z'),
        checkOut: new Date('2026-08-10T10:00:00Z'),
        status: 'Absent',
        mode: 'SYSTEM'
      }
    });
  }

  // Add an intelligence signal
  await prisma.basePrisma.intelligenceSignal.create({
    data: {
      tenantId: tenant.id,
      entityId: users[0].id,
      scope: 'INDIVIDUAL',
      type: 'FLIGHT_RISK',
      severity: 'HIGH',
      message: 'High risk of burnout due to sustained overtime.',
      confidence: 0.85,
      isActive: true,
      dataCompleteness: 1.0,
      baselineDays: 30,
      comparisonDays: 7,
      evidenceCount: 3
    }
  });

  console.log("Mock data injected successfully.");
}

seed().catch(console.error).finally(() => process.exit(0));
