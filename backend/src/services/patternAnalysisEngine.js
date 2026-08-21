const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

// Use the base Prisma client to avoid tenant context issues if run in background jobs
const prisma = new PrismaClient();
const { sendNotification } = require('./../utils/notificationEngine');

// ── Configuration Thresholds ────────────────────────────────────────────────
const CONFIG = {
  attendanceDegradation: {
    mediumDelta: -8, // percentage points
    highDelta: -15
  },
  punctualityShift: {
    mediumMinutes: 15,
    highMinutes: 30
  },
  leaveSpikes: {
    mediumDeltaDays: 2,
    highDeltaDays: 4
  },
  overtimeExposure: {
    mediumDeltaHours: 1.5,
    highDeltaHours: 3
  },
  crossSignal: {
    minimumIndependentSignals: 3
  },
  dataRequirements: {
    minimumBaselineDays: 90,
    minimumComparisonDays: 30,
    totalRequiredHistory: 120 // 30 + 90
  }
};

/**
 * Generates a deterministic SHA-256 hash for signal deduplication.
 */
function generateSignalKey(employeeId, signalType, comparisonWindow, baselineWindow) {
  const payload = `${employeeId}_${signalType}_${comparisonWindow}_${baselineWindow}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}

/**
 * Calculates a deterministic confidence score (0.0 to 1.0) based on data sufficiency.
 */
function calculateConfidence(expectedBaseline, actualBaseline, expectedComparison, actualComparison, stabilityVariance = 1.0) {
  const baselineSufficiency = Math.min(actualBaseline / expectedBaseline, 1.0);
  const dataCompleteness = Math.min(actualComparison / expectedComparison, 1.0);
  
  // Example stability variance (can be expanded later for variance calculation)
  const signalStability = stabilityVariance;

  const confidence = (dataCompleteness * baselineSufficiency * signalStability);
  return Math.min(Math.max(confidence, 0.0), 1.0); // clamp
}

/**
 * Maps a continuous confidence value to a human-readable severity label.
 */
function getConfidenceLabel(confidence) {
  if (confidence >= 0.90) return 'HIGH';
  if (confidence >= 0.70) return 'MEDIUM';
  return 'LOW';
}

/**
 * Extracts attendance insights for the user across the specified windows.
 * Expected to be run by the nightly cron or event triggers.
 */
async function analyzeEmployeePattern(userId, tenantId) {
  const today = new Date();
  
  // Current Window: 30 days ago to today
  const currentWindowStart = new Date(today);
  currentWindowStart.setDate(today.getDate() - 30);

  // Historical Baseline: 120 days ago to 31 days ago (pure 90 day baseline)
  const baselineStart = new Date(today);
  baselineStart.setDate(today.getDate() - 120);
  
  const baselineEnd = new Date(today);
  baselineEnd.setDate(today.getDate() - 31);

  // 1. Verify basic data sufficiency via user's join date
  const user = await prisma.user.findFirst({
    where: { id: userId, tenantId },
    select: { dateOfJoining: true }
  });

  if (!user || !user.dateOfJoining) {
    return { status: 'INSUFFICIENT_HISTORY', reason: 'Missing join date' };
  }

  const daysSinceJoining = Math.floor((today - user.dateOfJoining) / (1000 * 60 * 60 * 24));
  if (daysSinceJoining < CONFIG.dataRequirements.totalRequiredHistory) {
    return { 
      status: 'INSUFFICIENT_HISTORY', 
      reason: `Only ${daysSinceJoining} days of history. ${CONFIG.dataRequirements.totalRequiredHistory} days required.` 
    };
  }

  const generatedSignals = [];

  // --- ATTENDANCE DEGRADATION ---
  // Fetch Attendance records for both windows
  const currentAttendances = await prisma.attendance.findMany({
    where: {
      userId,
      tenantId,
      date: { gte: currentWindowStart, lte: today }
    }
  });

  const baselineAttendances = await prisma.attendance.findMany({
    where: {
      userId,
      tenantId,
      date: { gte: baselineStart, lte: baselineEnd }
    }
  });

  const calcAttendancePercentage = (records, expectedDays) => {
    if (expectedDays === 0) return 0;
    const presentCredits = records.reduce((sum, r) => {
      if (r.status === 'Present') return sum + 1;
      if (r.status === 'HalfDay') return sum + 0.5;
      return sum;
    }, 0);
    return (presentCredits / expectedDays) * 100;
  };

  const baselineCount = baselineAttendances.length;
  const currentCount = currentAttendances.length;

  // Assuming expected days roughly equals the number of records found (for simplified calculation)
  // In a real scenario, this would check ExpectedWorkingDays from ShiftRosters.
  const baselinePercentage = calcAttendancePercentage(baselineAttendances, baselineCount || 1);
  const currentPercentage = calcAttendancePercentage(currentAttendances, currentCount || 1);

  const attendanceDelta = currentPercentage - baselinePercentage;

  if (attendanceDelta <= CONFIG.attendanceDegradation.mediumDelta) {
    const severity = attendanceDelta <= CONFIG.attendanceDegradation.highDelta ? 'HIGH' : 'MEDIUM';
    const confidence = calculateConfidence(90, baselineCount, 30, currentCount);

    generatedSignals.push({
      signalKey: generateSignalKey(userId, 'ATTENDANCE_DEGRADATION', '30D', '90D'),
      type: 'ATTENDANCE_DEGRADATION',
      severity,
      confidence,
      baselineDays: 90,
      comparisonDays: 30,
      evidenceCount: currentCount,
      baselineValue: baselinePercentage,
      currentValue: currentPercentage,
      deltaValue: attendanceDelta,
      sourceRecords: currentAttendances.map(a => a.id).slice(0, 10) // store up to 10 evidence IDs
    });
  }

  // --- PUNCTUALITY SHIFTS ---
  // A simplified punctuality metric: Average Extra Check-In Minutes
  const calcPunctualityDelay = (records) => {
    if (records.length === 0) return 0;
    const delays = records.map(r => {
      const checkInDate = new Date(r.checkIn);
      const dateString = new Intl.DateTimeFormat('en-CA', { 
        timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' 
      }).format(checkInDate);
      const shiftStart = new Date(`${dateString}T09:00:00+05:30`);
      return Math.max(0, (checkInDate - shiftStart) / (1000 * 60)); // minutes late
    });
    return delays.reduce((sum, d) => sum + d, 0) / delays.length;
  };

  const baselineDelay = calcPunctualityDelay(baselineAttendances);
  const currentDelay = calcPunctualityDelay(currentAttendances);
  const delayDelta = currentDelay - baselineDelay;

  if (delayDelta >= CONFIG.punctualityShift.mediumMinutes) {
    const severity = delayDelta >= CONFIG.punctualityShift.highMinutes ? 'HIGH' : 'MEDIUM';
    const confidence = calculateConfidence(90, baselineCount, 30, currentCount);

    generatedSignals.push({
      signalKey: generateSignalKey(userId, 'PUNCTUALITY_SHIFT', '30D', '90D'),
      type: 'PUNCTUALITY_SHIFT',
      severity,
      confidence,
      baselineDays: 90,
      comparisonDays: 30,
      evidenceCount: currentCount,
      baselineValue: baselineDelay,
      currentValue: currentDelay,
      deltaValue: delayDelta,
      sourceRecords: []
    });
  }

  // --- UPSERT SIGNALS TO DATABASE ---
  const savedSignals = [];
  
  for (const signal of generatedSignals) {
    // Upsert signal. If it exists and is ACKNOWLEDGED, keep state, just update math.
    const existing = await prisma.intelligenceSignal.findUnique({
      where: { signalKey: signal.signalKey }
    });

    const saved = await prisma.intelligenceSignal.upsert({
      where: { signalKey: signal.signalKey },
      update: {
        severity: signal.severity,
        confidence: signal.confidence,
        baselineValue: signal.baselineValue,
        currentValue: signal.currentValue,
        deltaValue: signal.deltaValue,
        evidenceCount: signal.evidenceCount,
        sourceRecords: signal.sourceRecords,
        updatedAt: new Date()
      },
      create: {
        tenantId,
        userId,
        signalKey: signal.signalKey,
        type: signal.type,
        severity: signal.severity,
        lifecycleState: 'NEW',
        confidence: signal.confidence,
        baselineDays: signal.baselineDays,
        comparisonDays: signal.comparisonDays,
        evidenceCount: signal.evidenceCount,
        baselineValue: signal.baselineValue,
        currentValue: signal.currentValue,
        deltaValue: signal.deltaValue,
        sourceRecords: signal.sourceRecords
      }
    });

    // Broadcast if NEW and HIGH/CRITICAL
    if (!existing && (signal.severity === 'HIGH' || signal.severity === 'CRITICAL')) {
      const admins = await prisma.user.findMany({
        where: { tenantId, status: 'Active', roleDefinition: { level: { lte: 1 } } },
        select: { id: true }
      });

      for (const admin of admins) {
        sendNotification({
          userId: admin.id,
          tenantId,
          type: 'INTELLIGENCE_ALERT',
          title: `Intelligence Alert: ${signal.type} [${signal.severity}]`,
          message: `Behavioral anomaly detected for employee (ID: ${userId}). Pattern: ${signal.type}. Expected: ${signal.baselineValue?.toFixed(2) || 'N/A'}, Current: ${signal.currentValue?.toFixed(2) || 'N/A'}. Delta: ${signal.deltaValue?.toFixed(2) || 'N/A'}`,
          data: { signalId: saved.id, userId, severity: signal.severity }
        });
      }
    }

    savedSignals.push(saved);
  }

  // Clear dirty flag
  await prisma.intelligenceProfile.upsert({
    where: { userId },
    update: { isDirty: false, lastAnalyzedAt: new Date() },
    create: { tenantId, userId, isDirty: false, lastAnalyzedAt: new Date() }
  });

  return { status: 'SUCCESS', signals: savedSignals };
}

module.exports = {
  analyzeEmployeePattern,
  CONFIG
};
