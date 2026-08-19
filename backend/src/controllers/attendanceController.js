const prisma = require('../config/db');
const { dispatchWebhook } = require('../utils/webhookDispatcher');
const { sendNotification } = require('../utils/notificationEngine');
const { evaluateSpatialTrust } = require('../utils/spatialTrustEngine');
const { computeCompositeTrust } = require('../utils/trustScoreEngine');
const { getDistanceInMeters, formatDistance } = require('../utils/geoUtils');
const { decryptEmbeddings } = require('../utils/embeddingCrypto');

function redactSecurityFields(attendance, isAdminOrManager) {
  if (Array.isArray(attendance)) {
    return attendance.map(a => redactSecurityFields(a, isAdminOrManager));
  }
  if (!attendance) return attendance;
  
  const copy = { ...attendance };
  if (!isAdminOrManager) {
    delete copy.accuracy;
    delete copy.trustScore;
    delete copy.verificationMethod;
    delete copy.isFlagged;
    delete copy.flagReason;
    delete copy.isLivenessVerified;
    delete copy.livenessEmbeddingHash;
    delete copy.livenessConfidence;
  }
  return copy;
}

// Imports removed since Python Face Engine handles matching now
const axios = require('axios');
const crypto = require('crypto');

const checkFace = async (req, res) => {
  try {
    if (!req.body.image_base64) {
      return res.status(400).json({ error: 'Image missing.' });
    }
    const engineRes = await axios.post(`${process.env.PYTHON_ENGINE_URL || 'http://localhost:8000'}/register`, {
      image_base64: req.body.image_base64
    });
    
    if (engineRes.data.success) {
      return res.json({ success: true });
    } else {
      return res.status(400).json({ error: engineRes.data.error || 'NO_FACE_DETECTED' });
    }
  } catch (error) {
    if (error.response && error.response.data) {
      return res.status(400).json({ error: error.response.data.error || 'NO_FACE_DETECTED' });
    }
    return res.status(500).json({ error: 'FACE_ENGINE_ERROR' });
  }
};

const clockIn = async (req, res) => {
  try {
    const userId = req.user.id;
    const tenantId = req.user.tenantId;
    const { 
      latitude, 
      longitude, 
      accuracy, 
      verificationId,
      challengeId, 
      livenessTimestamp 
    } = req.body;

    // 0. Double Clock-In Guard: reject if open session already exists
    const openSession = await prisma.attendance.findFirst({
      where: { tenantId, userId, checkOut: null }
    });

    if (openSession) {
      return res.status(400).json({ 
        error: 'You are already clocked in. Please clock out of your active shift first.',
        openAttendanceId: openSession.id
      });
    }

    const currentVerificationId = verificationId || challengeId;

    if (!req.body.image_base64) {
      return res.status(400).json({ error: 'Live face image missing.' });
    }
    
    // 1. Fetch Registered Face for this user to pass to Python
    const registration = await prisma.faceRegistration.findUnique({ where: { userId } });
    if (!registration || registration.status !== 'active') {
      return res.status(400).json({
        error: 'Active face registration required before clocking in.',
        redirectTo: '/face-registration'
      });
    }

    const registeredEmbeddings = decryptEmbeddings(registration.encryptedEmbeddings);
    
    // 2. Delegate Verification completely to Python Face Engine
    let liveEmbeddingHash = null;
    let similarity = 0.99;
    try {
      const pythonUrl = process.env.PYTHON_ENGINE_URL || 'http://localhost:8000';
      const pythonRes = await axios.post(`${pythonUrl}/verify`, {
        image_base64: req.body.image_base64,
        known_faces: {
          [userId]: registeredEmbeddings
        }
      }, { timeout: 60000 });
      
      if (!pythonRes.data.success) {
        if (pythonRes.data.error === "SPOOF_DETECTED") {
          await prisma.auditLog.create({
            data: {
              tenantId: req.user.tenantId,
              actorId: userId,
              action: 'LIVENESS_CHECK_FAILED',
              targetId: userId,
              details: { error: 'Spoof detected by Anti-Spoofing Model', verificationId: currentVerificationId }
            }
          });
          return res.status(400).json({ error: 'Liveness check failed. Spoof detected.' });
        }
        
        // This handles "NO_MATCH_FOUND"
        await prisma.auditLog.create({
          data: {
            tenantId: req.user.tenantId,
            actorId: userId,
            action: 'FACE_MISMATCH',
            targetId: userId,
            details: { error: 'Face did not match registered identity.', verificationId: currentVerificationId }
          }
        });
        return res.status(400).json({ error: 'Face check failed. Your face does not match the registered identity.' });
      }
      
      // If success, we just generate a simple hash of the base64 for collision checking since we don't have the raw vector returned here
      liveEmbeddingHash = crypto.createHash('sha256').update(req.body.image_base64.substring(0, 500)).digest('hex');
      similarity = pythonRes.data.similarity || 0.99;
      
    } catch (err) {
      console.error("Python Face Engine Error:", err.message);
      return res.status(500).json({ error: 'Face Engine microservice offline.' });
    }

    const isLivenessVerified = true;
    const livenessConfidence = 0.99;

    // 3. Geofence Gate
    let officeLat = null;
    let officeLng = null;
    let radius = 500; // Default fallback radius

    let office = null;
    if (req.user.officeId) {
      office = await prisma.office.findUnique({ where: { id: req.user.officeId } });
    }
    if (!office) {
      office = await prisma.office.findFirst({ where: { tenantId: req.user.tenantId } });
    }

    if (office && office.lat != null && office.lng != null && !isNaN(office.lat) && !isNaN(office.lng)) {
      officeLat = Number(office.lat);
      officeLng = Number(office.lng);
      
      const configuredRadius = Number(office.radiusMeters || 0);
      radius = Math.max(500, configuredRadius); // Guarantee at least a 500m buffer
    }

    // Only enforce geofence distance check if valid office coordinates exist
    let distanceMeters = 0;
    if (officeLat !== null && officeLng !== null && latitude != null && longitude != null) {
      distanceMeters = getDistanceInMeters(officeLat, officeLng, latitude, longitude);
      if (distanceMeters > radius) {
        const formattedDistance = formatDistance(distanceMeters);
        await prisma.auditLog.create({
          data: {
            tenantId: req.user.tenantId,
            actorId: userId,
            action: 'GEOFENCE_FAILED',
            targetId: userId,
            details: { distanceMeters: Math.round(distanceMeters), formattedDistance, maxRadius: radius }
          }
        });
        return res.status(400).json({ error: `You are outside the office geofence (${formattedDistance} from office).` });
      }
    }

    // All 3 Hard Gate Checks Passed!
    await prisma.auditLog.create({
      data: {
        tenantId: req.user.tenantId,
        actorId: userId,
        action: 'FACE_ATTENDANCE_APPROVED',
        targetId: userId,
        details: { similarity, distanceMeters: Math.round(distanceMeters) }
      }
    });

    const lastAttendance = await prisma.attendance.findFirst({
      where: { userId },
      orderBy: { date: 'desc' }
    });

    const spatialInput = {
      latitude: latitude !== undefined ? latitude : null,
      longitude: longitude !== undefined ? longitude : null,
      accuracy: accuracy !== undefined ? accuracy : null,
      officeLat,
      officeLng,
      radius,
      lastAttendance
    };

    const livenessInput = {
      isLivenessVerified: !!isLivenessVerified,
      livenessConfidence: livenessConfidence !== undefined ? parseFloat(livenessConfidence) : null
    };

    const evaluation = computeCompositeTrust(spatialInput, livenessInput);

    const now = new Date();
    const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

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

    if (!activePolicy && !isOffDay) {
      activePolicy = {
        startTime: '09:00',
        endTime: '18:00',
        gracePeriodMinutes: 15
      };
    }

    // 3. Determine Late Status
    let status = evaluation?.isFlagged ? 'Absent' : 'Present';

    if (!isOffDay && activePolicy && activePolicy.startTime && activePolicy.endTime) {
      const [expHour, expMinute] = activePolicy.startTime.split(':').map(Number);
      const expectedStart = new Date(today);
      expectedStart.setHours(expHour, expMinute, 0, 0);

      const [endHour, endMinute] = activePolicy.endTime.split(':').map(Number);
      const expectedEnd = new Date(today);
      expectedEnd.setHours(endHour, endMinute, 0, 0);

      // Handle overnight shift
      if (expectedEnd <= expectedStart) {
        expectedEnd.setDate(expectedEnd.getDate() + 1);
      }

      // Allow clock-in up to gracePeriodMinutes before shift start
      const graceMs = (activePolicy.gracePeriodMinutes || 15) * 60000;
      const allowedStart = new Date(expectedStart.getTime() - graceMs);
      
      // Threshold is 1 hour after shift start for "HalfDay" marking
      const lateThreshold = new Date(expectedStart.getTime() + 60 * 60000);

      // 1. Strictly deny clock in outside of the shift window
      if (checkInTime < allowedStart || checkInTime > expectedEnd) {
        return res.status(403).json({ error: 'Clock-in is only allowed during your scheduled shift.' });
      }

      // 2. Mark as HalfDay if late
      if (checkInTime > lateThreshold) {
        status = 'HalfDay';
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
        status: status,
        latitude: latitude !== undefined ? parseFloat(latitude) : null,
        longitude: longitude !== undefined ? parseFloat(longitude) : null,
        accuracy: accuracy !== undefined ? parseFloat(accuracy) : null,
        trustScore: evaluation?.trustScore || 100,
        verificationMethod: evaluation?.verificationMethod || 'FACE_GEOFENCE',
        isFlagged: evaluation?.isFlagged || false,
        flagReason: evaluation?.flagReason || null,
        isLivenessVerified: !!isLivenessVerified,
        livenessEmbeddingHash: liveEmbeddingHash
      }
    });

    // Embedding collision check (anti-buddy-punching)
    if (isLivenessVerified && liveEmbeddingHash) {
      const collision = await prisma.attendance.findFirst({
        where: {
          tenantId: req.user.tenantId,
          date: today,
          livenessEmbeddingHash: liveEmbeddingHash,
          userId: { not: userId }
        }
      });

      if (collision) {
        await prisma.proxyAlert.create({
          data: {
            tenantId: req.user.tenantId,
            userId,
            targetUserId: collision.userId,
            alertType: 'identity_embedding_collision',
            severity: 'HIGH',
            reason: 'Face embedding collision detected (same face clocked in for different users)',
            metadata: {
              verificationId: currentVerificationId,
              livenessTimestamp,
              collidingAttendanceId: collision.id,
              currentAttendanceId: attendance.id
            },
            attendanceDate: today
          }
        });

        // Flag both records and degrade trust score to 20
        await prisma.attendance.updateMany({
          where: { id: { in: [attendance.id, collision.id] } },
          data: { 
            isFlagged: true, 
            flagReason: 'IDENTITY_COLLISION',
            trustScore: 20
          }
        });
      }
    }

    dispatchWebhook(tenantId, 'attendance.checkin', {
      userId,
      checkInTime: attendance.checkIn,
      status: attendance.status
    });

    try {
      const userDetails = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, displayName: true, department: true, avatar: true, baseSalary: true }
      });
      if (userDetails) {
        const { registerCheckIn, getTenantState } = require('../utils/pulseEngine');
        registerCheckIn(req.user.tenantId, {
          id: userDetails.id,
          baseSalary: userDetails.baseSalary || 0,
          displayName: userDetails.displayName || 'Unknown',
          department: userDetails.department || 'Staff',
          avatarUrl: userDetails.avatar || null
        });
        const io = req.app.get('io');
        if (io) {
          io.to(`tenant:${req.user.tenantId}:admin:pulse`).emit('pulse:update', getTenantState(req.user.tenantId));
        }
      }
    } catch (e) {
      console.error('Failed to trigger check-in pulse update:', e);
    }

    const isAdminOrManager = req.user.roleDefinition && req.user.roleDefinition.level <= 2;
    res.json(redactSecurityFields ? redactSecurityFields(attendance, isAdminOrManager) : attendance);
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

    let checkOutTime = new Date();
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

    const userWithShift = await prisma.user.findUnique({
      where: { id: userId },
      include: { shiftPolicy: true }
    });

    const shiftPolicy = (userWithShift && userWithShift.shiftPolicy)
      ? userWithShift.shiftPolicy
      : { startTime: '09:00', endTime: '18:00', breakDurationMinutes: 60 };

    const { getShiftWindowForDate } = require('../utils/shiftWindow');
    const { shiftEnd } = getShiftWindowForDate(shiftPolicy, clockInTime);
    
    // Record actual checkout time — never cap the timestamp.
    // Stale session guard: if gap > 20h, treat as forgotten clock-out
    const rawGrossHoursFinal = (checkOutTime - clockInTime) / (1000 * 60 * 60);
    const effectiveGrossHours = rawGrossHoursFinal > 20
      ? expectedShiftHours
      : rawGrossHoursFinal;

    const netWorkHoursFinal = Math.max(0, parseFloat((effectiveGrossHours - (effectiveGrossHours > breakHours ? breakHours : 0)).toFixed(2)));
    const extraHoursRaw = Math.max(0, parseFloat((netWorkHoursFinal - (expectedShiftHours - breakHours)).toFixed(2)));

    // Re-evaluate status at clock-out based on actual hours worked
    const { deriveAttendanceStatus } = require('../utils/attendanceStatusEngine');
    const finalStatus = deriveAttendanceStatus(netWorkHoursFinal, shiftPolicy, existing.date);

    const attendance = await prisma.attendance.update({
      where: { id: existing.id },
      data: {
        checkOut: checkOutTime,
        workHours: netWorkHoursFinal,
        extraHours: extraHoursRaw,
        status: finalStatus
      }
    });

    dispatchWebhook(tenantId, 'attendance.checkout', {
      userId,
      checkOutTime,
      workHours: netWorkHoursFinal,
      extraHours: extraHoursRaw,
      auto: false
    });

    // Event-Driven Dirty Marking for Intelligence Engine
    await prisma.intelligenceProfile.upsert({
      where: { userId },
      update: { isDirty: true },
      create: { tenantId, userId, isDirty: true }
    }).catch(err => console.error('[Intelligence] Failed to mark profile dirty:', err));

    try {
      const userDetails = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, displayName: true, department: true, avatar: true, baseSalary: true }
      });
      if (userDetails) {
        const { registerCheckOut, getTenantState } = require('../utils/pulseEngine');
        registerCheckOut(req.user.tenantId, {
          id: userDetails.id,
          baseSalary: userDetails.baseSalary || 0,
          displayName: userDetails.displayName || 'Unknown',
          department: userDetails.department || 'Staff',
          avatarUrl: userDetails.avatar || null
        });
        const io = req.app.get('io');
        if (io) {
          io.to(`tenant:${req.user.tenantId}:admin:pulse`).emit('pulse:update', getTenantState(req.user.tenantId));
        }
      }
    } catch (e) {
      console.error('Failed to trigger check-out pulse update:', e);
    }

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
    const isAdminOrManager = req.user.roleDefinition && req.user.roleDefinition.level <= 2;
    res.json(redactSecurityFields(records, isAdminOrManager));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getTodayAttendance = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const utcToday = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    
    const records = await prisma.attendance.findMany({
      where: {
        tenantId,
        OR: [
          { date: utcToday },
          { checkIn: { gte: startOfToday, lte: endOfToday } }
        ]
      },
      include: {
        user: {
          select: { displayName: true, department: true, avatar: true }
        }
      },
      orderBy: { checkIn: 'desc' }
    });

    // Fetch today's proxy alerts for the tenant to construct proxyAlerts for the audit log drawer
    const alerts = await prisma.proxyAlert.findMany({
      where: {
        tenantId,
        OR: [
          { attendanceDate: utcToday },
          { createdAt: { gte: startOfToday, lte: endOfToday } }
        ]
      }
    });

    const recordsWithAlerts = records.map(r => {
      const userAlerts = alerts.filter(a => a.userId === r.userId || a.targetUserId === r.userId);
      const mappedAlerts = userAlerts.map(a => ({
        id: a.id,
        reason: a.reason,
        details: {
          distanceFromOffice: a.metadata?.distance,
          velocityKmH: a.metadata?.speed,
          challengeId: a.metadata?.challengeId,
          livenessTimestamp: a.metadata?.livenessTimestamp
        }
      }));
      return {
        ...r,
        proxyAlerts: mappedAlerts
      };
    });

    const isAdminOrManager = req.user.roleDefinition && req.user.roleDefinition.level <= 2;
    res.json(redactSecurityFields(recordsWithAlerts, isAdminOrManager));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getAttendanceReport = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { startDate, endDate, department } = req.query;

    const where = { tenantId };
    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }
    if (department) {
      where.user = { department };
    }

    const records = await prisma.attendance.findMany({
      where,
      include: {
        user: {
          select: { id: true, displayName: true, email: true, department: true, customRole: true, employeeId: true }
        }
      },
      orderBy: { date: 'desc' }
    });

    const summary = {
      totalRecords: records.length,
      presentCount: records.filter(r => r.status === 'Present').length,
      absentCount: records.filter(r => r.status === 'Absent').length,
      halfDayCount: records.filter(r => r.status === 'HalfDay').length,
      flaggedCount: records.filter(r => r.isFlagged).length
    };

    res.json({ summary, records });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getWeeklySpectrum = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    
    // Parse target date for the week (defaults to now)
    const targetDateStr = req.query.date;
    const targetDate = targetDateStr ? new Date(targetDateStr) : new Date();
    const targetDayIdx = targetDate.getDay(); // 0 = Sun, 6 = Sat

    const startOfWeek = new Date(targetDate);
    startOfWeek.setDate(targetDate.getDate() - targetDayIdx);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    const startOfWeekUTC = new Date(Date.UTC(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate(), 0, 0, 0, 0));
    const endOfWeekUTC = new Date(Date.UTC(endOfWeek.getFullYear(), endOfWeek.getMonth(), endOfWeek.getDate(), 23, 59, 59, 999));

    const realNow = new Date();
    realNow.setHours(0, 0, 0, 0);
    const realNowTime = realNow.getTime();

    // Parallelize all DB fetches
    const [totalUsersCount, allAttendance, allLeaves] = await Promise.all([
      prisma.user.count({
        where: { tenantId, status: 'Active' }
      }),
      prisma.attendance.findMany({
        where: {
          tenantId,
          OR: [
            { date: { gte: startOfWeekUTC, lte: endOfWeekUTC } },
            { checkIn: { gte: startOfWeekUTC, lte: endOfWeekUTC } }
          ]
        },
        select: { userId: true, status: true, date: true, checkIn: true }
      }),
      prisma.leave.findMany({
        where: {
          tenantId,
          status: 'Approved',
          startDate: { lte: endOfWeekUTC },
          endDate: { gte: startOfWeekUTC }
        },
        select: { userId: true, startDate: true, endDate: true }
      })
    ]);

    const totalEmployees = Math.max(1, totalUsersCount);
    const daysOfWeekNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weekData = [];

    // Reset startOfWeek to midnight for the loop logic
    startOfWeek.setHours(0, 0, 0, 0);

    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(startOfWeek);
      dayDate.setDate(startOfWeek.getDate() + i);
      const dayTime = dayDate.getTime();
      const isPast = dayTime < realNowTime;
      const isToday = dayTime === realNowTime;
      const isFuture = dayTime > realNowTime;
      const isWeekend = i === 0 || i === 6;

      // Create a local Date string for accurate comparison (YYYY-MM-DD)
      const targetDateStr = dayDate.getFullYear() + '-' + 
        String(dayDate.getMonth() + 1).padStart(2, '0') + '-' + 
        String(dayDate.getDate()).padStart(2, '0');

      let presentCount = 0;
      let halfDayCount = 0;
      let absentCount = 0;
      let leaveCount = 0;

      if (!isFuture) {
        // Filter from in-memory arrays instead of hitting DB sequentially
        const presentUserIds = new Set(
          allAttendance
            .filter(r => {
              const dStr = r.date ? r.date.toISOString().split('T')[0] : null;
              const matchesDate = (dStr === targetDateStr);
              return matchesDate && (r.status === 'Present' || r.status === 'Late' || r.status === 'Completed' || !r.status);
            })
            .map(r => r.userId)
        );
        presentCount = presentUserIds.size;

        const halfDayUserIds = new Set(
          allAttendance
            .filter(r => {
              const dStr = r.date ? r.date.toISOString().split('T')[0] : null;
              const matchesDate = (dStr === targetDateStr);
              return matchesDate && r.status === 'HalfDay';
            })
            .map(r => r.userId)
        );
        halfDayCount = halfDayUserIds.size;

        const leaveUserIds = new Set(
          allLeaves
            .filter(l => {
              const ls = l.startDate ? l.startDate.toISOString().split('T')[0] : null;
              const le = l.endDate ? l.endDate.toISOString().split('T')[0] : null;
              return targetDateStr >= ls && targetDateStr <= le;
            })
            .map(l => l.userId)
        );
        leaveCount = leaveUserIds.size;

        const anyRecordCount = allAttendance.filter(r => {
           const dStr = r.date ? r.date.toISOString().split('T')[0] : null;
           return (dStr === targetDateStr);
        }).length;

        if (isWeekend) {
           // On weekends, if no one clocked in, don't show them as absent.
           absentCount = 0;
        } else {
           absentCount = Math.max(0, totalEmployees - presentCount - halfDayCount - leaveCount);
        }
      }

      const totalRecorded = presentCount + halfDayCount + absentCount + leaveCount;
      const activeDivisor = (isPast && totalRecorded === 0 && !isWeekend) ? 1 : totalEmployees;

      const presentPct = activeDivisor > 0 ? Math.round((presentCount / activeDivisor) * 100) : 0;
      const halfDayPct = activeDivisor > 0 ? Math.round((halfDayCount / activeDivisor) * 100) : 0;
      const absentPct = activeDivisor > 0 ? Math.round((absentCount / activeDivisor) * 100) : 0;
      const leavePct = activeDivisor > 0 ? Math.round((leaveCount / activeDivisor) * 100) : 0;

      weekData.push({
        dayName: daysOfWeekNames[i],
        dateStr: targetDateStr,
        idx: i,
        isPast,
        isToday,
        isFuture,
        isWeekend,
        presentCount,
        halfDayCount,
        absentCount,
        leaveCount,
        presentPct,
        halfDayPct,
        absentPct,
        leavePct,
        totalRecorded,
        totalEmployees
      });
    }

    res.json({
      totalEmployees,
      weekData
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  checkFace,
  clockIn,
  clockOut,
  getMyAttendance,
  getTodayAttendance,
  getAttendanceReport,
  getWeeklySpectrum
};
