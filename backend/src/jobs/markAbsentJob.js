const prisma = require('../config/db');
const { sendNotification } = require('../utils/notificationEngine');

/**
 * markAbsentJob.js
 *
 * Runs once at end-of-day (configurable time, default 23:30 IST).
 * For every active employee across all tenants who has NO attendance
 * record for today AND is NOT on an approved leave — creates an Absent
 * record and fires an UNAPPROVED_ABSENCE notification.
 *
 * Why a separate job and not inside cronController?
 *  - cronController.js is an HTTP-triggered endpoint, not a scheduled job.
 *  - This must run automatically every night without any external HTTP call.
 */
async function runMarkAbsent() {
  console.log('[CRON] Running Mark-Absent Engine...');
  const now   = new Date();
  // Work in IST to get the correct "today" date
  const todayIST = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  todayIST.setHours(0, 0, 0, 0);

  let markedCount = 0;
  let errorCount  = 0;

  try {
    // Fetch all active users across all tenants in one query
    const activeUsers = await prisma.basePrisma.user.findMany({
      where: { status: 'Active', tenantId: { not: null } },
      select: { id: true, tenantId: true, displayName: true }
    });

    for (const user of activeUsers) {
      try {
        // 1. Check if an attendance record already exists for today
        const existing = await prisma.basePrisma.attendance.findUnique({
          where: {
            tenantId_userId_date: {
              tenantId: user.tenantId,
              userId:   user.id,
              date:     todayIST
            }
          }
        });

        if (existing) continue; // Already clocked in or already marked — skip

        // 2. Check if on approved leave today
        const onLeave = await prisma.basePrisma.leave.findFirst({
          where: {
            userId:    user.id,
            tenantId:  user.tenantId,
            status:    'Approved',
            startDate: { lte: todayIST },
            endDate:   { gte: todayIST }
          }
        });

        if (onLeave) continue; // On approved leave — skip

        // 3. Mark as Absent
        await prisma.basePrisma.attendance.create({
          data: {
            userId:   user.id,
            tenantId: user.tenantId,
            date:     todayIST,
            status:   'Absent',
            checkIn:  todayIST
            // checkOut intentionally null
          }
        });

        markedCount++;

        // 4. Notify the employee
        sendNotification({
          userId:   user.id,
          tenantId: user.tenantId,
          type:     'UNAPPROVED_ABSENCE',
          data: {
            date: todayIST.toLocaleDateString('en-IN', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            })
          }
        });

      } catch (userErr) {
        errorCount++;
        console.error(`[CRON] Mark-Absent failed for user ${user.id}:`, userErr.message);
      }
    }

    console.log(`[CRON] Mark-Absent Engine finished. Marked: ${markedCount}, Errors: ${errorCount}.`);
  } catch (err) {
    console.error('[CRON] Mark-Absent Engine fatal error:', err);
  }
}

module.exports = { runMarkAbsent };
