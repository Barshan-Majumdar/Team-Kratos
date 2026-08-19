const NEUTRAL_FALLBACK = 45; // used when a factor lacks enough history to compute meaningfully

/**
 * Each factor is { weight, compute(user, data) => 0-100 risk sub-score }.
 * Adding a new signal later (e.g. pulse-survey sentiment) means adding one
 * entry here — nothing else in this file needs to change.
 */
function buildFactors() {
  return [
    {
      name: 'overtimeTrend',
      weight: 0.20,
      compute: ({ recentAvgExtraHours, baselineAvgExtraHours, hasEnoughHistory }) => {
        if (!hasEnoughHistory || baselineAvgExtraHours === 0) return NEUTRAL_FALLBACK;
        const percentIncrease = ((recentAvgExtraHours - baselineAvgExtraHours) / baselineAvgExtraHours) * 100;
        // 0% or declining -> 0 risk; +50% or more increase -> 100 risk; linear between, clamped
        return Math.max(0, Math.min(100, (percentIncrease / 50) * 100));
      },
    },
    {
      name: 'attendanceVariance',
      weight: 0.20,
      compute: ({ recentCheckInStdDevMinutes, baselineCheckInStdDevMinutes, hasEnoughHistory }) => {
        if (!hasEnoughHistory || baselineCheckInStdDevMinutes === 0) return NEUTRAL_FALLBACK;
        const percentIncrease = ((recentCheckInStdDevMinutes - baselineCheckInStdDevMinutes) / baselineCheckInStdDevMinutes) * 100;
        return Math.max(0, Math.min(100, (percentIncrease / 50) * 100));
      },
    },
    {
      name: 'leaveFrequency',
      weight: 0.20,
      compute: ({ sickOrShortNoticeLeaveCountLast3Months }) => {
        // 0 instances -> 0 risk; 5+ instances -> 100 risk; linear between
        return Math.max(0, Math.min(100, (sickOrShortNoticeLeaveCountLast3Months / 5) * 100));
      },
    },
    {
      name: 'intelligencePattern',
      weight: 0.40,
      compute: ({ intelligenceSignals = [] }) => {
        if (intelligenceSignals.length === 0) return 0;
        
        let signalRiskSum = 0;
        for (const signal of intelligenceSignals) {
          let basePoints = 0;
          switch (signal.severity) {
            case 'CRITICAL': basePoints = 100; break;
            case 'HIGH': basePoints = 75; break;
            case 'MEDIUM': basePoints = 40; break;
            case 'LOW': basePoints = 10; break;
          }
          signalRiskSum += (basePoints * signal.confidence);
        }
        
        // Average the risk impact from signals, or let them stack up to 100.
        // We'll let them stack, so multiple high-confidence signals peg this sub-score to 100.
        return Math.min(100, signalRiskSum);
      }
    }
  ];
}

function computeAttritionRisk(inputData) {
  const factors = buildFactors();
  let weightedSum = 0;
  for (const factor of factors) {
    weightedSum += factor.compute(inputData) * factor.weight;
  }
  const score = Math.round(weightedSum);

  let label = 'Low';
  if (score >= 75) label = 'Critical';
  else if (score >= 50) label = 'High';
  else if (score >= 25) label = 'Moderate';

  return { score, label };
}

module.exports = { computeAttritionRisk };
