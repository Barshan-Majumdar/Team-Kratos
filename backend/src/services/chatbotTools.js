const ALL_TOOLS = [
  {
    name: 'searchHRPolicies',
    description: 'Search company HR policies, handbooks, and announcements using semantic search.',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: { type: 'STRING', description: 'The search query (e.g., "leave encashment policy")' }
      },
      required: ['query'],
    }
  },
  {
    name: 'getEmployeeProfile',
    description: 'Get detailed profile of a specific employee.',
    parameters: {
      type: 'OBJECT',
      properties: {
        employeeNameOrId: { type: 'STRING', description: 'Name or exact ID of the employee' }
      },
      required: ['employeeNameOrId'],
    }
  },
  {
    name: 'searchEmployees',
    description: 'Search for employees by department, designation, or status.',
    parameters: {
      type: 'OBJECT',
      properties: {
        department: { type: 'STRING', description: 'Optional department filter' },
        designation: { type: 'STRING', description: 'Optional designation filter' },
        status: { type: 'STRING', description: 'Optional status filter (e.g. "ACTIVE")' }
      }
    }
  },
  {
    name: 'getAttendanceSummary',
    description: 'Get attendance summary over a period of time, optionally filtered by employee or department.',
    parameters: {
      type: 'OBJECT',
      properties: {
        startDate: { type: 'STRING', description: 'Start date in YYYY-MM-DD' },
        endDate: { type: 'STRING', description: 'End date in YYYY-MM-DD' },
        department: { type: 'STRING', description: 'Optional department filter' },
        employeeNameOrId: { type: 'STRING', description: 'Optional employee filter' }
      },
      required: ['startDate', 'endDate']
    }
  },
  {
    name: 'getAbsenteesToday',
    description: 'Get list of employees who are absent today.',
    parameters: {
      type: 'OBJECT',
      properties: {
        department: { type: 'STRING', description: 'Optional department filter' }
      }
    }
  },
  {
    name: 'getLeaveRequests',
    description: 'Get leave requests for a given period.',
    parameters: {
      type: 'OBJECT',
      properties: {
        status: { type: 'STRING', description: 'Leave status: PENDING, APPROVED, REJECTED' },
        startDate: { type: 'STRING', description: 'Start date (YYYY-MM-DD)' },
        endDate: { type: 'STRING', description: 'End date (YYYY-MM-DD)' }
      }
    }
  },
  {
    name: 'getEmployeesOnLeaveToday',
    description: 'Get list of employees currently on leave today.',
    parameters: {
      type: 'OBJECT',
      properties: {}
    }
  },
  {
    name: 'getDepartmentMetrics',
    description: 'Get aggregated metrics (attendance, leave) for a department.',
    parameters: {
      type: 'OBJECT',
      properties: {
        department: { type: 'STRING', description: 'Department name' },
        month: { type: 'STRING', description: 'Month in YYYY-MM format' }
      },
      required: ['department', 'month']
    }
  },
  {
    name: 'getLeavePolicies',
    description: 'Get all configured leave policies for the company from the database — quotas, carry-forward rules, paid/unpaid status, etc.',
    parameters: {
      type: 'OBJECT',
      properties: {}
    }
  },
  {
    name: 'getPayrollSummary',
    description: 'Get payroll summary for a given month. SENSITIVE: requires Level 0 or 1 permissions.',
    parameters: {
      type: 'OBJECT',
      properties: {
        month: { type: 'STRING', description: 'Month in YYYY-MM format' },
        department: { type: 'STRING', description: 'Optional department filter' }
      },
      required: ['month']
    }
  },
  {
    name: 'getAttritionRiskList',
    description: 'Get employees flagged for high attrition risk. SENSITIVE: requires Level 0 or 1 permissions.',
    parameters: {
      type: 'OBJECT',
      properties: {}
    }
  },
  {
    name: 'getPendingApprovals',
    description: 'Get summary of all pending approvals (leaves, expenses, salary advances).',
    parameters: {
      type: 'OBJECT',
      properties: {}
    }
  }
];

// ── Domain → tool family mapping ─────────────────────────────────────
// Only expose the minimum required tools per domain.
// Never expose unrelated HR tools to Gemini.
const DOMAIN_TOOLS = {
  ATTENDANCE: ['getAbsenteesToday', 'getAttendanceSummary', 'searchEmployees'],
  LEAVE:      ['getLeaveRequests', 'getEmployeesOnLeaveToday', 'getLeavePolicies'],
  PAYROLL:    ['getPayrollSummary'],
  EMPLOYEE:   ['getEmployeeProfile', 'searchEmployees'],
  POLICY:     ['getLeavePolicies', 'searchHRPolicies'],
  ANALYTICS:  ['getAttendanceSummary', 'getDepartmentMetrics', 'getAttritionRiskList'],
  APPROVALS:  ['getPendingApprovals'],
};

/**
 * Returns only the tools relevant to a specific domain.
 * Gemini must never see unrelated tools.
 * Priority 1: server-side execution. This is fallback (Priority 2).
 */
function getToolsByDomain(domain) {
  const allowed = DOMAIN_TOOLS[domain] || [];
  return ALL_TOOLS.filter(t => allowed.includes(t.name));
}

/**
 * Legacy helper kept for any callers that may still reference it.
 * Maps old intent names to domain-scoped tools.
 */
function getCandidateToolsByIntent(intent) {
  if (intent === 'POLICY') return getToolsByDomain('POLICY');
  if (intent === 'LIVE_DATA') return ALL_TOOLS.filter(t => t.name !== 'searchHRPolicies');
  return ALL_TOOLS; // HYBRID / fallback
}

module.exports = { ALL_TOOLS, getToolsByDomain, getCandidateToolsByIntent };
