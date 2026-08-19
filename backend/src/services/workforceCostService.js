const { getMetrics } = require('./workforceMetricService');
const { MetricClassifications } = require('./metricDefinitions');
const prisma = require('../config/db');

// Configurable thresholds for deterministic anomaly detection
const COST_THRESHOLDS = {
  OVERTIME_COST: { mediumDeltaPercent: 10, highDeltaPercent: 25 },
  PAYROLL_COST: { mediumDeltaPercent: 5, highDeltaPercent: 15 },
  ABSENCE_PRODUCTIVITY_COST: { mediumDeltaPercent: 10, highDeltaPercent: 20 },
  VACANCY_PRODUCTIVITY_COST: { mediumDeltaPercent: 10, highDeltaPercent: 25 }
};

class WorkforceCostService {
  /**
   * Retrieves a structured cost insight for a specific metric.
   * Enforces RBAC internally (placeholder check for ctx).
   * Calculates deterministic baseline deltas and anomaly signals.
   */
  async getCostInsight(tenantId, metric, scope, entityId, period, baselinePeriod, ctx) {
    // 1. Basic RBAC Check (Only roleLevel <= 2 can view high-level costs, 
    // payroll specific ones might require roleLevel <= 1 if we expand this)
    if (ctx && ctx.roleLevel > 2) {
      throw new Error('Unauthorized to view workforce cost data');
    }

    // 2. Fetch current metric from abstraction layer
    const currentMetrics = await getMetrics(tenantId, entityId, scope, period);
    const current = currentMetrics.find(m => m.metric === metric);

    if (!current) {
      return {
        metric,
        scope,
        entityId,
        period,
        error: 'No metric data available for the current period.'
      };
    }

    // 3. Fetch baseline metric
    const baselineMetrics = await getMetrics(tenantId, entityId, scope, baselinePeriod);
    const baseline = baselineMetrics.find(m => m.metric === metric);

    // 4. Construct Insight Object
    const insight = {
      metric: current.metric,
      classification: current.classification, // FACT, ESTIMATE, etc.
      scope,
      entityId,
      period,
      baselinePeriod,
      currentValue: current.value,
      unit: current.unit,
      currency: current.currency,
      baselineValue: baseline ? baseline.value : null,
      delta: null,
      deltaPercent: null,
      anomalies: [],
      source: current.source,
      assumptionExplanation: null
    };

    // Attach mathematical explanation for estimates
    if (metric === 'ABSENCE_PRODUCTIVITY_COST' && current.classification === 'ESTIMATE') {
      try {
        const usersInDept = await prisma.basePrisma.user.findMany({
          where: { tenantId, department: entityId },
          select: { baseSalary: true }
        });
        if (usersInDept.length > 0) {
          const totalSalary = usersInDept.reduce((sum, u) => sum + (u.baseSalary || 0), 0);
          const avgMonthlySalary = totalSalary / usersInDept.length;
          const assumedDailyCost = avgMonthlySalary / 22; // Configured days
          const inferredAbsenceDays = current.value / assumedDailyCost;
          
          insight.assumptionExplanation = `Based on ₹${Math.round(assumedDailyCost).toLocaleString()} estimated daily productivity cost × ${Math.round(inferredAbsenceDays)} absence days. Does not represent direct payroll loss.`;
        }
      } catch (e) {
        console.error('Failed to attach explanation:', e);
      }
    }

    // 5. Deterministic Comparison
    if (baseline && baseline.value > 0) {
      insight.delta = parseFloat((current.value - baseline.value).toFixed(2));
      insight.deltaPercent = parseFloat(((insight.delta / baseline.value) * 100).toFixed(2));

      // 6. Anomaly Detection
      const thresholds = COST_THRESHOLDS[metric];
      if (thresholds && insight.deltaPercent >= thresholds.highDeltaPercent) {
        insight.anomalies.push({
          type: `${metric}_ANOMALY`,
          severity: 'HIGH',
          message: `${metric} is ${insight.deltaPercent}% above its ${baselinePeriod} baseline.`,
          deltaPercent: insight.deltaPercent
        });
      } else if (thresholds && insight.deltaPercent >= thresholds.mediumDeltaPercent) {
        insight.anomalies.push({
          type: `${metric}_ANOMALY`,
          severity: 'MEDIUM',
          message: `${metric} is ${insight.deltaPercent}% above its ${baselinePeriod} baseline.`,
          deltaPercent: insight.deltaPercent
        });
      }
    }

    return insight;
  }

  /**
   * Generates a dashboard summary for a department
   */
  async getDepartmentCostSummary(tenantId, departmentId, period, baselinePeriod, ctx) {
    const metricsToFetch = ['PAYROLL_COST', 'OVERTIME_COST', 'BENEFITS_COST', 'BONUS_COST', 'ABSENCE_PRODUCTIVITY_COST'];
    
    const summary = {
      departmentId,
      period,
      baselinePeriod,
      insights: []
    };

    for (const metric of metricsToFetch) {
      const insight = await this.getCostInsight(tenantId, metric, 'DEPARTMENT', departmentId, period, baselinePeriod, ctx);
      if (!insight.error) {
        summary.insights.push(insight);
      }
    }

    return summary;
  }
}

module.exports = new WorkforceCostService();
