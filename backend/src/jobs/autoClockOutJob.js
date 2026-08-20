const prisma = require('../config/db');
const { dispatchWebhook } = require('../utils/webhookDispatcher');

async function runAutoClockOut() {
  console.log('[CRON] Running Auto Clock-Out Engine...');
  try {
    // Find all attendance records where checkOut is null AND the employee actually clocked in.
    // IMPORTANT: We must exclude records where checkIn is null (system-generated Absent records).
    // If we don't, autoClockOut will find an Absent record with checkIn=null, miscalculate hours,
    // and update its status to Present — which is the exact ghost-present bug we are fixing.
    const openAttendances = await prisma.basePrisma.attendance.findMany({
      where: {
        checkOut: null,
        checkIn: { not: null },    // Must have actually clocked in
        status: { not: 'Absent' }  // Never touch system-generated Absent records
      },
      include: {
        user: {
          select: { id: true, tenantId: true, displayName: true, baseSalary: true, department: true, avatar: true, shiftPolicy: true }
        }
      }
    });

    if (openAttendances.length === 0) {
      console.log('[CRON] No open attendance records found.');
      return;
    }

    const { getShiftWindowForDate } = require('../utils/shiftWindow');
    const { registerCheckOut, getTenantState } = require('../utils/pulseEngine');
    const now = new Date();
    let processedCount = 0;

    for (const record of openAttendances) {
      // 1. Get shift end time
      let shiftEnd = null;
      let breakHours = 1;

      // Check roster first (optional, but let's just use shiftPolicy for now since it's the standard)
      // Fallback to standard 09:00-18:00 corporate shift if no policy is assigned
      const shiftPolicy = (record.user && record.user.shiftPolicy) 
        ? record.user.shiftPolicy 
        : { startTime: '09:00', endTime: '18:00', breakDurationMinutes: 60 };

      const window = getShiftWindowForDate(shiftPolicy, record.checkIn);
      shiftEnd = window.shiftEnd;
      breakHours = (shiftPolicy.breakDurationMinutes || 60) / 60;

      // 2. Has the user been clocked in for an unreasonably long time? (>14 hours)
      const hoursSinceCheckIn = (now.getTime() - record.checkIn.getTime()) / 3600000;
      
      if (hoursSinceCheckIn >= 14) {
        // Clock them out exactly at their shift end time
        let autoCheckOutTime = shiftEnd;

        // Failsafe: If they checked in AFTER their shift ended (e.g. late night), cap at 9 hours
        if (autoCheckOutTime <= record.checkIn) {
          autoCheckOutTime = new Date(record.checkIn.getTime() + (9 * 3600000));
        }
        
        const rawGrossHours = (autoCheckOutTime.getTime() - record.checkIn.getTime()) / 3600000;
        const netWorkHours = Math.max(0, parseFloat((rawGrossHours - breakHours).toFixed(2)));
        
        const { deriveAttendanceStatus } = require('../utils/attendanceStatusEngine');
        const finalStatus = deriveAttendanceStatus(netWorkHours, shiftPolicy, record.checkIn);

        await prisma.basePrisma.attendance.update({
          where: { id: record.id },
          data: {
            checkOut: autoCheckOutTime,
            workHours: netWorkHours,
            extraHours: 0, // Auto-clockout fires at shiftEnd — overtime is structurally impossible
            status: finalStatus,
            isFlagged: true,
            flagReason: 'System Auto Clock-Out (Shift Ended)'
          }
        });

        // Dispatch Webhook
        if (record.tenantId) {
          dispatchWebhook(record.tenantId, 'attendance.checkout', {
            userId: record.userId,
            checkOutTime: autoCheckOutTime,
            workHours: netWorkHours,
            extraHours: 0,
            auto: true
          });
          
          registerCheckOut(record.tenantId, {
            id: record.user.id,
            baseSalary: record.user.baseSalary || 0,
            displayName: record.user.displayName || 'Unknown',
            department: record.user.department || 'Staff',
            avatarUrl: record.user.avatar || null
          });
        }
        processedCount++;
      }
    }

    console.log(`[CRON] Successfully auto-clocked-out ${processedCount} users whose shift ended.`);

  } catch (error) {
    console.error('[CRON] Error in Auto Clock-Out Engine:', error);
  }
}

module.exports = { runAutoClockOut };
