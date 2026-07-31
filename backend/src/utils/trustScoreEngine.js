const { evaluateSpatialTrust } = require('./spatialTrustEngine');

const LIVENESS_CONFIDENCE_HIGH = 0.85;

// Extends Feature 18's severity order with one new, high-priority entry.
const SEVERITY_ORDER = [
  'MOCK_LOCATION_DETECTED',
  'LIVENESS_FAILED',
  'VELOCITY_ANOMALY',
  'GEOFENCE_VIOLATION',
  'ACCURACY_VARIANCE_WARNING',
];

function computeLivenessScore({ isLivenessVerified, livenessConfidence }) {
  if (!isLivenessVerified) return 0; // should rarely be hit — client blocks on failure per Section 0
  if (livenessConfidence != null && livenessConfidence > LIVENESS_CONFIDENCE_HIGH) return 100;
  return 70; // verified but lower confidence
}

function computeCompositeTrust(spatialInput, livenessInput) {
  const spatial = evaluateSpatialTrust(
    spatialInput.latitude,
    spatialInput.longitude,
    spatialInput.accuracy,
    spatialInput.officeLat,
    spatialInput.officeLng,
    spatialInput.radius,
    spatialInput.lastAttendance
  ); // { trustScore, verificationMethod, isFlagged, flagReason, details }

  const livenessScore = computeLivenessScore(livenessInput);

  const triggered = [];
  if (spatial.flagReason) {
    triggered.push(...spatial.flagReason.split(' | '));
  }
  if (!livenessInput.isLivenessVerified) {
    triggered.push('LIVENESS_FAILED');
  }

  // Trust is only as strong as the weakest signal — do not average.
  const compositeScore = Math.min(
    spatial.trustScore, 
    livenessInput.isLivenessVerified ? livenessScore : 0
  );

  const verificationMethod =
    SEVERITY_ORDER.find(rule => triggered.some(t => t.includes(rule))) || 'GPS_HIGH_ACCURACY';

  return {
    trustScore: compositeScore,
    verificationMethod,
    isFlagged: compositeScore < 60 || triggered.length > 0,
    flagReason: triggered.join(' | ') || null,
    spatialDetail: spatial,
    livenessScore,
  };
}

module.exports = { computeCompositeTrust };
