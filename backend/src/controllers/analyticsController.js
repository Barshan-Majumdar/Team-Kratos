const prisma = require('../config/db');
const { getSubordinateIds } = require('../utils/managerHierarchy');
const { getCache, setCache } = require('../config/cacheManager');
const { explainRiskScore } = require('../services/riskExplanationService');

/**
 * Resolve tenantId helper
 */
const resolveTenantId = (req) => {
  return req.user?.tenantId || req.headers['x-tenant-id'] || req.body?.tenantId || req.query?.tenantId || null;
};

/**
 * Resolve scopeKey and role authorization helper
 */
const resolveScopeKey = async (req, tenantId) => {
  const userLevel = req.user?.roleDefinition?.level ?? 3;
  const role = req.user?.role || '';
  const isAdmin = userLevel <= 1 || role === 'Admin' || role === 'SuperAdmin';
  const isManager = userLevel <= 2 || role === 'Manager' || isAdmin;

  if (!isManager) {
    return { isAllowed: false };
  }

  if (isAdmin) {
    return { isAllowed: true, isAdmin: true, scopeKey: 'all', subordinateIds: null };
  }

  // Manager Level 2: team scoped
  let subordinateIds = [];
  if (tenantId && req.user?.id) {
    subordinateIds = await getSubordinateIds(req.user.id, tenantId);
    subordinateIds.push(req.user.id); // Include self
  }

  return {
    isAllowed: true,
    isAdmin: false,
    scopeKey: `mgr_${req.user.id}`,
    subordinateIds
  };
};

/**
 * GET /api/analytics/summary — Executive KPI Summary Stats
 */
const getSummaryStats = async (req, res) => {
  try {
    const tenantId = resolveTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant context is required.' });
    }

    const scope = await resolveScopeKey(req, tenantId);
    if (!scope.isAllowed) {
      return res.status(403).json({ error: 'Forbidden: Analytics & Reports are reserved for Managers and Admins.' });
    }

    const cacheKey = `analytics:${tenantId}:summary:${scope.scopeKey}`;
    if (req.query.refresh !== 'true') {
      const cached = await getCache(cacheKey);
      if (cached) return res.json(cached);
    }

    // 1. Headcount
    const userWhere = { tenantId, status: 'Active' };
    if (!scope.isAdmin && scope.subordinateIds) {
      userWhere.id = { in: scope.subordinateIds };
    }
    const activeHeadcount = await prisma.user.count({ where: userWhere });

    // 2. Department Count
    const deptGroups = await prisma.user.groupBy({
      by: ['department'],
      where: userWhere
    });

    // 3. Monthly Attendance Rate (Current Month)
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const attWhere = {
      tenantId,
      date: { gte: monthStart, lte: monthEnd }
    };
    if (!scope.isAdmin && scope.subordinateIds) {
      attWhere.userId = { in: scope.subordinateIds };
    }

    const attRecords = await prisma.attendance.findMany({
      where: attWhere,
      select: { status: true }
    });

    let presentDays = 0;
    attRecords.forEach(a => {
      if (a.status === 'Present') presentDays += 1;
      else if (a.status === 'HalfDay') presentDays += 0.5;
    });

    const totalAttRecords = attRecords.length;
    const attendanceRate = totalAttRecords > 0
      ? Number(((presentDays / totalAttRecords) * 100).toFixed(1))
      : 100.0;

    // 4. Active Benefit Enrollments
    const benefitWhere = { tenantId, status: 'ACTIVE' };
    if (!scope.isAdmin && scope.subordinateIds) {
      benefitWhere.userId = { in: scope.subordinateIds };
    }
    const activeBenefitEnrollments = await prisma.employeeBenefit.count({ where: benefitWhere });

    // 5. Total Payroll Spend (Admin Only)
    let latestPayrollSpend = 0;
    if (scope.isAdmin) {
      const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const payrollAgg = await prisma.payroll.aggregate({
        where: { tenantId, month: currentMonthStr },
        _sum: { netSalary: true, grossSalary: true }
      });
      latestPayrollSpend = Number(payrollAgg._sum.grossSalary || 0);
    }

    const responseData = {
      activeHeadcount,
      departmentCount: deptGroups.length,
      attendanceRate,
      activeBenefitEnrollments,
      latestPayrollSpend,
      month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    };

    await setCache(cacheKey, responseData, 300);
    res.json(responseData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/analytics/demographics — Headcount by Department & Location
 */
const getDemographicsAnalytics = async (req, res) => {
  try {
    const tenantId = resolveTenantId(req);
    if (!tenantId) return res.status(400).json({ error: 'Tenant context is required.' });

    const scope = await resolveScopeKey(req, tenantId);
    if (!scope.isAllowed) return res.status(403).json({ error: 'Forbidden.' });

    const cacheKey = `analytics:${tenantId}:demographics:${scope.scopeKey}`;
    if (req.query.refresh !== 'true') {
      const cached = await getCache(cacheKey);
      if (cached) return res.json(cached);
    }

    const userWhere = { tenantId, status: 'Active' };
    if (!scope.isAdmin && scope.subordinateIds) {
      userWhere.id = { in: scope.subordinateIds };
    }

    // Group by Department
    const byDepartment = await prisma.user.groupBy({
      by: ['department'],
      where: userWhere,
      _count: { id: true }
    });

    const departmentData = byDepartment.map(d => ({
      department: d.department || 'General',
      count: d._count.id
    }));

    // Group by Office Location
    const byOffice = await prisma.user.groupBy({
      by: ['officeId'],
      where: userWhere,
      _count: { id: true }
    });

    const offices = await prisma.office.findMany({
      where: { tenantId },
      select: { id: true, name: true }
    });

    const officeMap = new Map(offices.map(o => [o.id, o.name]));
    const officeData = byOffice.map(o => ({
      officeName: o.officeId ? (officeMap.get(o.officeId) || 'Unassigned') : 'Unassigned',
      count: o._count.id
    }));

    const responseData = {
      byDepartment: departmentData,
      byOffice: officeData
    };

    await setCache(cacheKey, responseData, 300);
    res.json(responseData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/analytics/attendance — Monthly Attendance Status Distribution
 */
const getAttendanceAnalytics = async (req, res) => {
  try {
    const tenantId = resolveTenantId(req);
    if (!tenantId) return res.status(400).json({ error: 'Tenant context is required.' });

    const scope = await resolveScopeKey(req, tenantId);
    if (!scope.isAllowed) return res.status(403).json({ error: 'Forbidden.' });

    const cacheKey = `analytics:${tenantId}:attendance:${scope.scopeKey}`;
    if (req.query.refresh !== 'true') {
      const cached = await getCache(cacheKey);
      if (cached) return res.json(cached);
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const attWhere = {
      tenantId,
      date: { gte: monthStart, lte: monthEnd }
    };
    if (!scope.isAdmin && scope.subordinateIds) {
      attWhere.userId = { in: scope.subordinateIds };
    }

    const byStatus = await prisma.attendance.groupBy({
      by: ['status'],
      where: attWhere,
      _count: { id: true }
    });

    const statusData = byStatus.map(s => ({
      status: s.status,
      count: s._count.id
    }));

    const responseData = {
      byStatus: statusData,
      period: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    };

    await setCache(cacheKey, responseData, 300);
    res.json(responseData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/analytics/payroll — 12-Month Payroll Trendline (Admin Level <= 1 Only)
 */
const getPayrollAnalytics = async (req, res) => {
  try {
    const tenantId = resolveTenantId(req);
    if (!tenantId) return res.status(400).json({ error: 'Tenant context is required.' });

    const scope = await resolveScopeKey(req, tenantId);
    if (!scope.isAdmin) {
      return res.status(403).json({ error: 'Forbidden: Payroll analytics are restricted to Admins.' });
    }

    const cacheKey = `analytics:${tenantId}:payroll:all`;
    if (req.query.refresh !== 'true') {
      const cached = await getCache(cacheKey);
      if (cached) return res.json(cached);
    }

    const payrollGroups = await prisma.payroll.groupBy({
      by: ['month'],
      where: { tenantId },
      _sum: {
        grossSalary: true,
        netSalary: true,
        pfEmployee: true,
        professionalTax: true,
        advanceDeduction: true,
        benefitsDeduction: true
      },
      _avg: {
        grossSalary: true
      },
      orderBy: { month: 'asc' }
    });

    const trendData = payrollGroups.map(p => ({
      month: p.month,
      grossSalary: Number((p._sum.grossSalary || 0).toFixed(2)),
      netSalary: Number((p._sum.netSalary || 0).toFixed(2)),
      pfEmployee: Number((p._sum.pfEmployee || 0).toFixed(2)),
      professionalTax: Number((p._sum.professionalTax || 0).toFixed(2)),
      benefitsDeduction: Number((p._sum.benefitsDeduction || 0).toFixed(2)),
      avgSalary: Number((p._avg.grossSalary || 0).toFixed(2))
    }));

    const responseData = {
      payrollTrend: trendData
    };

    await setCache(cacheKey, responseData, 300);
    res.json(responseData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/analytics/benefits — Benefit Plan Enrollment Category Distribution
 */
const getBenefitsAnalytics = async (req, res) => {
  try {
    const tenantId = resolveTenantId(req);
    if (!tenantId) return res.status(400).json({ error: 'Tenant context is required.' });

    const scope = await resolveScopeKey(req, tenantId);
    if (!scope.isAllowed) return res.status(403).json({ error: 'Forbidden.' });

    const cacheKey = `analytics:${tenantId}:benefits:${scope.scopeKey}`;
    if (req.query.refresh !== 'true') {
      const cached = await getCache(cacheKey);
      if (cached) return res.json(cached);
    }

    const benefitWhere = { tenantId, status: 'ACTIVE' };
    if (!scope.isAdmin && scope.subordinateIds) {
      benefitWhere.userId = { in: scope.subordinateIds };
    }

    const enrollments = await prisma.employeeBenefit.findMany({
      where: benefitWhere,
      include: { plan: { select: { category: true, name: true } } }
    });

    const categoryMap = new Map();
    enrollments.forEach(eb => {
      const cat = eb.plan?.category || 'OTHER';
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
    });

    const categoryData = Array.from(categoryMap.entries()).map(([category, count]) => ({
      category: category.replace('_', ' '),
      count
    }));

    const responseData = {
      byCategory: categoryData,
      totalActiveEnrollments: enrollments.length
    };

    await setCache(cacheKey, responseData, 300);
    res.json(responseData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/analytics/export — Stream Downloadable CSV Reports
 * Params: ?type=demographics|attendance|payroll|benefits
 */
const exportReportCSV = async (req, res) => {
  try {
    const tenantId = resolveTenantId(req);
    if (!tenantId) return res.status(400).json({ error: 'Tenant context is required.' });

    const scope = await resolveScopeKey(req, tenantId);
    if (!scope.isAllowed) return res.status(403).json({ error: 'Forbidden.' });

    const type = req.query.type || 'demographics';

    // RBAC check inside exporter
    if (type === 'payroll' && !scope.isAdmin) {
      return res.status(403).json({ error: 'Forbidden: Payroll CSV exports are restricted to Admins.' });
    }

    const nowStr = new Date().toISOString().split('T')[0];
    let csvRows = [];
    let filename = `${type}_report_${nowStr}.csv`;

    if (type === 'demographics') {
      const userWhere = { tenantId, status: 'Active' };
      if (!scope.isAdmin && scope.subordinateIds) userWhere.id = { in: scope.subordinateIds };

      const byDept = await prisma.user.groupBy({
        by: ['department'],
        where: userWhere,
        _count: { id: true }
      });

      csvRows.push(['Department', 'Active Headcount']);
      byDept.forEach(d => {
        csvRows.push([d.department || 'General', d._count.id]);
      });
    } else if (type === 'attendance') {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const attWhere = { tenantId, date: { gte: monthStart, lte: monthEnd } };
      if (!scope.isAdmin && scope.subordinateIds) attWhere.userId = { in: scope.subordinateIds };

      const byStatus = await prisma.attendance.groupBy({
        by: ['status'],
        where: attWhere,
        _count: { id: true }
      });

      csvRows.push(['Attendance Status', 'Count', 'Period']);
      const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      byStatus.forEach(s => {
        csvRows.push([s.status, s._count.id, monthStr]);
      });
    } else if (type === 'payroll') {
      const payrollGroups = await prisma.payroll.groupBy({
        by: ['month'],
        where: { tenantId },
        _sum: { grossSalary: true, netSalary: true, pfEmployee: true, professionalTax: true, benefitsDeduction: true },
        orderBy: { month: 'asc' }
      });

      csvRows.push(['Month', 'Gross Salary (INR)', 'Net Salary (INR)', 'PF Deductions (INR)', 'Professional Tax (INR)', 'Benefits Deductions (INR)']);
      payrollGroups.forEach(p => {
        csvRows.push([
          p.month,
          (p._sum.grossSalary || 0).toFixed(2),
          (p._sum.netSalary || 0).toFixed(2),
          (p._sum.pfEmployee || 0).toFixed(2),
          (p._sum.professionalTax || 0).toFixed(2),
          (p._sum.benefitsDeduction || 0).toFixed(2)
        ]);
      });
    } else if (type === 'benefits') {
      const benefitWhere = { tenantId, status: 'ACTIVE' };
      if (!scope.isAdmin && scope.subordinateIds) benefitWhere.userId = { in: scope.subordinateIds };

      const enrollments = await prisma.employeeBenefit.findMany({
        where: benefitWhere,
        include: { plan: { select: { name: true, category: true } } }
      });

      const planMap = new Map();
      enrollments.forEach(eb => {
        const key = `${eb.plan?.name || 'Unknown'} (${eb.plan?.category || 'OTHER'})`;
        planMap.set(key, (planMap.get(key) || 0) + 1);
      });

      csvRows.push(['Benefit Plan & Category', 'Active Enrolled Employees']);
      planMap.forEach((count, planName) => {
        csvRows.push([planName, count]);
      });
    }

    if (tenantId) {
      await prisma.auditLog.create({
        data: {
          tenantId,
          actorId: req.user.id,
          action: 'ANALYTICS_REPORT_EXPORTED',
          details: { type, format: 'csv', filename }
        }
      });
    }

    const csvContent = csvRows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.status(200).send(csvContent);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/analytics/attrition-risk — Attrition & Burnout Risk Radar
 */
const getAttritionRisk = async (req, res) => {
  try {
    const tenantId = resolveTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant context is required.' });
    }

    const users = await prisma.user.findMany({
      where: {
        tenantId,
        status: 'Active'
      },
      select: {
        id: true,
        displayName: true,
        department: true,
        attritionRiskScore: true,
        attritionRiskLabel: true,
        riskUpdatedAt: true
      },
      orderBy: { attritionRiskScore: 'desc' },
      take: 20
    });

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/analytics/risk/:userId/explain — Explain Attrition Risk Score
 */
const explainRisk = async (req, res) => {
  try {
    const tenantId = resolveTenantId(req);
    if (!tenantId) return res.status(400).json({ error: 'Tenant context is required.' });

    const scope = await resolveScopeKey(req, tenantId);
    if (!scope.isAllowed) return res.status(403).json({ error: 'Forbidden.' });

    const targetUserId = req.params.userId;
    if (!scope.isAdmin && scope.subordinateIds && !scope.subordinateIds.includes(targetUserId) && targetUserId !== req.user.id) {
       return res.status(403).json({ error: 'Forbidden to view this employee.' });
    }

    const result = await explainRiskScore(targetUserId, tenantId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getSummaryStats,
  getDemographicsAnalytics,
  getAttendanceAnalytics,
  getPayrollAnalytics,
  getBenefitsAnalytics,
  exportReportCSV,
  getAttritionRisk,
  explainRisk
};
