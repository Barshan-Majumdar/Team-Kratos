const { saveWorkforceMetric } = require('../workforceMetricService');
const { MetricTypes, MetricUnits, MetricClassifications, MetricScopes, AggregationMethods } = require('../metricDefinitions');
const prisma = require('../../config/db');

/**
 * Adapter that calculates Payroll Metrics for a Department and pushes them 
 * down to the standard WorkforceMetric layer.
 * 
 * @param {String} tenantId 
 * @param {String} departmentId (entityId)
 * @param {String} period (e.g. "2026-08")
 */
const produceDepartmentPayrollMetrics = async (tenantId, departmentId, period) => {
  try {
    // 1. Fetch raw data from Payroll table for users in the given department
    const payrolls = await prisma.basePrisma.payroll.findMany({
      where: {
        tenantId,
        month: period,
        user: { department: departmentId }
      },
      include: { user: true }
    });

    if (payrolls.length === 0) {
      console.log(`[METRIC PRODUCER] No payroll records for ${departmentId} in ${period}`);
      return [];
    }

    // 2. Aggregate the costs (FACTS)
    let totalPayroll = 0;
    let totalOvertimeCost = 0;
    let totalBenefits = 0;
    let totalBonus = 0;

    for (const p of payrolls) {
      totalPayroll += p.grossSalary || 0;
      totalOvertimeCost += (p.overtimeBonus || 0);
      totalBenefits += (p.benefitsDeduction ? parseFloat(p.benefitsDeduction) : 0);
      totalBonus += (p.performanceBonus || 0);
    }

    // 3. Create metric payloads
    const payloads = [
      {
        metric: MetricTypes.PAYROLL_COST,
        value: totalPayroll,
      },
      {
        metric: MetricTypes.OVERTIME_COST,
        value: totalOvertimeCost,
      },
      {
        metric: MetricTypes.BENEFITS_COST,
        value: totalBenefits,
      },
      {
        metric: MetricTypes.BONUS_COST,
        value: totalBonus,
      }
    ];

    const savedMetrics = [];
    for (const p of payloads) {
      const metricPayload = {
        tenantId,
        metric: p.metric,
        scope: MetricScopes.DEPARTMENT,
        entityId: departmentId,
        period,
        value: p.value,
        unit: MetricUnits.CURRENCY,
        currency: 'INR', // Assuming INR for now, could be dynamic
        aggregationMethod: AggregationMethods.SUM,
        dataCompleteness: 1.0,
        classification: MetricClassifications.FACT, // This is observed data
        source: 'PAYROLL',
        calculatedAt: new Date()
      };
      
      const saved = await saveWorkforceMetric(metricPayload);
      savedMetrics.push(saved);
      console.log(`[METRIC PRODUCER] Pushed ${p.metric} for ${departmentId}`);
    }

    return savedMetrics;
  } catch (error) {
    console.error('[METRIC PRODUCER ERROR] Failed to produce payroll metrics:', error);
    throw error;
  }
};

module.exports = {
  produceDepartmentPayrollMetrics
};
