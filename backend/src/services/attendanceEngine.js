const prisma = require('../config/db');

/**
 * Validates a Date object.
 */
function isValidDate(d) {
  return d instanceof Date && !isNaN(d);
}

/**
 * Maps AttendanceStatus to earned credit points.
 * Throws an error for unknown statuses to prevent silent data corruption.
 */
function getCreditForStatus(status) {
  switch (status) {
    case 'Present':
      return 1.0;
    case 'HalfDay':
      return 0.5;
    case 'Absent':
      return 0.0;
    case 'OnLeave':
      // OnLeave is typically excluded from denominator entirely,
      // but if an attendance record exists with this status, it earns 0 credits.
      return 0.0;
    default:
      throw new Error(`UNKNOWN_STATUS:${status}`);
  }
}

/**
 * Calculates the lifetime attendance percentage for a specific user.
 * 
 * Formula: (Total Earned Credits / Expected Working Days) * 100
 */
async function calculateLifetimeAttendance(userId, tenantId) {
  try {
    // 1. Fetch User Data (Joining Date and Shift Policy)
    const user = await prisma.basePrisma.user.findFirst({
      where: { id: userId, tenantId },
      select: { 
        createdAt: true, 
        dateOfJoining: true,
        shiftPolicyId: true
      }
    });

    if (!user || (!user.createdAt && !user.dateOfJoining)) {
      return { percentage: 100, isDataInconsistent: false };
    }

    // 2. Define Date Range
    const joiningDate = new Date(user.dateOfJoining || user.createdAt);
    joiningDate.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Exclude today from expected full days if it's currently happening. 
    // To strictly include today only if the day is 'over', we can use yesterday as the end bound for calculations.
    
    // Use yesterday as the end date for expected working days to avoid penalizing employees for today's incomplete shift.
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() - 1);
    endDate.setHours(23, 59, 59, 999);

    if (joiningDate > endDate) {
      return { percentage: 100, isDataInconsistent: false }; // Joined today or in the future
    }

    // 3. Fetch Expected Working Days Base (using Shift Roster / Policy)
    // For a robust system, we check the ShiftRoster first. If absent, fallback to ShiftPolicy defaults.
    
    // Fetch all rosters for this user in the date range
    const rosters = await prisma.basePrisma.shiftRoster.findMany({
      where: {
        userId,
        tenantId,
        date: { gte: joiningDate, lte: endDate }
      },
      select: { date: true, shiftPolicyId: true }
    });

    // Create a map of specific scheduled days
    const scheduledDatesMap = new Map();
    rosters.forEach(r => scheduledDatesMap.set(new Date(r.date).toDateString(), true));

    let expectedWorkingDaysSet = new Set();
    
    // Fallback logic if rosters are not fully populated: 
    // We assume a standard 5-day work week (Mon-Fri) if no specific roster is found for a day.
    // In a mature system, this would strictly rely on the roster.
    let current = new Date(joiningDate);
    while (current <= endDate) {
      const dateString = current.toDateString();
      const dayOfWeek = current.getDay();
      
      if (scheduledDatesMap.has(dateString)) {
        // Day is explicitly scheduled in roster
        expectedWorkingDaysSet.add(dateString);
      } else {
        // Fallback: assume Mon-Fri if no roster explicitly says otherwise (or based on their shift policy)
        if (dayOfWeek !== 0 && dayOfWeek !== 6) { 
           expectedWorkingDaysSet.add(dateString);
        }
      }
      current.setDate(current.getDate() + 1);
    }

    // 4. Fetch and Remove Company Holidays
    // Note: The schema doesn't have a specific `Holiday` model in the provided snippet. 
    // If one existed (e.g., `CompanyHoliday`), we would query it here and remove matches from `expectedWorkingDaysSet`.
    // Example:
    // const holidays = await prisma.basePrisma.companyHoliday.findMany({ where: { date: { gte: joiningDate, lte: endDate } }});
    // holidays.forEach(h => expectedWorkingDaysSet.delete(new Date(h.date).toDateString()));

    // 5. Fetch and Remove Approved Leaves
    const approvedLeaves = await prisma.basePrisma.leave.findMany({
      where: {
        userId,
        tenantId,
        status: 'Approved',
        startDate: { lte: endDate },
        endDate: { gte: joiningDate }
      },
      select: { startDate: true, endDate: true }
    });

    for (const leave of approvedLeaves) {
      if (!isValidDate(leave.startDate) || !isValidDate(leave.endDate)) continue;
      
      let leaveCurr = new Date(leave.startDate < joiningDate ? joiningDate : leave.startDate);
      const leaveEnd = new Date(leave.endDate > endDate ? endDate : leave.endDate);
      
      while (leaveCurr <= leaveEnd) {
        expectedWorkingDaysSet.delete(leaveCurr.toDateString());
        leaveCurr.setDate(leaveCurr.getDate() + 1);
      }
    }

    const expectedWorkingDaysCount = expectedWorkingDaysSet.size;

    if (expectedWorkingDaysCount === 0) {
      return { percentage: 100, isDataInconsistent: false };
    }

    // 6. Calculate Earned Days (Credits)
    const attendanceRecords = await prisma.basePrisma.attendance.findMany({
      where: {
        userId,
        tenantId,
        date: { gte: joiningDate, lte: endDate },
      },
      select: { date: true, status: true },
      orderBy: { createdAt: 'desc' } // If there are duplicates for a day, the latest one might be a correction
    });

    let earnedCredits = 0;
    let isDataInconsistent = false;
    let inconsistencyType = null;
    let inconsistencyDetails = [];
    
    // Deduplicate attendance records per day (take the most recent status)
    const uniqueAttendanceMap = new Map();
    for (const att of attendanceRecords) {
      if (isValidDate(att.date)) {
        const dateStr = new Date(att.date).toDateString();
        if (!uniqueAttendanceMap.has(dateStr)) {
          uniqueAttendanceMap.set(dateStr, att.status);
        } else {
          isDataInconsistent = true; // Flag if we see multiple records for a single day
          inconsistencyType = "DUPLICATE_ATTENDANCE_RECORDS";
          inconsistencyDetails.push(`Multiple records for ${dateStr}`);
        }
      }
    }

    for (const [dateStr, status] of uniqueAttendanceMap.entries()) {
      // Only grant points if this was actually an expected working day 
      // (prevents >100% from checking in on weekends/holidays)
      if (expectedWorkingDaysSet.has(dateStr)) {
         try {
           earnedCredits += getCreditForStatus(status);
         } catch (err) {
           if (err.message.startsWith('UNKNOWN_STATUS')) {
             isDataInconsistent = true;
             inconsistencyType = "UNKNOWN_ATTENDANCE_STATUS";
             inconsistencyDetails.push(`Status ${status} on ${dateStr}`);
           }
         }
      }
    }

    let rawEarnedDays = earnedCredits;

    if (earnedCredits > expectedWorkingDaysCount) {
       isDataInconsistent = true;
       inconsistencyType = inconsistencyType || "EARNED_DAYS_EXCEED_EXPECTED";
       inconsistencyDetails.push(`Earned ${earnedCredits} credits but only expected ${expectedWorkingDaysCount}`);
       // We cap the math for display, but flag the inconsistency
       earnedCredits = expectedWorkingDaysCount; 
    }

    const percentage = expectedWorkingDaysCount === 0 ? 100 : (earnedCredits / expectedWorkingDaysCount) * 100;
    const finalPercentage = Math.min(Math.max(Math.round(percentage * 10) / 10, 0), 100);

    return { 
      percentage: finalPercentage, 
      rawEarnedDays,
      expectedWorkingDays: expectedWorkingDaysCount,
      isDataInconsistent,
      inconsistencyType,
      inconsistencyDetails
    };

  } catch (error) {
    console.error(`[AttendanceEngine] Error calculating for user ${userId}:`, error);
    return { 
      percentage: 100, 
      rawEarnedDays: 0,
      expectedWorkingDays: 0,
      isDataInconsistent: true,
      inconsistencyType: "CALCULATION_ENGINE_ERROR",
      inconsistencyDetails: [error.message]
    };
  }
}

/**
 * Calculates lifetime attendance for an array of users efficiently.
 */
async function attachAttendancePercentages(users, tenantId) {
  const usersWithAttendance = await Promise.all(
    users.map(async (user) => {
      try {
        const result = await calculateLifetimeAttendance(user.id, tenantId);
        return { 
          ...user, 
          attendancePercentage: result.percentage,
          rawEarnedDays: result.rawEarnedDays,
          expectedWorkingDays: result.expectedWorkingDays,
          hasAttendanceInconsistency: result.isDataInconsistent,
          inconsistencyType: result.inconsistencyType,
          inconsistencyDetails: result.inconsistencyDetails
        };
      } catch (err) {
        return { 
          ...user, 
          attendancePercentage: 100, 
          hasAttendanceInconsistency: true,
          inconsistencyType: "SYSTEM_FAILURE"
        }; 
      }
    })
  );
  return usersWithAttendance;
}

module.exports = {
  calculateLifetimeAttendance,
  attachAttendancePercentages
};
