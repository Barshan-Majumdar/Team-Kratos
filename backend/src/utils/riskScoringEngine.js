const prisma = require('../config/db'); // regular tenant-scoped prisma client

const FALLBACK_RISK = 50; // uniform "moderate risk" default for any missing data point

/**
 * Calculates a predictive risk score (0-100) for a salary advance request.
 * Note: The score is designed as a snapshot at request-creation time. It is not
 * dynamically recalculated on review to preserve audit log integrity.
 */
async function calculateAdvanceRiskScore(userId, amount, tenantId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { score: FALLBACK_RISK, label: 'MEDIUM' };

  // 1. Attrition Risk — 25%
  const attritionRisk = (user.attritionRiskScore ?? FALLBACK_RISK);
  const attritionContribution = attritionRisk * 0.25;

  // 2. Company Tenure — 20%
  let tenureRisk;
  if (user.dateOfJoining) {
    const monthsTenure = Math.max(0, (new Date() - new Date(user.dateOfJoining)) / (1000 * 60 * 60 * 24 * 30.4));
    if (monthsTenure < 3) tenureRisk = 100;
    else if (monthsTenure < 6) tenureRisk = 60;
    else if (monthsTenure < 12) tenureRisk = 30;
    else tenureRisk = 0;
  } else {
    tenureRisk = FALLBACK_RISK;
  }
  const tenureContribution = tenureRisk * 0.20;

  // 3. Debt-to-Income Ratio — 20%
  let ratioRisk;
  const baseSalary = user.baseSalary || 0;
  if (baseSalary > 0) {
    const ratio = amount / baseSalary;
    if (ratio > 0.7) ratioRisk = 100;
    else if (ratio > 0.5) ratioRisk = 70;
    else if (ratio > 0.3) ratioRisk = 40;
    else ratioRisk = 10;
  } else {
    ratioRisk = FALLBACK_RISK;
  }
  const ratioContribution = ratioRisk * 0.20;

  // 4. GPS/Proximity Flags & 5. Repayment History in parallel
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const [flaggedCount, pastAdvances] = await Promise.all([
    prisma.attendance.count({
      where: { userId, isFlagged: true, date: { gte: thirtyDaysAgo } },
    }),
    prisma.salaryAdvance.findMany({
      where: { userId, createdAt: { gte: twelveMonthsAgo } },
    })
  ]);

  let attendanceRisk = 0;
  if (flaggedCount >= 5) attendanceRisk = 100;
  else if (flaggedCount >= 2) attendanceRisk = 60;
  else if (flaggedCount === 1) attendanceRisk = 30;
  const attendanceContribution = attendanceRisk * 0.10;

  let repaymentRisk;
  if (pastAdvances.length === 0) {
    repaymentRisk = FALLBACK_RISK;
  } else {
    const rejectedCount = pastAdvances.filter(a => a.status === 'Rejected').length;
    const rejectionRatio = rejectedCount / pastAdvances.length;
    repaymentRisk = Math.min(100, rejectionRatio * 100 + (pastAdvances.length > 3 ? 15 : 0));
  }
  const repaymentContribution = repaymentRisk * 0.25;

  const finalScore = Math.round(
    attritionContribution + tenureContribution + ratioContribution + attendanceContribution + repaymentContribution
  );

  let label = 'LOW';
  if (finalScore >= 70) label = 'HIGH';
  else if (finalScore >= 35) label = 'MEDIUM';

  return { score: finalScore, label };
}

module.exports = { calculateAdvanceRiskScore };
