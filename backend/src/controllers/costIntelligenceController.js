const workforceCostService = require('../services/workforceCostService');
const { produceDepartmentPayrollMetrics } = require('../services/metricProducers/payrollMetricProducer');
const { produceAbsenceCostEstimate } = require('../services/metricProducers/absenceCostProducer');

exports.getCostIntelligence = async (req, res) => {
  try {
    const { department, period, baselinePeriod } = req.query;
    
    // Quick trigger of producers for the demo/current period and baseline (in production this runs via cron)
    await produceDepartmentPayrollMetrics(req.user.tenantId, department || 'Engineering', period || '2026-08');
    await produceAbsenceCostEstimate(req.user.tenantId, department || 'Engineering', period || '2026-08');
    
    await produceDepartmentPayrollMetrics(req.user.tenantId, department || 'Engineering', baselinePeriod || '2026-07');
    await produceAbsenceCostEstimate(req.user.tenantId, department || 'Engineering', baselinePeriod || '2026-07');

    const summary = await workforceCostService.getDepartmentCostSummary(
      req.user.tenantId, 
      department || 'Engineering', 
      period || '2026-08', 
      baselinePeriod || '2026-07', 
      req.user
    );
    
    res.json({ success: true, data: summary });
  } catch (error) {
    console.error('Cost Intelligence Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
