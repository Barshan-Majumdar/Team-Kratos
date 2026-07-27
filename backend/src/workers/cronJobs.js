const cron = require('node-cron');
const prisma = require('../config/db');

const initCronJobs = () => {
  // 1. Statutory Compliance Engine (Runs every night at 2:00 AM)
  cron.schedule('0 2 * * *', async () => {
    console.log('[CRON] Running Statutory Compliance Engine...');
    try {
      const activeRules = await prisma.basePrisma.complianceRule.findMany({
        where: { effectiveFrom: { lte: new Date() } }
      });

      // We group offices by state to apply the relevant rule
      const offices = await prisma.basePrisma.office.findMany({
        select: { id: true, state: true, tenantId: true }
      });

      for (const office of offices) {
        if (!office.state) continue;

        // Find rules matching the office's state
        const stateRules = activeRules.filter(r => r.state.toLowerCase() === office.state.toLowerCase() && r.tenantId === office.tenantId);
        
        if (stateRules.length === 0) continue;

        // Apply rules to active, unlocked payrolls of users in this office
        const usersInOffice = await prisma.basePrisma.user.findMany({
          where: { officeId: office.id, tenantId: office.tenantId },
          select: { id: true }
        });
        
        if (usersInOffice.length === 0) continue;
        
        const userIds = usersInOffice.map(u => u.id);

        const unlockedPayrolls = await prisma.basePrisma.payroll.findMany({
          where: { 
            tenantId: office.tenantId,
            userId: { in: userIds },
            locked: false 
          }
        });

        for (const payroll of unlockedPayrolls) {
          let updatedData = { ...payroll };
          let modified = false;

          for (const rule of stateRules) {
            const rateTable = typeof rule.rateTable === 'string' ? JSON.parse(rule.rateTable) : rule.rateTable;
            if (rule.ruleType === 'PT' && rateTable.amount) {
               // Professional Tax
               if (payroll.grossSalary >= (rateTable.minSalary || 0)) {
                 updatedData.professionalTax = rateTable.amount;
                 modified = true;
               }
            } else if (rule.ruleType === 'PF' && rateTable.percentage) {
               updatedData.pfEmployee = payroll.basicSalary * (rateTable.percentage / 100);
               updatedData.pfEmployer = payroll.basicSalary * (rateTable.percentage / 100);
               modified = true;
            }
          }

          if (modified) {
            // Recalculate net salary
            const totalDeductions = updatedData.pfEmployee + updatedData.professionalTax + updatedData.advanceDeduction + updatedData.lateDeductions;
            const netSalary = updatedData.grossSalary - totalDeductions;
            
            await prisma.basePrisma.payroll.update({
              where: { id: payroll.id },
              data: {
                professionalTax: updatedData.professionalTax,
                pfEmployee: updatedData.pfEmployee,
                pfEmployer: updatedData.pfEmployer,
                netSalary: netSalary
              }
            });
          }
        }
      }
      console.log('[CRON] Statutory Compliance Engine finished.');
    } catch (error) {
      console.error('[CRON] Error in Statutory Compliance Engine:', error);
    }
  });

  // 2. Active Employee Counter for Metered Billing (Runs at 3:00 AM on the 1st of every month)
  cron.schedule('0 3 1 * *', async () => {
    console.log('[CRON] Running Metered Billing Usage Counter...');
    try {
      const tenants = await prisma.basePrisma.tenant.findMany({ select: { id: true } });
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

      for (const tenant of tenants) {
        const activeCount = await prisma.basePrisma.user.count({
          where: { tenantId: tenant.id, status: 'Active' }
        });

        await prisma.basePrisma.usageRecord.upsert({
          where: { tenantId_month: { tenantId: tenant.id, month: currentMonth } },
          update: { activeEmployees: activeCount },
          create: { tenantId: tenant.id, month: currentMonth, activeEmployees: activeCount }
        });
      }
      console.log('[CRON] Metered Billing Usage Counter finished.');
    } catch (error) {
      console.error('[CRON] Error in Metered Billing Counter:', error);
    }
  });
  
  // 3. Leave Year Renewal (Runs daily at 1:00 AM)
  // Handles annual grant, carry-forward, and year-end lapse
  const { runLeaveRenewal } = require('../jobs/leaveRenewalJob');
  cron.schedule('0 1 * * *', () => {
    console.log('[CRON] Running Leave Year Renewal...');
    runLeaveRenewal().catch(err => console.error('[CRON] Leave Renewal error:', err));
  });

  // 4. Onboarding Reminders (Runs daily at 9:00 AM)
  // Nudges employees stuck on wizard steps and notifies HR/managers
  const { runOnboardingReminders } = require('../jobs/onboardingReminders');
  cron.schedule('0 9 * * *', () => {
    console.log('[CRON] Running Onboarding Reminders...');
    runOnboardingReminders().catch(err => console.error('[CRON] Onboarding Reminders error:', err));
  });

  // 5. Daily Birthday Engine (Runs daily at 8:00 AM)
  const { runAllTenantsBirthdayCheck } = require('../jobs/birthdayJob');
  cron.schedule('0 8 * * *', () => {
    runAllTenantsBirthdayCheck().catch(err => console.error('[CRON] Birthday Check error:', err));
  });

  console.log('[CRON] Background jobs initialized (5 scheduled).');
};

module.exports = { initCronJobs };
