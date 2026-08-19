const { getMetrics } = require('./workforceMetricService');
const { MetricTypes, MetricScopes, MetricClassifications } = require('./metricDefinitions');
const prisma = require('../config/db');
const { v4: uuidv4 } = require('uuid');

/**
 * The deterministic Scenario / Projection Engine.
 * This runs rigid physics/math simulations based on the WorkforceMetric layer
 * and explicit ScenarioInput assumptions.
 *
 * @param {String} tenantId 
 * @param {String} createdBy (userId)
 * @param {String} action (e.g. "ADD_HEADCOUNT")
 * @param {Object} parameters (e.g. { departmentId: "engineering", count: 3 })
 * @param {Object} assumptions (e.g. { OVERTIME_REDUCTION: 0.19 })
 * @param {String} inputMetricVersion (e.g. "2026-08")
 */
const calculateScenarioProjection = async (tenantId, createdBy, action, parameters, assumptions, inputMetricVersion) => {
  try {
    // 1. Fetch the exact Metric Snapshot used for this projection
    const rawMetrics = await getMetrics(tenantId, parameters.departmentId || 'GLOBAL', MetricScopes.DEPARTMENT, inputMetricVersion);
    if (rawMetrics.length === 0) {
      throw new Error(`Insufficient metric data for period ${inputMetricVersion} to run a projection.`);
    }

    // Extract current facts to use as the base for the simulation
    const currentPayroll = rawMetrics.find(m => m.metric === MetricTypes.PAYROLL_COST && m.classification === MetricClassifications.FACT)?.value || 0;
    const currentOvertime = rawMetrics.find(m => m.metric === MetricTypes.OVERTIME_COST && m.classification === MetricClassifications.FACT)?.value || 0;
    const currentHeadcount = rawMetrics.find(m => m.metric === MetricTypes.HEADCOUNT && m.classification === MetricClassifications.FACT)?.value || 1;
    
    const avgSalaryPerHead = currentHeadcount > 0 ? (currentPayroll / currentHeadcount) : 0;

    // 2. The Deterministic Calculation Matrix
    let projectedPayroll = currentPayroll;
    let projectedOvertime = currentOvertime;
    let newHeadcount = currentHeadcount;

    if (action === 'ADD_HEADCOUNT') {
      const addedCount = parameters.count || 1;
      newHeadcount += addedCount;
      projectedPayroll += (addedCount * avgSalaryPerHead);
      
      // Apply the assumption, if provided
      if (assumptions.OVERTIME_REDUCTION) {
        const reductionRatio = parseFloat(assumptions.OVERTIME_REDUCTION); // e.g. 0.19
        projectedOvertime = currentOvertime - (currentOvertime * reductionRatio);
      }
    }

    const netMonthlyCostChange = (projectedPayroll + projectedOvertime) - (currentPayroll + currentOvertime);

    // 3. Structure the Result (Strictly classifying data types)
    const resultMatrix = {
      baseline: {
        headcount: { value: currentHeadcount, type: MetricClassifications.FACT },
        payrollCost: { value: currentPayroll, type: MetricClassifications.FACT },
        overtimeCost: { value: currentOvertime, type: MetricClassifications.FACT }
      },
      projection: {
        headcount: { value: newHeadcount, type: MetricClassifications.PROJECTION },
        payrollCost: { value: parseFloat(projectedPayroll.toFixed(2)), type: MetricClassifications.PROJECTION },
        overtimeCost: { value: parseFloat(projectedOvertime.toFixed(2)), type: MetricClassifications.PROJECTION }
      },
      delta: {
        netMonthlyCostChange: parseFloat(netMonthlyCostChange.toFixed(2))
      }
    };

    // 4. Create the strict Scenario Audit Record
    const scenarioId = `scn_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
    
    const auditRecord = await prisma.basePrisma.scenarioAudit.create({
      data: {
        tenantId,
        scenarioId,
        createdBy,
        action,
        parameters,
        inputMetricVersion,
        assumptions,
        result: resultMatrix
      }
    });

    console.log(`[SCENARIO ENGINE] Projection ${scenarioId} calculated successfully for action: ${action}`);

    return auditRecord;
  } catch (error) {
    console.error('[SCENARIO ENGINE ERROR]:', error);
    throw error;
  }
};

module.exports = {
  calculateScenarioProjection
};
