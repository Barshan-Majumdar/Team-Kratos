const prisma = require('../config/db');

// Calculate a simple Operational Reliability score (30-day attendance %)
// In a production system, this could be precomputed and stored on the IntelligenceProfile.
const getOperationalReliability = async (tenantId, userId) => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
  const attendances = await prisma.attendance.findMany({
    where: { tenantId, userId, date: { gte: thirtyDaysAgo } },
    select: { status: true }
  });
  if (attendances.length === 0) return null;
  const present = attendances.filter(a => ['Present', 'HalfDay'].includes(a.status)).length;
  return Math.round((present / attendances.length) * 100);
};

const getRadarData = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;

    // Fetch active users with their intelligence profile and signals
    const users = await prisma.user.findMany({
      where: { tenantId, status: 'Active' },
      select: {
        id: true,
        displayName: true,
        department: true,
        attritionRiskScore: true,
        intelligenceProfile: { select: { isDirty: true, lastAnalyzedAt: true } },
        intelligenceSignals: {
          where: { lifecycleState: { notIn: ['DISMISSED', 'EXPIRED'] } },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    const radarData = [];

    for (const user of users) {
      // Calculate operational reliability (X-axis)
      const reliability = await getOperationalReliability(tenantId, user.id);
      
      // Calculate highest severity for color coding
      let highestSeverity = 'LOW';
      const severities = user.intelligenceSignals.map(s => s.severity);
      if (severities.includes('CRITICAL')) highestSeverity = 'CRITICAL';
      else if (severities.includes('HIGH')) highestSeverity = 'HIGH';
      else if (severities.includes('MEDIUM')) highestSeverity = 'MEDIUM';

      // Fallback for Risk Score (Y-axis)
      const riskScore = user.attritionRiskScore || 0;

      radarData.push({
        id: user.id,
        name: user.displayName,
        department: user.department,
        riskScore,
        reliability: reliability !== null ? reliability : 100, // Default to 100% if no data
        signalCount: user.intelligenceSignals.length,
        highestSeverity,
        signals: user.intelligenceSignals,
        lastAnalyzedAt: user.intelligenceProfile?.lastAnalyzedAt
      });
    }

    res.json(radarData);
  } catch (error) {
    console.error('[Intelligence Radar Error]:', error);
    res.status(500).json({ error: 'Failed to load intelligence radar data' });
  }
};

const investigateSignal = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { employeeId } = req.body;

    if (!employeeId) return res.status(400).json({ error: 'Employee ID is required' });

    // 1. Fetch Employee Profile
    const employee = await prisma.user.findUnique({
      where: { id: employeeId, tenantId },
      select: { id: true, displayName: true, department: true, attritionRiskScore: true }
    });

    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    // 2. Fetch Intelligence Signals
    const signals = await prisma.intelligenceSignal.findMany({
      where: { userId: employeeId, tenantId, lifecycleState: { notIn: ['DISMISSED', 'EXPIRED'] } }
    });

    // 3. Trigger Iris AI (Existing Investigation Logic)
    const { getGeminiModel } = require('../services/investigationService');
    const model = getGeminiModel('gemini-2.5-flash');

    const prompt = `
You are Iris, the AI Investigation Assistant for Crew HRMS.
An HR admin has requested an investigation into an employee's behavioral patterns.

EMPLOYEE PROFILE:
Name: ${employee.displayName}
Department: ${employee.department}
Authoritative Risk Score: ${employee.attritionRiskScore || 'N/A'} / 100

ACTIVE MATHEMATICAL SIGNALS DETECTED:
${signals.length === 0 ? 'No active signals.' : signals.map(s => 
  `- Type: ${s.type}
  - Severity: ${s.severity}
  - Confidence: ${(s.confidence * 100).toFixed(1)}%
  - Expected Baseline: ${s.baselineValue?.toFixed(2) || 'N/A'}
  - Current Window: ${s.currentValue?.toFixed(2) || 'N/A'}
  - Delta: ${s.deltaValue?.toFixed(2) || 'N/A'}
  - Lifecycle State: ${s.lifecycleState}`
).join('\n\n')}

INSTRUCTIONS:
1. Objectively state the mathematical changes detected by the Pattern Engine.
2. DO NOT make psychological diagnoses (e.g., do not say "The employee is experiencing burnout" or "The employee is likely quitting").
3. DO state the objective exposure (e.g., "The employee has sustained 14 days of high overtime exposure alongside a 15% drop in attendance.")
4. Recommend concrete, professional HR interventions based on the evidence (e.g., "Consider a 1:1 check-in to discuss the recent overtime exposure and ensure workload distribution is appropriate.").
5. Format the response clearly in markdown.
`;

    const result = await model.generateContent(prompt);
    const investigationResult = result.response.text();

    res.json({ investigation: investigationResult });
  } catch (error) {
    console.error('[Intelligence Investigation Error]:', error);
    res.status(500).json({ error: 'Failed to conduct investigation' });
  }
};

const getTeamIntelligence = async (req, res) => {
  try {
    const { departmentId, period } = req.query;
    if (!departmentId || !period) {
      return res.status(400).json({ error: 'departmentId and period are required' });
    }

    const { getDepartmentIntelligenceProfile } = require('../services/teamIntelligenceEngine');
    const profile = await getDepartmentIntelligenceProfile(req.user.tenantId, departmentId, period);
    
    res.json(profile);
  } catch (error) {
    console.error('[Team Intelligence API Error]:', error);
    res.status(500).json({ error: 'Failed to retrieve team intelligence profile' });
  }
};

const getCostIntelligence = async (req, res) => {
  try {
    const { entityId, scope, period } = req.query;
    if (!entityId || !scope || !period) {
      return res.status(400).json({ error: 'entityId, scope, and period are required' });
    }

    const { getCostIntelligenceProfile } = require('../services/costIntelligenceEngine');
    const profile = await getCostIntelligenceProfile(req.user.tenantId, entityId, scope, period);
    
    res.json(profile);
  } catch (error) {
    console.error('[Cost Intelligence API Error]:', error);
    res.status(500).json({ error: 'Failed to retrieve cost intelligence profile' });
  }
};

const calculateScenario = async (req, res) => {
  try {
    const { action, parameters, assumptions, inputMetricVersion } = req.body;
    
    if (!action || !parameters || !inputMetricVersion) {
      return res.status(400).json({ error: 'action, parameters, and inputMetricVersion are required' });
    }

    const { calculateScenarioProjection } = require('../services/scenarioProjectionEngine');
    const projection = await calculateScenarioProjection(
      req.user.tenantId, 
      req.user.id, 
      action, 
      parameters, 
      assumptions || {}, 
      inputMetricVersion
    );
    
    res.json(projection);
  } catch (error) {
    console.error('[Scenario Engine API Error]:', error);
    res.status(500).json({ error: error.message || 'Failed to calculate scenario projection' });
  }
};

module.exports = { getRadarData, investigateSignal, getTeamIntelligence, getCostIntelligence, calculateScenario };
