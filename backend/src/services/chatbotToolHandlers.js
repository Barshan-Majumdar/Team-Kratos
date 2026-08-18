const prisma = require('../config/db');
const { searchHRDocuments, buildRetrievedContext } = require('./vectorSearch');

class ToolError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ToolError';
  }
}

async function resolveEmployee(identifier, tenantId) {
  let user = await prisma.basePrisma.user.findFirst({
    where: { id: identifier, tenantId },
  });
  if (!user) {
    user = await prisma.basePrisma.user.findFirst({
      where: { tenantId, displayName: { contains: identifier, mode: 'insensitive' } },
    });
  }
  if (!user) throw new ToolError(`No employee matching "${identifier}" found in this organisation.`);
  return user;
}

const TOOL_HANDLERS = {
  async searchHRPolicies({ query }, ctx) {
    const chunks = await searchHRDocuments(query, ctx.tenantId, 5, ctx.roleLevel);
    if (chunks.length === 0) return "No relevant policies found.";
    return buildRetrievedContext(chunks);
  },

  async getEmployeeProfile({ employeeNameOrId }, ctx) {
    const user = await resolveEmployee(employeeNameOrId, ctx.tenantId);
    // Don't leak full user object, just safe fields. NEVER leak internal UUID (id) or personal emails.
    return {
      employeeId: user.employeeId,
      name: user.displayName,
      department: user.department,
      jobPosition: user.jobPosition,
      status: user.status,
      joiningDate: user.joiningDate,
    };
  },

  async searchEmployees({ department, designation, status }, ctx) {
    const where = { tenantId: ctx.tenantId };
    if (department) where.department = department;
    if (designation) where.jobPosition = designation;
    if (status) {
      const s = status.toLowerCase().replace(/[^a-z]/g, '');
      if (s === 'active') where.status = 'Active';
      else if (s === 'inactive') where.status = 'Inactive';
      else if (s.includes('leave')) where.status = 'OnLeave';
    }
    
    const users = await prisma.basePrisma.user.findMany({
      where,
      select: { employeeId: true, displayName: true, department: true, jobPosition: true, status: true },
      take: 50 // cap
    });
    return { count: users.length, users: users.map(u => ({ employeeId: u.employeeId, name: u.displayName, department: u.department, jobPosition: u.jobPosition, status: u.status })) };
  },

  async getAttendanceSummary({ startDate, endDate, department, employeeNameOrId }, ctx) {
    const where = { tenantId: ctx.tenantId, date: { gte: new Date(startDate), lte: new Date(endDate) } };
    
    if (employeeNameOrId) {
      const user = await resolveEmployee(employeeNameOrId, ctx.tenantId);
      where.userId = user.id;
    }

    if (department && !employeeNameOrId) {
      where.user = { department };
    }

    // Fetch all matching records without `take: 100` so counts are accurate.
    const records = await prisma.basePrisma.attendance.findMany({
      where,
      select: { date: true, status: true, userId: true, user: { select: { displayName: true } } }
    });

    const uniqueUserIds = new Set(records.map(r => r.userId));

    const summary = {
      totalAttendanceEvents: records.length,
      uniqueEmployeesInvolved: uniqueUserIds.size,
      byDate: {}
    };

    records.forEach(r => {
      // Safely convert date to YYYY-MM-DD string
      const dateStr = (r.date instanceof Date) ? r.date.toISOString().split('T')[0] : String(r.date).split('T')[0];
      
      if (!summary.byDate[dateStr]) {
        summary.byDate[dateStr] = {
          employeeStatus: []
        };
      }
      
      summary.byDate[dateStr][r.status] = (summary.byDate[dateStr][r.status] || 0) + 1;
      
      if (r.user) {
        summary.byDate[dateStr].employeeStatus.push({ name: r.user.displayName, status: r.status });
      }
    });

    return summary;
  },

  async getAbsenteesToday({}, ctx) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const absentRecords = await prisma.basePrisma.attendance.findMany({
      where: {
        tenantId: ctx.tenantId,
        date: { gte: today },
        status: 'Absent'
      },
      include: { user: { select: { displayName: true, department: true } } }
    });

    return {
      status: 'Absent',
      date: today.toISOString().split('T')[0],
      absentEmployees: absentRecords.map(r => ({ name: r.user.displayName, department: r.user.department }))
    };
  },

  async getLeaveRequests({ status, startDate, endDate }, ctx) {
    const where = { tenantId: ctx.tenantId };
    if (status) {
      where.status = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
    }
    if (startDate && endDate) {
      where.startDate = { gte: new Date(startDate) };
      where.endDate = { lte: new Date(endDate) };
    }
    
    const leaves = await prisma.basePrisma.leave.findMany({
      where,
      select: { id: true, status: true, startDate: true, endDate: true, leavePolicy: { select: { name: true } }, user: { select: { displayName: true } } },
      take: 50
    });
    
    return { count: leaves.length, leaves };
  },

  async getEmployeesOnLeaveToday({}, ctx) {
    const today = new Date();
    const leaves = await prisma.basePrisma.leave.findMany({
      where: {
        tenantId: ctx.tenantId,
        status: 'Approved',
        startDate: { lte: today },
        endDate: { gte: today }
      },
      include: { user: { select: { displayName: true, department: true } }, leavePolicy: { select: { name: true } } }
    });
    
    return leaves.map(l => ({ name: l.user.displayName, department: l.user.department, type: l.leavePolicy?.name }));
  },

  async getDepartmentMetrics({ department, month }, ctx) {
    const startDate = new Date(month + "-01");
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0); // Last day of month

    const users = await prisma.basePrisma.user.findMany({
      where: { tenantId: ctx.tenantId, department },
      select: { id: true }
    });

    if (users.length === 0) return { error: "No users found in this department." };

    const userIds = users.map(u => u.id);

    const attendance = await prisma.basePrisma.attendance.findMany({
      where: {
        tenantId: ctx.tenantId,
        userId: { in: userIds },
        date: { gte: startDate, lte: endDate }
      },
      select: { status: true }
    });

    const statusCounts = {};
    attendance.forEach(a => {
      statusCounts[a.status] = (statusCounts[a.status] || 0) + 1;
    });

    return {
      department,
      month,
      employeeCount: userIds.length,
      attendanceMetrics: statusCounts,
      totalRecords: attendance.length
    };
  },

  async getLeavePolicies({}, ctx) {
    const policies = await prisma.basePrisma.leavePolicy.findMany({
      where: { tenantId: ctx.tenantId, isArchived: false },
      select: {
        name:                true,
        annualQuota:         true,
        carryForward:        true,
        maxCarryForward:     true,
        isPaid:              true,
        allowNegativeBalance: true,
        requiresAttachment:  true,
        effectiveFrom:       true,
        leaveYearStartMonth: true,
        leaveYearStartDay:   true,
      },
      orderBy: { name: 'asc' }
    });

    if (policies.length === 0) return 'No leave policies have been configured for this company yet.';

    return {
      count: policies.length,
      policies: policies.map(p => ({
        name:               p.name,
        annualQuota:        `${p.annualQuota} days`,
        isPaid:             p.isPaid ? 'Paid' : 'Unpaid',
        carryForward:       p.carryForward ? `Enabled (max ${p.maxCarryForward ?? 'unlimited'} days)` : 'Disabled',
        negativeBalance:    p.allowNegativeBalance ? 'Allowed' : 'Not Allowed',
        requiresAttachment: p.requiresAttachment ? 'Yes' : 'No',
        effectiveFrom:      p.effectiveFrom?.toISOString().split('T')[0],
      }))
    };
  },

  async getPayrollSummary({ month }, ctx) {
    if (ctx.roleLevel > 1) {
      throw new ToolError('You do not have permission to view payroll data.');
    }
    
    const payrolls = await prisma.basePrisma.payroll.findMany({
      where: { tenantId: ctx.tenantId, month },
      select: { locked: true, netSalary: true }
    });

    const summary = {
      totalEmployeesPaid: payrolls.filter(p => p.locked).length,
      totalPending: payrolls.filter(p => !p.locked).length,
      totalNetPayOut: payrolls.filter(p => p.locked).reduce((sum, p) => sum + Number(p.netSalary || 0), 0)
    };

    return summary;
  },

  async getAttritionRiskList({}, ctx) {
    if (ctx.roleLevel > 1) {
      throw new ToolError('You do not have permission to view attrition risk data.');
    }
    
    const riskyEmployees = await prisma.basePrisma.user.findMany({
      where: { 
        tenantId: ctx.tenantId, 
        status: 'Active',
        attritionRiskLabel: { in: ['High', 'Critical'] }
      },
      select: {
        employeeId: true,
        displayName: true,
        department: true,
        attritionRiskScore: true,
        attritionRiskLabel: true,
        riskUpdatedAt: true
      },
      orderBy: { attritionRiskScore: 'desc' }
    });

    if (riskyEmployees.length === 0) {
      return "No active employees are currently flagged for high or critical attrition risk.";
    }

    return {
      count: riskyEmployees.length,
      employees: riskyEmployees.map(emp => ({
        employeeId: emp.employeeId,
        name: emp.displayName,
        department: emp.department,
        riskScore: emp.attritionRiskScore,
        riskLabel: emp.attritionRiskLabel,
        lastUpdated: emp.riskUpdatedAt?.toISOString().split('T')[0]
      }))
    };
  },

  async getFraudAlertSummary({ startDate, endDate, severity, status, alertType, departmentId, userId }, ctx) {
    if (ctx.roleLevel > 1) {
      throw new ToolError('You do not have permission to view fraud alerts.');
    }
    
    const where = { tenantId: ctx.tenantId };
    
    if (startDate && endDate) {
      where.attendanceDate = { gte: new Date(startDate), lte: new Date(endDate) };
    } else if (startDate) {
      where.attendanceDate = { gte: new Date(startDate) };
    }
    
    if (severity) where.severity = severity.toUpperCase();
    if (alertType) where.alertType = alertType;
    if (userId) where.userId = userId;
    
    if (status) {
      where.resolved = status.toUpperCase() === 'RESOLVED';
    }
    
    if (departmentId) {
      // department on User is typically a string, assuming departmentId matches it or we filter by user relation
      where.user = { department: departmentId };
    }
    
    const alerts = await prisma.basePrisma.proxyAlert.findMany({
      where,
      select: {
        id: true,
        severity: true,
        alertType: true,
        resolved: true,
        attendanceDate: true,
        user: { select: { displayName: true, department: true } }
      }
    });

    const summary = {
      totalAlerts: alerts.length,
      severityCounts: {},
      typeCounts: {},
      resolvedCount: 0,
      openCount: 0,
      departmentCounts: {}
    };

    alerts.forEach(a => {
      summary.severityCounts[a.severity] = (summary.severityCounts[a.severity] || 0) + 1;
      summary.typeCounts[a.alertType] = (summary.typeCounts[a.alertType] || 0) + 1;
      
      if (a.resolved) summary.resolvedCount++;
      else summary.openCount++;
      
      if (a.user && a.user.department) {
        summary.departmentCounts[a.user.department] = (summary.departmentCounts[a.user.department] || 0) + 1;
      }
    });

    return summary;
  },

  async getPendingApprovals({}, ctx) {
    const pendingLeaves = await prisma.basePrisma.leave.count({
      where: { tenantId: ctx.tenantId, status: 'Pending' }
    });
    
    const pendingExpenses = await prisma.basePrisma.expenseClaim.count({
      where: { tenantId: ctx.tenantId, status: 'PENDING' }
    });

    const pendingAdvances = await prisma.basePrisma.salaryAdvance.count({
      where: { tenantId: ctx.tenantId, status: 'Pending' }
    });

    return { pendingLeaves, pendingExpenses, pendingAdvances };
  },

  async getTopCandidatesForJob({ jobTitle }, ctx) {
    if (ctx.roleLevel > 2) {
      throw new ToolError('You do not have permission to view recruitment data.');
    }

    const job = await prisma.basePrisma.jobRequisition.findFirst({
      where: { 
        tenantId: ctx.tenantId, 
        title: { contains: jobTitle, mode: 'insensitive' } 
      }
    });

    if (!job) {
      throw new ToolError(`Could not find a job requisition matching "${jobTitle}".`);
    }

    const applications = await prisma.basePrisma.application.findMany({
      where: {
        tenantId: ctx.tenantId,
        jobRequisitionId: job.id,
        atsStatus: 'COMPLETED'
      },
      include: {
        candidate: { select: { firstName: true, lastName: true, email: true } },
        ATSResult: { 
          orderBy: { generatedAt: 'desc' },
          take: 1
        }
      }
    });

    const candidatesWithScores = applications
      .filter(app => app.ATSResult.length > 0)
      .map(app => {
        const result = app.ATSResult[0];
        return {
          name: `${app.candidate.firstName} ${app.candidate.lastName}`,
          score: result.score,
          breakdown: result.breakdown,
          missingSkills: result.missingSkills,
          stage: app.stage
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    if (candidatesWithScores.length === 0) {
      return `No candidates have been processed by the ATS yet for the role: ${job.title}.`;
    }

    return {
      jobTitle: job.title,
      topCandidates: candidatesWithScores
    };
  },

  async getCandidateATSScore({ candidateName, jobTitle }, ctx) {
    if (ctx.roleLevel > 2) {
      throw new ToolError('You do not have permission to view recruitment data.');
    }

    const candidateWhere = {
      tenantId: ctx.tenantId,
      OR: [
        { firstName: { contains: candidateName.split(' ')[0], mode: 'insensitive' } },
        { lastName: { contains: candidateName.split(' ').pop(), mode: 'insensitive' } }
      ]
    };

    const candidates = await prisma.basePrisma.candidate.findMany({
      where: candidateWhere
    });

    if (candidates.length === 0) {
      throw new ToolError(`Could not find candidate matching "${candidateName}".`);
    }

    const candidateIds = candidates.map(c => c.id);

    const appWhere = {
      tenantId: ctx.tenantId,
      candidateId: { in: candidateIds }
    };

    if (jobTitle) {
      appWhere.jobRequisition = {
        title: { contains: jobTitle, mode: 'insensitive' }
      };
    }

    const application = await prisma.basePrisma.application.findFirst({
      where: appWhere,
      include: {
        jobRequisition: true,
        candidate: true,
        ATSResult: {
          orderBy: { generatedAt: 'desc' },
          take: 1
        }
      }
    });

    if (!application) {
      throw new ToolError(`Could not find an application for ${candidateName}${jobTitle ? ` for the role ${jobTitle}` : ''}.`);
    }

    if (application.atsStatus !== 'COMPLETED' || application.ATSResult.length === 0) {
      return `The ATS match score for ${application.candidate.firstName} ${application.candidate.lastName} is currently: ${application.atsStatus}. It has not completed processing.`;
    }

    const result = application.ATSResult[0];

    return {
      candidateName: `${application.candidate.firstName} ${application.candidate.lastName}`,
      jobTitle: application.jobRequisition.title,
      score: result.score,
      breakdown: result.breakdown,
      matchEvidence: result.matchEvidence,
      missingSkills: result.missingSkills,
      explanation: result.explanation || 'No explanation generated yet.'
    };
  }
};

const SENSITIVE_TOOLS = new Set(['getPayrollSummary', 'getAttritionRiskList', 'getFraudAlertSummary']);

async function executeTool(call, ctx) {
  try {
    const handler = TOOL_HANDLERS[call.name];
    if (!handler) throw new ToolError(`Unknown tool: ${call.name}`);
    
    if (SENSITIVE_TOOLS.has(call.name)) {
       // Log sensitive tool usage
       await prisma.auditLog.create({
         data: {
           tenantId: ctx.tenantId,
           actorId: ctx.userId,
           action: 'AI_SENSITIVE_TOOL_ACCESSED',
           targetId: ctx.sessionId || 'none',
           details: { tool: call.name, args: call.args, entity: 'ChatSession' }
         }
       });
    }

    const result = await handler(call.args || {}, ctx);
    return { name: call.name, response: { result } };
  } catch (err) {
    return { name: call.name, response: { error: `Tool failed: ${err.message}` } };
  }
}

module.exports = { executeTool, TOOL_HANDLERS, SENSITIVE_TOOLS };
