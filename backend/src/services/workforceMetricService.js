const prisma = require('../config/db');

/**
 * Persists a standardized WorkforceMetric to the database.
 * This is the ONLY way metrics should enter the Metric Layer.
 * 
 * @param {Object} params - Metric parameters (must match Prisma schema)
 */
const saveWorkforceMetric = async (params) => {
  try {
    const {
      tenantId,
      metric,
      scope,
      entityId,
      period,
      value,
      unit,
      currency = null,
      aggregationMethod = null,
      dataCompleteness = 1.0,
      baseline = null,
      delta = null,
      deltaPercent = null,
      confidence = 1.0,
      classification,
      source,
      calculatedAt = new Date()
    } = params;

    if (!tenantId || !metric || !scope || !entityId || !period || value === undefined || !unit || !classification || !source) {
      throw new Error('Missing mandatory fields for WorkforceMetric');
    }

    // Deterministic snapshot identifier prevents duplicating the same metric for the same period
    const metricSnapshotId = `wm_${tenantId}_${metric}_${scope}_${entityId}_${period}`;

    const upsertedMetric = await prisma.basePrisma.workforceMetric.upsert({
      where: { metricSnapshotId },
      update: {
        value,
        currency,
        aggregationMethod,
        dataCompleteness,
        baseline,
        delta,
        deltaPercent,
        confidence,
        classification,
        source,
        calculatedAt
      },
      create: {
        tenantId,
        metricSnapshotId,
        metric,
        scope,
        entityId,
        period,
        value,
        unit,
        currency,
        aggregationMethod,
        dataCompleteness,
        baseline,
        delta,
        deltaPercent,
        confidence,
        classification,
        source,
        calculatedAt
      }
    });

    return upsertedMetric;
  } catch (error) {
    console.error('[METRIC ADAPTER ERROR] Failed to save WorkforceMetric:', error);
    throw error;
  }
};

/**
 * Retrieves the latest standardized metrics for an entity
 */
const getMetrics = async (tenantId, entityId, scope, period = null) => {
  const whereClause = { tenantId, entityId, scope };
  if (period) {
    whereClause.period = period;
  }
  
  return await prisma.basePrisma.workforceMetric.findMany({
    where: whereClause,
    orderBy: { calculatedAt: 'desc' }
  });
};

module.exports = {
  saveWorkforceMetric,
  getMetrics
};
