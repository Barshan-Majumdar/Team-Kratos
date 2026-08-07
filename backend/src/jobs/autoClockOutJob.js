const prisma = require('../config/db');
const { dispatchWebhook } = require('../utils/webhookDispatcher');

async function runAutoClockOut() {
  console.log('[CRON] Running Auto Clock-Out Engine...');
  try {
    const nineHoursAgo = new Date(Date.now() - 9 * 60 * 60 * 1000);

    // Find all attendance records where checkOut is null and checkIn is older than 9 hours
    const openAttendances = await prisma.basePrisma.attendance.findMany({
      where: {
        checkOut: null,
        checkIn: { lte: nineHoursAgo }
      },
      include: {
        user: {
          select: { id: true, tenantId: true, displayName: true, baseSalary: true, department: true, avatar: true, shiftPolicy: true }
        }
      }
    });

    if (openAttendances.length === 0) {
      console.log('[CRON] No orphaned attendance records found.');
      return;
    }

    console.log(`[CRON] Found ${openAttendances.length} users to auto-clock-out.`);

    const { getShiftWindowForDate } = require('../utils/shiftWindow');
    const { registerCheckOut, getTenantState } = require('../utils/pulseEngine');

    // Currently we don't have direct access to 'io' outside of the controller easily unless we import server,
    // but we can just update the DB and call the pulse engine. 
    // The next time pulse ticker runs (every 60s), it will broadcast the new state anyway.

    for (const record of openAttendances) {
      // Set checkout exactly 9 hours after checkin
      const autoCheckOutTime = new Date(new Date(record.checkIn).getTime() + 9 * 60 * 60 * 1000);
      
      const rawGrossHours = 9; // Exactly 9 hours
      const breakHours = record.breakHours || 1;
      const netWorkHours = Math.max(0, rawGrossHours - breakHours);
      
      let extraHours = 0;
      if (record.user && record.user.shiftPolicy) {
        const { shiftEnd } = getShiftWindowForDate(record.user.shiftPolicy, autoCheckOutTime);
        if (autoCheckOutTime > shiftEnd) {
          extraHours = (autoCheckOutTime.getTime() - shiftEnd.getTime()) / 3600000;
        }
      }

      await prisma.basePrisma.attendance.update({
        where: { id: record.id },
        data: {
          checkOut: autoCheckOutTime,
          workHours: netWorkHours,
          extraHours: extraHours,
          isFlagged: true,
          flagReason: 'System Auto Clock-Out (9 Hours Exceeded)'
        }
      });

      // Dispatch Webhook
      if (record.tenantId) {
        dispatchWebhook(record.tenantId, 'attendance.checkout', {
          userId: record.userId,
          checkOutTime: autoCheckOutTime,
          workHours: netWorkHours,
          extraHours: extraHours,
          auto: true
        });
        
        // Update live pulse engine
        registerCheckOut(record.tenantId, {
          id: record.user.id,
          baseSalary: record.user.baseSalary || 0,
          displayName: record.user.displayName || 'Unknown',
          department: record.user.department || 'Staff',
          avatarUrl: record.user.avatar || null
        });
      }
    }

    console.log(`[CRON] Successfully auto-clocked-out ${openAttendances.length} users.`);
  } catch (error) {
    console.error('[CRON] Error in Auto Clock-Out Engine:', error);
  }
}

module.exports = { runAutoClockOut };
