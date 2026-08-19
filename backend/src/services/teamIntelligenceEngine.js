const { getMetrics } = require('./workforceMetricService');
const { MetricTypes, MetricScopes } = require('./metricDefinitions');
const prisma = require('../config/db');

/**
 * Compiles a factual Team Intelligence Profile for a specific Department.
 * It strictly consumes from the WorkforceMetric layer and aggregates basic
 * demographic facts from the database without introducing AI hallucination.
 *
 * @param {String} tenantId 
 * @param {String} departmentId 
 * @param {String} period (e.g. "2026-08")
 */
const getDepartmentIntelligenceProfile = async (tenantId, departmentId, period) => {
  try {
    // 1. Fetch organizational facts (Headcount, Manager)
    const employees = await prisma.user.findMany({
      where: { 
        tenantId, 
        department: departmentId,
        status: 'Active'
      },
      select: { id: true, managerId: true }
    });

    const headcount = employees.length;
    // Derive the primary manager (simplified: most common managerId in the dept)
    const managerCounts = {};
    employees.forEach(e => {
      if (e.managerId) {
        managerCounts[e.managerId] = (managerCounts[e.managerId] || 0) + 1;
      }
    });
    const primaryManagerId = Object.keys(managerCounts).sort((a, b) => managerCounts[b] - managerCounts[a])[0] || null;

    let managerName = "Unassigned";
    if (primaryManagerId) {
      const mgr = await prisma.user.findUnique({ where: { id: primaryManagerId }, select: { displayName: true } });
      if (mgr) managerName = mgr.displayName;
    }

    // 2. Fetch standardized WorkforceMetrics for this Department & Period
    const rawMetrics = await getMetrics(tenantId, departmentId, MetricScopes.DEPARTMENT, period);
    
    // Helper to extract a metric safely
    const extractMetric = (metricType) => {
      const found = rawMetrics.find(m => m.metric === metricType);
      if (!found) return null;
      return {
        current: found.value,
        baseline: found.baseline,
        delta: found.delta,
        deltaPercent: found.deltaPercent,
        unit: found.unit,
        classification: found.classification,
        confidence: found.confidence
      };
    };

    // 3. Structure the Factual Intelligence Profile
    const profile = {
      department: departmentId,
      primaryManager: {
        id: primaryManagerId,
        name: managerName
      },
      headcount,
      metrics: {
        attendance: extractMetric(MetricTypes.ATTENDANCE_PERCENT),
        overtimeCost: extractMetric(MetricTypes.OVERTIME_COST),
        overtimeHours: extractMetric(MetricTypes.OVERTIME_HOURS),
        attritionRisk: extractMetric(MetricTypes.ATTRITION_RISK_SCORE),
        fraudDensity: extractMetric(MetricTypes.FRAUD_SIGNAL_COUNT)
      },
      dataCompleteness: rawMetrics.length > 0 ? 
        rawMetrics.reduce((acc, m) => acc + (m.dataCompleteness || 1), 0) / rawMetrics.length : 0
    };

    return profile;
  } catch (error) {
    console.error(`[TEAM INTELLIGENCE ERROR] Failed to generate profile for ${departmentId}:`, error);
    throw error;
  }
};

module.exports = {
  getDepartmentIntelligenceProfile
};
