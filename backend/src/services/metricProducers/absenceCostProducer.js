const { saveWorkforceMetric } = require('../workforceMetricService');
const { MetricTypes, MetricUnits, MetricClassifications, MetricScopes, AggregationMethods } = require('../metricDefinitions');
const prisma = require('../../config/db');

// Explicit Configuration (as requested by plan)
const ABSENCE_COST_CONFIG = {
  absenceCostMethod: 'DAILY_COST',
  dailyCostSource: 'AVERAGE_SALARY',
  assumedWorkingDaysPerMonth: 22
};

/**
 * Adapter that calculates ESTIMATED Absence Cost for a Department.
 * Strictly classifies the result as an ESTIMATE.
 */
const produceAbsenceCostEstimate = async (tenantId, departmentId, period) => {
  try {
    // 1. Fetch factual data to base the estimate on
    // Fetch average salary for the department
    const usersInDept = await prisma.basePrisma.user.findMany({
      where: { tenantId, department: departmentId },
      select: { baseSalary: true }
    });

    if (usersInDept.length === 0) return null;

    const totalSalary = usersInDept.reduce((sum, u) => sum + (u.baseSalary || 0), 0);
    const avgMonthlySalary = totalSalary / usersInDept.length;
    const assumedDailyCost = avgMonthlySalary / ABSENCE_COST_CONFIG.assumedWorkingDaysPerMonth;

    // Fetch actual absence days from Attendance
    // Parse period (e.g. '2026-08')
    const [year, month] = period.split('-');
    const startDate = new Date(`${year}-${month}-01T00:00:00.000Z`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    const absences = await prisma.basePrisma.attendance.count({
      where: {
        tenantId,
        user: { department: departmentId },
        date: { gte: startDate, lt: endDate },
        status: 'Absent'
      }
    });

    // 2. Calculate Estimate
    const estimatedAbsenceCost = absences * assumedDailyCost;

    // 3. Wrap in Metric Contract (Strictly ESTIMATE)
    const metricPayload = {
      tenantId,
      metric: MetricTypes.ABSENCE_PRODUCTIVITY_COST,
      scope: MetricScopes.DEPARTMENT,
      entityId: departmentId,
      period,
      value: parseFloat(estimatedAbsenceCost.toFixed(2)),
      unit: MetricUnits.CURRENCY,
      currency: 'INR',
      aggregationMethod: AggregationMethods.SUM,
      dataCompleteness: 1.0,
      classification: MetricClassifications.ESTIMATE, // EXTREMELY IMPORTANT: NOT FACT
      source: 'ATTENDANCE_X_SALARY_ESTIMATE',
      calculatedAt: new Date()
    };

    // 4. Persist
    const saved = await saveWorkforceMetric(metricPayload);
    console.log(`[METRIC PRODUCER] Pushed ESTIMATE ABSENCE_PRODUCTIVITY_COST for ${departmentId}`);
    return saved;

  } catch (error) {
    console.error('[METRIC PRODUCER ERROR] Failed to produce absence cost estimate:', error);
    throw error;
  }
};

module.exports = {
  produceAbsenceCostEstimate,
  ABSENCE_COST_CONFIG
};
