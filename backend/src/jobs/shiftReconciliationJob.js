/**
 * shiftReconciliationJob.js
 *
 * Runs every 2 hours (configurable in cronJobs.js).
 * For every active employee, it looks at their current shift window and:
 *
 *   A. SHIFT ENDED + Still clocked in (checkOut = null)
 *      → Auto clock out at their official shift end time
 *      → Derive and save final attendance status (Present / HalfDay / Absent)
 *      → Flag record as auto clock-out
 *
 *   B. SHIFT ENDED + Never clocked in + Not on approved leave
 *      → Create an Absent attendance record (no checkIn / checkOut)
 *      → Fire UNAPPROVED_ABSENCE notification
 *
 * Why every 2 hours instead of midnight?
 *   Employees can have any shift (morning, afternoon, night, overnight).
 *   Waiting until midnight misses night-shift workers entirely.
 *   Running every 2 hours catches any shift that ended in the last 2-hour window.
 *
 * Idempotent: Uses upsert / findUnique — safe to run multiple times.
 */

const prisma = require('../config/db');
const { getShiftWindowForDate } = require('../utils/shiftWindow');
const { deriveAttendanceStatus } = require('../utils/attendanceStatusEngine');
const { sendNotification } = require('../utils/notificationEngine');
const { dispatchWebhook } = require('../utils/webhookDispatcher');

// Default shift for users without an assigned shift policy
const DEFAULT_SHIFT = {
  startTime: '09:00',
  endTime:   '18:00',
  breakDurationMinutes: 60,
  gracePeriodMinutes:   15,
  graceMinutes:         15,
};

async function runShiftReconciliation() {
  console.log('[CRON] Running Shift Reconciliation Engine...');
  const now = new Date();
  let autoClockOutCount = 0;
  let markedAbsentCount = 0;
  let errorCount = 0;

  try {
    // Fetch all active users with their shift policy in one query
    const activeUsers = await prisma.basePrisma.user.findMany({
      where: { status: 'Active', tenantId: { not: null } },
      select: {
        id:          true,
        tenantId:    true,
        displayName: true,
        baseSalary:  true,
        department:  true,
        avatar:      true,
        shiftPolicy: true,  // may be null
      }
    });

    for (const user of activeUsers) {
      try {
        const yesterday = new Date(now.getTime() - 24 * 3600000);

        // ── Resolve the employee's EXACT shift for today AND yesterday ────
        // Always check the ShiftAssignment first (date-specific override),
        // then fall back to the user's default profile shift policy.
        // This ensures a roster change for one employee never bleeds into others.
        const [assignmentToday, assignmentYesterday] = await Promise.all([
          prisma.basePrisma.shiftAssignment.findFirst({
            where: {
              tenantId: user.tenantId,
              employeeId: user.id,
              slot: { date: new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) }
            },
            include: { slot: true }
          }),
          prisma.basePrisma.shiftAssignment.findFirst({
            where: {
              tenantId: user.tenantId,
              employeeId: user.id,
              slot: { date: new Date(Date.UTC(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate())) }
            },
            include: { slot: true }
          })
        ]);

        const resolvePolicy = (assignment, allowDefaultFallback) => {
          if (assignment && assignment.slot) {
            return {
              startTime: assignment.slot.startTime,
              endTime: assignment.slot.endTime,
              gracePeriodMinutes: 15, // fallback
              breakDurationMinutes: 60
            };
          }
          if (allowDefaultFallback) return user.shiftPolicy || DEFAULT_SHIFT;
          return null; // No roster for that date — don't guess
        };

        const policyToday     = resolvePolicy(assignmentToday, true);
        const policyYesterday = resolvePolicy(assignmentYesterday, false);

        // ── Determine today's shift window ───────────────────────────
        // For overnight shifts (e.g. 22:00–06:00) the shift window spans two calendar days.
        // We check *today's* shift AND *yesterday's* shift to catch overnight workers correctly.
        const todayShift     = (policyToday && policyToday !== 'OFF')     ? getShiftWindowForDate(policyToday,     now)       : null;
        const yesterdayShift = (policyYesterday && policyYesterday !== 'OFF') ? getShiftWindowForDate(policyYesterday, yesterday) : null;

        // Pick the most recently ended shift within the past 2 hours
        // (job runs every 2 hours — 2-hour window gives safe overlap without double-processing)
        const TWO_HOURS = 2 * 3600000;
        let activeShift = null;
        let shiftDate   = null;

        if (todayShift && now >= todayShift.shiftEnd && (now - todayShift.shiftEnd) <= TWO_HOURS) {
          activeShift = todayShift;
          shiftDate   = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
        } else if (yesterdayShift && now >= yesterdayShift.shiftEnd && (now - yesterdayShift.shiftEnd) <= TWO_HOURS) {
          activeShift = yesterdayShift;
          shiftDate   = new Date(Date.UTC(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate()));
        }

        if (!activeShift) continue; // Shift hasn't ended yet for this user — skip

        // Also skip if today is an explicit off day
        if (policyToday === 'OFF' && shiftDate && shiftDate.getTime() === new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())).getTime()) continue;

        // ── Check existing attendance for that shift's date ──────────
        const existing = await prisma.basePrisma.attendance.findUnique({
          where: {
            tenantId_userId_date: {
              tenantId: user.tenantId,
              userId:   user.id,
              date:     shiftDate
            }
          }
        });

        // ── CASE A: Still clocked in — auto clock out ────────────────
        if (existing && !existing.checkOut) {
          const checkInTime  = existing.checkIn;
          const checkOutTime = activeShift.shiftEnd;

          const rawGrossHours = (checkOutTime.getTime() - checkInTime.getTime()) / 3600000;
          const breakHours    = (shiftPolicy.breakDurationMinutes || 60) / 60;
          const netWorkHours  = Math.max(0, parseFloat((rawGrossHours - breakHours).toFixed(2)));
          const finalStatus   = deriveAttendanceStatus(netWorkHours, shiftPolicy, checkInTime);

          await prisma.basePrisma.attendance.update({
            where: { id: existing.id },
            data: {
              checkOut:   checkOutTime,
              workHours:  netWorkHours,
              extraHours: 0,
              status:     finalStatus,
              isFlagged:  true,
              flagReason: 'System Auto Clock-Out (Shift Reconciliation)'
            }
          });

          autoClockOutCount++;

          // Dispatch webhook for downstream integrations
          dispatchWebhook(user.tenantId, 'attendance.checkout', {
            userId:      user.id,
            checkOutTime,
            workHours:   netWorkHours,
            extraHours:  0,
            status:      finalStatus,
            auto:        true
          }).catch(() => {});

          continue; // Done with this user
        }

        // ── CASE B: Shift ended, no attendance record at all ─────────
        if (!existing) {
          // Check if on approved leave for that date
          const onLeave = await prisma.basePrisma.leave.findFirst({
            where: {
              userId:    user.id,
              tenantId:  user.tenantId,
              status:    'Approved',
              startDate: { lte: shiftDate },
              endDate:   { gte: shiftDate }
            }
          });

          if (onLeave) continue; // Legitimately on leave — do not mark absent

          // Create Absent record — intentionally NO checkIn/checkOut.
          // DO NOT supply a dummy checkIn — autoClockOutJob queries { checkOut: null }
          // and would later convert this Absent record into Present if it has a checkIn.
          await prisma.basePrisma.attendance.create({
            data: {
              userId:   user.id,
              tenantId: user.tenantId,
              date:     shiftDate,
              status:   'Absent'
            }
          });

          markedAbsentCount++;

          // Engagement Hub Public Announcement (No personal inbox notification)
          await prisma.basePrisma.announcement.create({
            data: {
              tenantId: user.tenantId,
              title: 'Unapproved Absence Flagged',
              category: 'Urgent',
              message: `Attention: ${user.displayName} (ID: ${user.id}) was marked absent without an approved leave for their scheduled shift on ${shiftDate.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}.`
            }
          });
        }

        // CASE C: Already has checkOut → already processed — nothing to do

      } catch (userErr) {
        errorCount++;
        console.error(`[CRON] ShiftReconciliation failed for user ${user.id}:`, userErr.message);
      }
    }

    console.log(
      `[CRON] Shift Reconciliation finished. ` +
      `Auto clock-outs: ${autoClockOutCount}, ` +
      `Marked absent: ${markedAbsentCount}, ` +
      `Errors: ${errorCount}.`
    );

  } catch (err) {
    console.error('[CRON] Shift Reconciliation Engine fatal error:', err);
  }
}

module.exports = { runShiftReconciliation };
