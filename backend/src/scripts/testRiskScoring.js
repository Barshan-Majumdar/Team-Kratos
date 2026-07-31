require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const prisma = require('../config/db');
const { calculateAdvanceRiskScore } = require('../utils/riskScoringEngine');
const tenantStorage = require('../middleware/tenantContext');

async function runTests() {
  console.log('--- STARTING RISK SCORING ENGINE TESTS ---');

  // Seed mock tenant and user for data checks
  console.log('\n[Test 1] Seeding mock data in Database...');
  let tenant = await prisma.basePrisma.tenant.findFirst();
  if (!tenant) {
    tenant = await prisma.basePrisma.tenant.create({
      data: {
        name: 'Test Tenant',
        domain: 'test-tenant.com'
      }
    });
  }
  
  const testEmail = 'advance.tester@acme.com';
  // Delete user if exists to ensure fresh stats
  const existingUser = await prisma.basePrisma.user.findUnique({ where: { email: testEmail } });
  if (existingUser) {
    await prisma.basePrisma.salaryAdvance.deleteMany({ where: { userId: existingUser.id } });
    await prisma.basePrisma.attendance.deleteMany({ where: { userId: existingUser.id } });
    await prisma.basePrisma.user.delete({ where: { id: existingUser.id } });
  }

  // Create User with specific risk properties:
  // - dateOfJoining: 2 months ago (tenure < 3 months, risk = 100)
  // - baseSalary: 20000
  // - attritionRiskScore: 80
  const twoMonthsAgo = new Date();
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

  const user = await prisma.basePrisma.user.create({
    data: {
      email: testEmail,
      employeeId: 'EMP_ADV_TEST',
      displayName: 'Advance Tester',
      password: 'PasswordHash123!',
      tenantId: tenant.id,
      dateOfJoining: twoMonthsAgo,
      baseSalary: 20000,
      attritionRiskScore: 80
    }
  });

  // Seed 6 flagged attendance logs in the last 30 days (flagged risk = 100)
  console.log('Seeding 6 flagged attendance records...');
  for (let i = 0; i < 6; i++) {
    const logDate = new Date();
    logDate.setDate(logDate.getDate() - i - 1);
    await prisma.basePrisma.attendance.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        date: logDate,
        checkIn: new Date(),
        latitude: 12.9,
        longitude: 77.5,
        isFlagged: true,
        trustScore: 20
      }
    });
  }

  // Wrap all tenant-scoped queries inside tenantStorage.run context
  await tenantStorage.run(tenant.id, async () => {
    // Verify missing user fallback
    console.log('\n[Test 2] Testing missing user fallback...');
    const fallbackResult = await calculateAdvanceRiskScore('non-existent-id', 5000, tenant.id);
    console.log('Result for non-existent user:', fallbackResult);
    if (fallbackResult.score === 50 && fallbackResult.label === 'MEDIUM') {
      console.log('✓ Fallback to moderate risk of 50 is correct!');
    } else {
      throw new Error('Fallback check failed');
    }

    // Seed no history (repayment risk = 50)
    // Request amount: 15000 (ratio = 15000 / 20000 = 0.75 > 0.7, ratio risk = 100)
    // Expected Score:
    // - Attrition: 80 * 0.25 = 20
    // - Tenure: 100 * 0.2 = 20
    // - Ratio: 100 * 0.2 = 20
    // - GPS Flags: 100 * 0.1 = 10
    // - Repayment: 50 * 0.25 = 12.5
    // Total expected score: 20 + 20 + 20 + 10 + 12.5 = 82.5 -> Math.round = 83.
    console.log('\n[Test 3] Testing score calculation for seeded user...');
    const calculatedMetrics = await calculateAdvanceRiskScore(user.id, 15000, tenant.id);
    console.log('Calculated risk metrics:', calculatedMetrics);

    if (calculatedMetrics.score === 83 && calculatedMetrics.label === 'HIGH') {
      console.log('✓ Risk scoring mathematics are perfectly correct (83% HIGH)!');
    } else {
      throw new Error(`Risk score calculation error: expected 83 HIGH, got ${calculatedMetrics.score} ${calculatedMetrics.label}`);
    }

    // Test repayment history adjustments (User has past rejected advances)
    console.log('\n[Test 4] Testing repayment history adjustments...');
    // Seed past advances
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    // Seed two advance requests: both Rejected
    await prisma.basePrisma.salaryAdvance.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        amount: 5000,
        reason: 'Rejected Advance 1',
        monthDeduction: '2026-07',
        status: 'Rejected',
        createdAt: yesterday
      }
    });
    await prisma.basePrisma.salaryAdvance.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        amount: 5000,
        reason: 'Rejected Advance 2',
        monthDeduction: '2026-07',
        status: 'Rejected',
        createdAt: yesterday
      }
    });

    // Re-run risk calculation
    // Past advances length = 2, rejectedCount = 2 -> rejection ratio = 100% -> repaymentRisk = 100
    // Repayment Contribution increases from 12.5 (50 * 0.25) to 25 (100 * 0.25)
    // Total expected score: 20 + 20 + 20 + 10 + 25 = 95.
    const recalculatedMetrics = await calculateAdvanceRiskScore(user.id, 15000, tenant.id);
    console.log('Recalculated risk metrics with rejection history:', recalculatedMetrics);

    if (recalculatedMetrics.score === 95 && recalculatedMetrics.label === 'HIGH') {
      console.log('✓ Repayment history adjustments correctly weighted!');
    } else {
      throw new Error(`Repayment adjustment check failed: expected 95 HIGH, got ${recalculatedMetrics.score} ${recalculatedMetrics.label}`);
    }
  });

  // Cleanup seeded user
  console.log('\nCleaning up seed data...');
  await prisma.basePrisma.salaryAdvance.deleteMany({ where: { userId: user.id } });
  await prisma.basePrisma.attendance.deleteMany({ where: { userId: user.id } });
  await prisma.basePrisma.user.delete({ where: { id: user.id } });
  console.log('✓ Cleanup done!');

  console.log('\n--- ALL TESTS PASSED SUCCESSFULLY ---');
}

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test run failed with error:', err);
    process.exit(1);
  });
