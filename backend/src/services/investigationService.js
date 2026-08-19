const prisma = require('../config/db');
const crypto = require('crypto');
const geminiClient = require('./geminiClient');
const { searchHRDocuments } = require('./vectorSearch');

const PROMPT_VERSION = "v1.0";

// Canonical JSON stringify to ensure consistent hashing
function canonicalizeJSON(obj) {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    const arr = obj.map(item => JSON.parse(canonicalizeJSON(item)));
    return JSON.stringify(arr);
  }
  const sortedKeys = Object.keys(obj).sort();
  const sortedObj = {};
  for (const key of sortedKeys) {
    sortedObj[key] = JSON.parse(canonicalizeJSON(obj[key]));
  }
  return JSON.stringify(sortedObj);
}

function computeFingerprint(data) {
  const canonical = canonicalizeJSON(data);
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

async function runInvestigation(alertId, tenantId, forceRegenerate = false) {
  // 1. Fetch Alert
  const alert = await prisma.basePrisma.proxyAlert.findUnique({
    where: { id: alertId, tenantId },
    include: { tenant: { select: { name: true } } }
  });

  if (!alert) {
    throw new Error('Alert not found or unauthorized.');
  }

  // 2. Fetch User and Target User Metadata
  const user = await prisma.basePrisma.user.findUnique({
    where: { id: alert.userId },
    select: { id: true, displayName: true, employeeId: true, department: true, jobPosition: true, attritionRiskScore: true }
  });

  let targetUser = null;
  if (alert.targetUserId) {
    targetUser = await prisma.basePrisma.user.findUnique({
      where: { id: alert.targetUserId },
      select: { id: true, displayName: true, employeeId: true, department: true, jobPosition: true }
    });
  }

  // 3. Fetch evidence from the detection window (3 days around the alert date)
  const windowStart = new Date(alert.attendanceDate);
  windowStart.setDate(windowStart.getDate() - 3);
  const windowEnd = new Date(alert.attendanceDate);
  windowEnd.setDate(windowEnd.getDate() + 3);

  const attendanceRecords = await prisma.basePrisma.attendance.findMany({
    where: {
      tenantId,
      userId: { in: alert.targetUserId ? [alert.userId, alert.targetUserId] : [alert.userId] },
      date: { gte: windowStart, lte: windowEnd }
    },
    select: { id: true, userId: true, date: true, checkIn: true, checkOut: true, status: true, isFlagged: true, latitude: true, longitude: true }
  });

  const leaveRecords = await prisma.basePrisma.leave.findMany({
    where: {
      tenantId,
      userId: { in: alert.targetUserId ? [alert.userId, alert.targetUserId] : [alert.userId] },
      startDate: { lte: windowEnd },
      endDate: { gte: windowStart },
      status: 'Approved'
    },
    select: { id: true, userId: true, startDate: true, endDate: true, reason: true, status: true }
  });

  // 4. Compute Data Fingerprint
  const snapshotData = {
    alert: { id: alert.id, updatedAt: alert.createdAt, type: alert.alertType, severity: alert.severity },
    user,
    targetUser,
    attendanceRecords,
    leaveRecords
  };
  const dataFingerprint = computeFingerprint(snapshotData);

  // 5. Check idempotency, cache, and STALE data
  let report = await prisma.basePrisma.investigationReport.findFirst({
    where: { alertId },
    orderBy: { generatedAt: 'desc' }
  });

  if (report && !forceRegenerate) {
    if (report.dataFingerprint !== dataFingerprint || report.promptVersion !== PROMPT_VERSION) {
      if (report.generationStatus !== 'STALE') {
        report = await prisma.basePrisma.investigationReport.update({
          where: { id: report.id },
          data: { generationStatus: 'STALE' }
        });
      }
      return report;
    }

    if (report.generationStatus === 'COMPLETED' || report.generationStatus === 'GENERATING' || report.generationStatus === 'STALE') {
      return report;
    }
  }

  // 6. Lock / Create PENDING generation
  try {
    report = await prisma.basePrisma.investigationReport.upsert({
      where: {
        alertId_dataFingerprint_promptVersion: {
          alertId,
          dataFingerprint,
          promptVersion: PROMPT_VERSION
        }
      },
      update: { generationStatus: 'GENERATING' },
      create: {
        tenantId,
        alertId,
        generationStatus: 'GENERATING',
        model: process.env.GEMINI_MODEL || 'gemini-3.6-flash',
        promptVersion: PROMPT_VERSION,
        dataFingerprint,
        dataSnapshot: JSON.parse(JSON.stringify(snapshotData))
      }
    });
  } catch (error) {
    report = await prisma.basePrisma.investigationReport.findFirst({
      where: { alertId, dataFingerprint, promptVersion: PROMPT_VERSION }
    });
    return report;
  }

  // 7. Perform Vector Search for Policy
  const policyQuery = `${alert.alertType} policy rules guidelines threshold`;
  const chunks = await searchHRDocuments(policyQuery, tenantId, 3, 1);
  const policyDocs = chunks.map(c => 
    `[Document ID: ${c.id} | Title: ${c.title}]\n${c.content}`
  ).join('\n\n');

  // 8. Construct Mega Prompt
  const prompt = `
You are an expert HR Investigator AI for Crew.
Your task is to review the authoritative facts of a detected anomaly and generate a structured JSON investigation report.

RULES:
1. Structured DB records are the absolute TRUTH for factual HR data.
2. The Fraud Engine's Alert is the TRUTH for what anomaly triggered this.
3. RAG Policy Documents are the absolute TRUTH for company rules.
4. You MUST NOT invent evidence. If a reason for the anomaly is unknown, explicitly state it in limitations.
5. You MUST return ONLY valid JSON matching the exact schema below.

JSON OUTPUT SCHEMA:
{
  "whatHappened": "Clear, objective summary of the detected anomaly.",
  "evidence": [
    {
      "statement": "Fact derived from data.",
      "sourceType": "ATTENDANCE | LEAVE | FRAUD_ENGINE",
      "sourceId": "ID of the specific record",
      "timestamp": "ISO Date"
    }
  ],
  "policyFindings": [
    {
      "policy": "Name of the policy document",
      "section": "Relevant section or rule",
      "finding": "How the evidence violates or relates to this policy.",
      "sourceDocumentId": "ID of the retrieved RAG chunk",
      "confidence": "high | medium | low"
    }
  ],
  "assessment": "Your objective interpretation of the situation.",
  "assessmentConfidence": "high | medium | low",
  "limitations": [
    "List of missing context or unknowns that prevent absolute certainty."
  ],
  "recommendedNextStep": "A concise recommendation for the HR manager.",
  "humanReviewRequired": true
}

AUTHORITATIVE CONTEXT:
[ALERT DETECTED]
Type: ${alert.alertType}
Severity: ${alert.severity}
Reason: ${alert.reason}
Date: ${alert.attendanceDate.toISOString()}

[USER PROFILES]
Primary User: ${JSON.stringify(user, null, 2)}
${targetUser ? 'Target/Colliding User: ' + JSON.stringify(targetUser, null, 2) : ''}

[ATTENDANCE RECORDS (Window: +/- 3 days)]
${JSON.stringify(attendanceRecords, null, 2)}

[LEAVE RECORDS (Window: +/- 3 days)]
${JSON.stringify(leaveRecords, null, 2)}

[RELEVANT HR POLICIES]
${policyDocs || 'No explicit policies found.'}

Analyze the context and output the JSON report.
`;

  // 9. Call Gemini
  try {
    const ai = geminiClient.getAI();
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-3.6-flash',
      contents: prompt
    });

    let jsonStr = response.text;
    if (jsonStr.startsWith('\`\`\`json')) {
      jsonStr = jsonStr.replace(/^\`\`\`json/, '').replace(/\`\`\`$/, '').trim();
    }
    const resultJSON = JSON.parse(jsonStr);

    // 10. Save and return
    report = await prisma.basePrisma.investigationReport.update({
      where: { id: report.id },
      data: {
        generationStatus: 'COMPLETED',
        resultJSON
      }
    });

    return report;
  } catch (error) {
    console.error("Investigation generation failed:", error);
    await prisma.basePrisma.investigationReport.update({
      where: { id: report.id },
      data: { generationStatus: 'FAILED' }
    });
    throw new Error('AI Investigation generation failed.');
  }
}

async function runCostInvestigation(tenantId, departmentId, period, baselinePeriod, metricName, forceRegenerate = false) {
  const alertId = `cost_anomaly_${departmentId}_${metricName}_${period}`;
  
  // 1. Fetch current and baseline metrics
  const workforceCostService = require('./workforceCostService');
  const insight = await workforceCostService.getCostInsight(tenantId, metricName, 'DEPARTMENT', departmentId, period, baselinePeriod, null);
  
  // 2. Fetch related signals (Attendance, Attrition Risk)
  const attendanceMetrics = await prisma.basePrisma.workforceMetric.findMany({
    where: { tenantId, entityId: departmentId, metric: 'ATTENDANCE_PERCENT', period }
  });
  
  const riskUsers = await prisma.basePrisma.user.count({
    where: { tenantId, department: departmentId, attritionRiskLabel: 'HIGH' }
  });

  const snapshotData = { insight, attendanceMetrics, riskUsers };
  const dataFingerprint = computeFingerprint(snapshotData);

  // 3. Check for existing report
  let report = await prisma.basePrisma.investigationReport.findFirst({
    where: { alertId, dataFingerprint, promptVersion: PROMPT_VERSION }
  });

  if (report && !forceRegenerate) {
    if (report.generationStatus === 'COMPLETED') return report;
    if (report.generationStatus === 'GENERATING') throw new Error('Investigation is currently generating.');
  }

  // 4. Mark stale if exists but fingerprint changed
  if (report && forceRegenerate) {
    await prisma.basePrisma.investigationReport.update({
      where: { id: report.id },
      data: { generationStatus: 'STALE' }
    });
  }

  // 5. Create new report
  report = await prisma.basePrisma.investigationReport.create({
    data: {
      tenantId,
      alertId,
      generationStatus: 'GENERATING',
      model: process.env.GEMINI_MODEL || 'gemini-3.6-flash',
      promptVersion: PROMPT_VERSION,
      dataFingerprint,
      dataSnapshot: JSON.parse(JSON.stringify(snapshotData))
    }
  });

  // 6. Generate Prompt
  const prompt = `
You are an expert HR Investigator AI for Crew.
Your task is to review the authoritative facts of a Cost Anomaly and generate a structured JSON investigation report.

RULES:
1. Structured DB records are the absolute TRUTH.
2. DO NOT invent causation. Correlation does not establish causation.
3. You MUST return ONLY valid JSON matching the exact schema below.

JSON OUTPUT SCHEMA:
{
  "whatHappened": "Clear, objective summary of the cost anomaly (e.g., Overtime cost increased 34% vs previous period).",
  "evidence": [
    {
      "statement": "Fact derived from data.",
      "sourceType": "COST_ENGINE | ATTENDANCE_ENGINE | RISK_ENGINE",
      "sourceId": "Metric or Entity ID",
      "timestamp": "ISO Date"
    }
  ],
  "policyFindings": [], 
  "assessment": "List possible explanations based on correlated signals (e.g., Increased workload, Staffing shortage). Do NOT state these as confirmed facts.",
  "assessmentConfidence": "medium",
  "limitations": [
    "Crew cannot establish causality from these metrics alone. Correlation does not establish causation."
  ],
  "recommendedNextStep": "Specific action step for HR (e.g., Review workload allocation and staffing levels).",
  "humanReviewRequired": true
}

AUTHORITATIVE CONTEXT:
[COST ANOMALY]
Department: ${departmentId}
Period: ${period}
Metric: ${metricName}
Delta: ${insight.deltaPercent}%
Classification: ${insight.classification}

[CORRELATED SIGNALS]
Attendance Metrics: ${JSON.stringify(attendanceMetrics, null, 2)}
High Risk Employees: ${riskUsers}

Analyze the context and output the JSON report.
`;

  try {
    const ai = geminiClient.getAI();
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-3.6-flash',
      contents: prompt
    });

    let jsonStr = response.text;
    if (jsonStr.startsWith('\`\`\`json')) {
      jsonStr = jsonStr.replace(/^\`\`\`json/, '').replace(/\`\`\`$/, '').trim();
    }
    const resultJSON = JSON.parse(jsonStr);

    report = await prisma.basePrisma.investigationReport.update({
      where: { id: report.id },
      data: {
        generationStatus: 'COMPLETED',
        resultJSON
      }
    });

    return report;
  } catch (error) {
    console.error("Cost Investigation generation failed:", error);
    await prisma.basePrisma.investigationReport.update({
      where: { id: report.id },
      data: { generationStatus: 'FAILED' }
    });
    throw new Error('AI Investigation generation failed.');
  }
}

module.exports = { runInvestigation, runCostInvestigation };
