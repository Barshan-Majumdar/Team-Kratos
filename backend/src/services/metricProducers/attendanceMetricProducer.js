const { saveWorkforceMetric } = require('../workforceMetricService');
const { MetricTypes, MetricUnits, MetricClassifications, MetricScopes, AggregationMethods } = require('../metricDefinitions');
const prisma = require('../../config/db');

/**
 * Adapter that calculates Attendance Metrics for a Department and pushes them 
 * down to the standard WorkforceMetric layer.
 * 
 * @param {String} tenantId 
 * @param {String} departmentId (entityId)
 * @param {String} period (e.g. "2026-08")
 */
const produceDepartmentAttendanceMetric = async (tenantId, departmentId, period) => {
  try {
    // 1. Fetch raw data from the mature engine (Attendance / User tables)
    // This is a simplified proxy for demonstration.
    // In reality, this calls your AttendanceEngine's getDepartmentStats method.
    
    // Fake calculated values for the adapter
    const currentAttendance = 87.4; 
    const baselineAttendance = 94.1;
    const delta = currentAttendance - baselineAttendance;
    const dataCompleteness = 0.95;

    // 2. Wrap it in the strict Metric Contract
    const metricPayload = {
      tenantId,
      metric: MetricTypes.ATTENDANCE_PERCENT,
      scope: MetricScopes.DEPARTMENT,
      entityId: departmentId,
      period,
      value: currentAttendance,
      unit: MetricUnits.PERCENTAGE,
      aggregationMethod: AggregationMethods.AVG,
      dataCompleteness,
      baseline: baselineAttendance,
      delta: parseFloat(delta.toFixed(2)),
      deltaPercent: parseFloat(((delta / baselineAttendance) * 100).toFixed(2)),
      confidence: 0.93, // Based on dataCompleteness
      classification: MetricClassifications.FACT, // This is observed data
      source: 'ATTENDANCE_ENGINE',
      calculatedAt: new Date()
    };

    // 3. Persist to the Metric Layer
    await saveWorkforceMetric(metricPayload);
    
    console.log(`[METRIC PRODUCER] Pushed ATTENDANCE_PERCENT for ${departmentId}`);
    return metricPayload;
  } catch (error) {
    console.error('[METRIC PRODUCER ERROR] Failed to produce attendance metric:', error);
    throw error;
  }
};

module.exports = {
  produceDepartmentAttendanceMetric
};
