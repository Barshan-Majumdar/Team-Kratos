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

    const records = await prisma.basePrisma.attendance.findMany({
      where,
      select: { date: true, status: true, userId: true, user: { select: { displayName: true } } },
      take: 100 // Prevent massive payloads
    });

    const summary = {
      totalRecords: records.length,
      statusCounts: {}
    };

    records.forEach(r => {
      summary.statusCounts[r.status] = (summary.statusCounts[r.status] || 0) + 1;
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

    return absentRecords.map(r => ({ name: r.user.displayName, department: r.user.department }));
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
  }
};

const SENSITIVE_TOOLS = new Set(['getPayrollSummary', 'getAttritionRiskList']);

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
