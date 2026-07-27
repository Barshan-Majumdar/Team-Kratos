const prisma = require('../config/db');
const { dispatchWebhook } = require('../utils/webhookDispatcher');
const { sendNotification } = require('../utils/notificationEngine');

// Haversine formula to calculate distance between two coordinates in meters
function getDistanceFromLatLonInM(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Radius of the earth in m
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  const d = R * c; // Distance in m
  return d;
}

const clockIn = async (req, res) => {
  try {
    const userId = req.user.id;
    const tenantId = req.user.tenantId;
    const { latitude, longitude } = req.body;

    // 1. Double Clock-In Guard: reject if open session already exists
    const openSession = await prisma.attendance.findFirst({
      where: { tenantId, userId, checkOut: null }
    });

    if (openSession) {
      return res.status(400).json({ 
        error: 'You are already clocked in. Please clock out of your active shift first.',
        openAttendanceId: openSession.id
      });
    }

    // Check Geofencing if coordinates are provided and required
    const officeLat = parseFloat(process.env.OFFICE_LATITUDE);
    const officeLng = parseFloat(process.env.OFFICE_LONGITUDE);
    const radius = parseFloat(process.env.OFFICE_RADIUS_METERS || 500);

    let isSuspicious = false;
    
    if (officeLat && officeLng && latitude && longitude) {
      const distance = getDistanceFromLatLonInM(officeLat, officeLng, latitude, longitude);
      if (distance > radius) {
        isSuspicious = true;
      }
    } else if (officeLat && officeLng && (!latitude || !longitude)) {
      isSuspicious = true;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const checkInTime = new Date();

    // 2. Resolve Shift Policy: Check ShiftRoster for date-specific override first, then User.shiftPolicyId
    const rosterEntry = await prisma.shiftRoster.findUnique({
      where: {
        tenantId_userId_date: { tenantId, userId, date: today }
      },
      include: { shiftPolicy: true }
    });

    let activePolicy = null;
    let isOffDay = false;

    if (rosterEntry) {
      if (rosterEntry.shiftPolicyId === null) {
        isOffDay = true; // Explicit Rest Day / Off
      } else {
        activePolicy = rosterEntry.shiftPolicy;
      }
    } else {
      const userWithShift = await prisma.user.findUnique({
        where: { id: userId },
        include: { shiftPolicy: true }
      });
      activePolicy = userWithShift?.shiftPolicy || null;
    }

    // 3. Determine Late Status
    let status = isSuspicious ? 'Absent' : 'Present';

    if (!isOffDay && activePolicy && activePolicy.startTime) {
      const [expHour, expMinute] = activePolicy.startTime.split(':').map(Number);
      const expectedStart = new Date(today);
      expectedStart.setHours(expHour, expMinute, 0, 0);

      const graceMinutes = activePolicy.gracePeriodMinutes ?? 15;
      const lateThreshold = new Date(expectedStart.getTime() + graceMinutes * 60000);

      if (checkInTime > lateThreshold) {
        status = 'Late';
        sendNotification({
          userId,
          tenantId,
          type: 'LATE_CLOCK_IN',
          data: {
            time: checkInTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            expectedTime: activePolicy.startTime
          }
        });
      }
    }

    const attendance = await prisma.attendance.create({
      data: {
        userId,
        tenantId,
        date: today,
        checkIn: checkInTime,
        status,
        latitude: latitude || null,
        longitude: longitude || null
      }
    });

    dispatchWebhook(tenantId, 'attendance.checkin', {
      userId,
      checkInTime: attendance.checkIn,
      status: attendance.status
    });

    res.json(attendance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const clockOut = async (req, res) => {
  try {
    const userId = req.user.id;
    const tenantId = req.user.tenantId;

    // 1. Open Attendance Session Matching (Zero calendar-day dependency)
    const existing = await prisma.attendance.findFirst({
      where: { tenantId, userId, checkOut: null },
      orderBy: { checkIn: 'desc' }
    });

    if (!existing) {
      return res.status(400).json({ error: 'You are not currently clocked in' });
    }

    const checkOutTime = new Date();
    const clockInTime = new Date(existing.checkIn);
    const rawGrossHours = (checkOutTime - clockInTime) / (1000 * 60 * 60);

    // 2. Fetch Active Policy for Break & Shift Duration Lookup
    const rosterEntry = await prisma.shiftRoster.findUnique({
      where: {
        tenantId_userId_date: { tenantId, userId, date: existing.date }
      },
      include: { shiftPolicy: true }
    });

    let activePolicy = rosterEntry?.shiftPolicy;
    if (!activePolicy && rosterEntry?.shiftPolicyId !== null) {
      const userWithShift = await prisma.user.findUnique({
        where: { id: userId },
        include: { shiftPolicy: true }
      });
      activePolicy = userWithShift?.shiftPolicy || null;
    }

    // Calculate expected shift duration in hours
    let expectedShiftHours = 8; // Default fallback
    if (activePolicy && activePolicy.startTime && activePolicy.endTime) {
      const [sH, sM] = activePolicy.startTime.split(':').map(Number);
      const [eH, eM] = activePolicy.endTime.split(':').map(Number);
      let durationMs = (eH * 60 + eM - (sH * 60 + sM)) * 60000;
      if (durationMs <= 0) durationMs += 24 * 60 * 60 * 1000; // Overnight shift duration
      expectedShiftHours = durationMs / (1000 * 60 * 60);
    }

    // 3. Step 1: Stale Session Guard (> 20 hours)
    let cappedGrossHours = rawGrossHours;
    if (rawGrossHours > 20) {
      cappedGrossHours = Math.min(rawGrossHours, expectedShiftHours);
      console.warn(`[Attendance] Stale clock-out detected for user ${userId} (${rawGrossHours.toFixed(1)} hrs). Capped gross hours to ${cappedGrossHours} hrs.`);
    }

    // 4. Step 2: Break Duration Deduction
    const breakDurationMinutes = activePolicy?.breakDurationMinutes ?? 60;
    const breakHours = breakDurationMinutes / 60;
    const netWorkHours = Math.max(0, parseFloat((cappedGrossHours - (cappedGrossHours > breakHours ? breakHours : 0)).toFixed(2)));

    const attendance = await prisma.attendance.update({
      where: { id: existing.id },
      data: {
        checkOut: checkOutTime,
        workHours: netWorkHours
      }
    });

    dispatchWebhook(tenantId, 'attendance.checkout', {
      userId,
      checkOutTime,
      workHours: netWorkHours
    });

    res.json(attendance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getMyAttendance = async (req, res) => {
  try {
    const records = await prisma.attendance.findMany({
      where: { userId: req.user.id },
      orderBy: { date: 'desc' },
      take: 30
    });
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getTodayAttendance = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const records = await prisma.attendance.findMany({
      where: { date: today },
      include: {
        user: {
          select: { displayName: true, department: true, avatar: true }
        }
      }
    });
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  clockIn,
  clockOut,
  getMyAttendance,
  getTodayAttendance
};
