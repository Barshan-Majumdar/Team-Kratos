const { getDistanceInMeters, formatDistance } = require('./geoUtils');
const getDistanceFromLatLonInM = getDistanceInMeters;

const MAX_PLAUSIBLE_SPEED_KMH = 900;

/**
 * Evaluates spatial trust score (0-100) and returns verification method, flagging status, and reasons.
 * 
 * @param {number|null} latitude - Check-in latitude
 * @param {number|null} longitude - Check-in longitude
 * @param {number|null} accuracy - Check-in GPS accuracy in meters
 * @param {number} officeLat - Configure office latitude
 * @param {number} officeLng - Configure office longitude
 * @param {number} radiusMeters - Geofencing radius in meters
 * @param {object|null} lastAttendance - User's last attendance record
 * @returns {object} { trustScore, verificationMethod, isFlagged, flagReason, details }
 */
function evaluateSpatialTrust(latitude, longitude, accuracy, officeLat, officeLng, radiusMeters, lastAttendance) {
  let trustScore = 100;
  const reasons = [];
  const details = {
    distanceFromOffice: null,
    velocityKmH: null,
    accuracyMeters: accuracy,
    hasCoordinates: false
  };

  // 1. Missing coordinates check
  if (latitude === null || latitude === undefined || longitude === null || longitude === undefined) {
    trustScore = 0;
    reasons.push("GPS coordinates missing");
    return {
      trustScore,
      verificationMethod: 'MOCK_LOCATION_DETECTED',
      isFlagged: true,
      flagReason: reasons.join(", "),
      details
    };
  }

  details.hasCoordinates = true;
  const latNum = parseFloat(latitude);
  const lngNum = parseFloat(longitude);
  const accNum = accuracy !== null && accuracy !== undefined ? parseFloat(accuracy) : null;

  // 2. Geofence Distance Calculation
  const distance = getDistanceInMeters(officeLat, officeLng, latNum, lngNum);
  details.distanceFromOffice = Math.round(distance * 10) / 10; // 1 decimal place

  if (distance > radiusMeters) {
    trustScore -= 40;
    reasons.push(`Geofence violation: ${formatDistance(distance)} away (radius: ${formatDistance(radiusMeters)})`);
  }

  // 3. Static Mock Accuracy Provider Signature Check
  // Static mock providers often yield exactly 0.0, 1.0, or 5.0m
  if (accNum !== null && (accNum === 0 || accNum === 1 || accNum === 5)) {
    trustScore -= 40;
    reasons.push(`Suspicious static GPS accuracy signature detected (${accNum}m)`);
  }

  // 4. Low Accuracy (High Inaccuracy) Check
  if (accNum !== null && accNum > 500) {
    trustScore -= 30;
    reasons.push(`Low GPS accuracy: ${accNum}m (threshold: 500m)`);
  }

  // 5. Velocity / Teleportation Check (compared to last check-in)
  if (lastAttendance && lastAttendance.latitude !== null && lastAttendance.longitude !== null) {
    const lastLat = parseFloat(lastAttendance.latitude);
    const lastLng = parseFloat(lastAttendance.longitude);
    const lastTime = new Date(lastAttendance.checkIn || lastAttendance.createdAt);
    const currentTime = new Date();

    const distanceTraveled = getDistanceInMeters(lastLat, lastLng, latNum, lngNum); // in meters
    const timeDiffMs = currentTime - lastTime;
    const timeDiffHours = timeDiffMs / (1000 * 60 * 60);

    if (timeDiffHours > 0) {
      const speedKmH = (distanceTraveled / 1000) / timeDiffHours;
      details.velocityKmH = Math.round(speedKmH * 10) / 10;

      // 900 km/h is roughly passenger airplane speed; impossible velocity for land travel between shifts
      if (speedKmH > MAX_PLAUSIBLE_SPEED_KMH) {
        trustScore -= 50;
        reasons.push(`Impossible velocity: ${details.velocityKmH} km/h (threshold: ${MAX_PLAUSIBLE_SPEED_KMH} km/h)`);
      }
    }
  }

  // Ensure trust score is bounded between 0 and 100
  trustScore = Math.max(0, Math.min(100, trustScore));

  // Determine Verification Method
  let verificationMethod = 'GPS_HIGH_ACCURACY';
  if (accNum !== null && (accNum === 0 || accNum === 1 || accNum === 5)) {
    verificationMethod = 'MOCK_LOCATION_DETECTED';
  } else if (distance > radiusMeters) {
    verificationMethod = 'GEOFENCE_VIOLATION';
  } else if (details.velocityKmH !== null && details.velocityKmH > MAX_PLAUSIBLE_SPEED_KMH) {
    verificationMethod = 'SUSPICIOUS_VELOCITY';
  } else if (accNum !== null && accNum > 500) {
    verificationMethod = 'ACCURACY_VARIANCE_WARNING';
  }

  const isFlagged = trustScore < 60;
  const flagReason = reasons.length > 0 ? reasons.join(" | ") : null;

  return {
    trustScore,
    verificationMethod,
    isFlagged,
    flagReason,
    details
  };
}

module.exports = {
  evaluateSpatialTrust,
  getDistanceFromLatLonInM,
  MAX_PLAUSIBLE_SPEED_KMH
};
