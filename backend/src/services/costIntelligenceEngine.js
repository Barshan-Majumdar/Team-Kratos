const { getMetrics } = require('./workforceMetricService');
const { MetricTypes, MetricScopes, MetricClassifications } = require('./metricDefinitions');

/**
 * Compiles a factual Cost Intelligence Profile for a Department or the Company.
 * It strictly separates FACTs (observed payroll) from ESTIMATEs (opportunity costs).
 * It NEVER returns a single opaque "True Cost" number.
 *
 * @param {String} tenantId 
 * @param {String} entityId (e.g. departmentId or 'GLOBAL')
 * @param {String} scope (e.g. 'DEPARTMENT' or 'GLOBAL')
 * @param {String} period (e.g. "2026-08")
 */
const getCostIntelligenceProfile = async (tenantId, entityId, scope, period) => {
  try {
    // 1. Fetch standardized WorkforceMetrics for this entity & period
    const rawMetrics = await getMetrics(tenantId, entityId, scope, period);
    
    // Helper to safely extract a metric value, ensuring we check the classification
    const extractCost = (metricType, expectedClassification) => {
      const found = rawMetrics.find(m => m.metric === metricType && m.classification === expectedClassification);
      if (!found) return null;
      return {
        value: found.value,
        currency: found.currency || 'INR',
        classification: found.classification,
        source: found.source
      };
    };

    // 2. Strict Layering: Facts vs Estimates
    const facts = {
      payroll: extractCost(MetricTypes.PAYROLL_COST, MetricClassifications.FACT) || { value: 0, currency: 'INR', classification: 'FACT' },
      overtime: extractCost(MetricTypes.OVERTIME_COST, MetricClassifications.FACT) || { value: 0, currency: 'INR', classification: 'FACT' },
      benefits: extractCost(MetricTypes.BENEFITS_COST, MetricClassifications.FACT) || { value: 0, currency: 'INR', classification: 'FACT' },
      bonus: extractCost(MetricTypes.BONUS_COST, MetricClassifications.FACT) || { value: 0, currency: 'INR', classification: 'FACT' }
    };

    const estimates = {
      absenceProductivityCost: extractCost(MetricTypes.ABSENCE_PRODUCTIVITY_COST, MetricClassifications.ESTIMATE) || { value: 0, currency: 'INR', classification: 'ESTIMATE' },
      vacancyProductivityCost: extractCost(MetricTypes.VACANCY_PRODUCTIVITY_COST, MetricClassifications.ESTIMATE) || { value: 0, currency: 'INR', classification: 'ESTIMATE' }
    };

    // We explicitly calculate total observed facts, but NEVER add estimates into this total.
    const totalObservedCost = facts.payroll.value + facts.overtime.value + facts.benefits.value + facts.bonus.value;
    const totalEstimatedOpportunityCost = estimates.absenceProductivityCost.value + estimates.vacancyProductivityCost.value;

    return {
      entityId,
      scope,
      period,
      directCostFacts: {
        ...facts,
        totalObservedCost
      },
      estimatedOpportunityCosts: {
        ...estimates,
        totalEstimatedOpportunityCost
      }
    };
  } catch (error) {
    console.error(`[COST INTELLIGENCE ERROR] Failed to generate profile for ${entityId}:`, error);
    throw error;
  }
};

module.exports = {
  getCostIntelligenceProfile
};
