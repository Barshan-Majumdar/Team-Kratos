const prisma = require('../config/db');
const { getSubordinateIds } = require('../utils/managerHierarchy');
const { sendNotification } = require('../utils/notificationEngine');
const { seedTenantBenefitPlans } = require('../utils/benefitSeeder');

/**
 * Helper to resolve tenantId from user context, header, body, or query
 */
const resolveTenantId = (req) => {
  return req.user?.tenantId || req.headers['x-tenant-id'] || req.body?.tenantId || req.query?.tenantId || null;
};

/**
 * GET /api/benefits/plans — List benefit plans
 * Query ?scope=all (Admin/Manager) returns all plans (active & inactive); standard returns active only.
 */
const getPlans = async (req, res) => {
  try {
    const tenantId = resolveTenantId(req);
    const scope = req.query.scope;
    const userLevel = req.user?.roleDefinition?.level ?? 3;

    if (!tenantId && req.user?.role !== 'SuperAdmin' && req.user?.roleDefinition?.name !== 'SuperAdmin') {
      return res.status(400).json({ error: 'Tenant context is required.' });
    }

    let whereClause = tenantId ? { tenantId, isActive: true } : { isActive: true };

    if (scope === 'all' && (userLevel <= 2 || req.user?.role === 'Admin' || req.user?.role === 'SuperAdmin' || req.user?.role === 'Manager')) {
      whereClause = tenantId ? { tenantId } : {};
    }

    const plans = await prisma.benefitPlan.findMany({
      where: whereClause,
      orderBy: [
        { isActive: 'desc' },
        { name: 'asc' }
      ]
    });

    res.json(plans);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * POST /api/benefits/plans — Create Benefit Plan (Admin / HR Manager Level <= 2)
 */
const createPlan = async (req, res) => {
  try {
    const tenantId = resolveTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant context is required to create a benefit plan. SuperAdmins must provide a target tenantId.' });
    }

    const { name, category, description, tierRates, providerName, policyNumber } = req.body;

    if (!name || !tierRates) {
      return res.status(400).json({ error: 'Plan name and tierRates matrix are required.' });
    }

    const defaultTierRates = {
      INDIVIDUAL: { employeeDeduction: tierRates.INDIVIDUAL?.employeeDeduction || 0, employerContribution: tierRates.INDIVIDUAL?.employerContribution || 0 },
      SPOUSE: { employeeDeduction: tierRates.SPOUSE?.employeeDeduction || 0, employerContribution: tierRates.SPOUSE?.employerContribution || 0 },
      FAMILY: { employeeDeduction: tierRates.FAMILY?.employeeDeduction || 0, employerContribution: tierRates.FAMILY?.employerContribution || 0 },
      ...tierRates
    };

    const plan = await prisma.benefitPlan.create({
      data: {
        tenantId,
        name,
        category: category || 'HEALTH_INSURANCE',
        description: description || null,
        tierRates: defaultTierRates,
        providerName: providerName || null,
        policyNumber: policyNumber || null,
        isActive: true
      }
    });

    if (tenantId) {
      await prisma.auditLog.create({
        data: {
          tenantId,
          actorId: req.user.id,
          action: 'BENEFIT_PLAN_CREATED',
          details: { planId: plan.id, name: plan.name, category: plan.category }
        }
      });
    }

    res.status(201).json(plan);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * PUT /api/benefits/plans/:id — Update Benefit Plan (Admin / HR Manager Level <= 2)
 */
const updatePlan = async (req, res) => {
  try {
    const tenantId = resolveTenantId(req);
    const { id } = req.params;
    const { name, category, description, tierRates, providerName, policyNumber } = req.body;

    const whereClause = { id };
    if (tenantId) whereClause.tenantId = tenantId;

    const existing = await prisma.benefitPlan.findFirst({
      where: whereClause
    });

    if (!existing) {
      return res.status(404).json({ error: 'Benefit plan not found.' });
    }

    const updated = await prisma.benefitPlan.update({
      where: { id },
      data: {
        name: name !== undefined ? name : existing.name,
        category: category !== undefined ? category : existing.category,
        description: description !== undefined ? description : existing.description,
        tierRates: tierRates !== undefined ? tierRates : existing.tierRates,
        providerName: providerName !== undefined ? providerName : existing.providerName,
        policyNumber: policyNumber !== undefined ? policyNumber : existing.policyNumber
      }
    });

    const targetTenantId = tenantId || existing.tenantId;
    if (targetTenantId) {
      await prisma.auditLog.create({
        data: {
          tenantId: targetTenantId,
          actorId: req.user.id,
          action: 'BENEFIT_PLAN_UPDATED',
          details: { planId: updated.id, name: updated.name }
        }
      });
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * PUT /api/benefits/plans/:id/toggle — Soft-delete / Toggle Active Status (Admin / HR Manager Level <= 2)
 */
const togglePlanActive = async (req, res) => {
  try {
    const tenantId = resolveTenantId(req);
    const { id } = req.params;

    const whereClause = { id };
    if (tenantId) whereClause.tenantId = tenantId;

    const existing = await prisma.benefitPlan.findFirst({
      where: whereClause
    });

    if (!existing) {
      return res.status(404).json({ error: 'Benefit plan not found.' });
    }

    const updated = await prisma.benefitPlan.update({
      where: { id },
      data: { isActive: !existing.isActive }
    });

    const targetTenantId = tenantId || existing.tenantId;
    if (targetTenantId) {
      await prisma.auditLog.create({
        data: {
          tenantId: targetTenantId,
          actorId: req.user.id,
          action: 'BENEFIT_PLAN_TOGGLED',
          details: { planId: updated.id, name: updated.name, isActive: updated.isActive }
        }
      });
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * POST /api/benefits/enroll — Self-service enroll or re-enroll in benefit plan
 */
const enrollBenefit = async (req, res) => {
  try {
    const tenantId = resolveTenantId(req);
    const userId = req.user.id;
    const { planId, coverageTier } = req.body;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant context is required for enrollment.' });
    }

    if (!planId) {
      return res.status(400).json({ error: 'planId is required.' });
    }

    // Cross-tenant & Active Plan Guard
    const plan = await prisma.benefitPlan.findFirst({
      where: { id: planId, tenantId, isActive: true }
    });

    if (!plan) {
      return res.status(404).json({ error: 'Benefit plan not found or is currently inactive.' });
    }

    const validTier = ['INDIVIDUAL', 'SPOUSE', 'FAMILY'].includes(coverageTier) ? coverageTier : 'INDIVIDUAL';

    // Re-enrollment Upsert: resets status to ACTIVE, updates enrolledAt, clears effectiveEndDate & customDeduction
    const enrollment = await prisma.employeeBenefit.upsert({
      where: {
        userId_planId: { userId, planId }
      },
      create: {
        tenantId,
        userId,
        planId,
        coverageTier: validTier,
        status: 'ACTIVE',
        enrolledAt: new Date(),
        effectiveEndDate: null,
        customDeduction: null
      },
      update: {
        coverageTier: validTier,
        status: 'ACTIVE',
        enrolledAt: new Date(),
        effectiveEndDate: null,
        customDeduction: null
      },
      include: { plan: true }
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        actorId: userId,
        action: 'EMPLOYEE_BENEFIT_ENROLLED',
        details: { planId, coverageTier: validTier }
      }
    });

    await sendNotification({
      tenantId,
      recipientId: userId,
      type: 'BENEFIT_ENROLLED',
      title: '🎉 Benefit Plan Enrollment Confirmed',
      message: `You have successfully enrolled in "${plan.name}" (${validTier} coverage).`,
      link: '/dashboard/benefits'
    });

    res.status(201).json(enrollment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * PUT /api/benefits/enrollments/:id/adjust-deduction — Override deduction rate (Admin / HR Manager Level <= 2)
 */
const adjustDeduction = async (req, res) => {
  try {
    const tenantId = resolveTenantId(req);
    const { id } = req.params;
    const { customDeduction } = req.body;

    const whereClause = { id };
    if (tenantId) whereClause.tenantId = tenantId;

    const existing = await prisma.employeeBenefit.findFirst({
      where: whereClause
    });

    if (!existing) {
      return res.status(404).json({ error: 'Enrollment record not found.' });
    }

    const updated = await prisma.employeeBenefit.update({
      where: { id },
      data: {
        customDeduction: customDeduction !== null && customDeduction !== undefined ? Number(customDeduction) : null
      }
    });

    const targetTenantId = tenantId || existing.tenantId;
    if (targetTenantId) {
      await prisma.auditLog.create({
        data: {
          tenantId: targetTenantId,
          actorId: req.user.id,
          action: 'EMPLOYEE_BENEFIT_DEDUCTION_ADJUSTED',
          details: { enrollmentId: id, customDeduction }
        }
      });
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * PUT /api/benefits/enrollments/:id/cancel — Cancel Benefit Enrollment
 */
const cancelEnrollment = async (req, res) => {
  try {
    const tenantId = resolveTenantId(req);
    const userLevel = req.user?.roleDefinition?.level ?? 3;
    const { id } = req.params;

    const whereClause = { id };
    if (tenantId) whereClause.tenantId = tenantId;

    const existing = await prisma.employeeBenefit.findFirst({
      where: whereClause,
      include: { plan: true }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Enrollment record not found.' });
    }

    // Authorization Guard: Submitter, Admin, or Manager for subordinate
    const isOwner = existing.userId === req.user.id;
    const isAdmin = userLevel <= 2 || req.user?.role === 'Admin' || req.user?.role === 'SuperAdmin' || req.user?.role === 'Manager';
    let isManager = false;

    if (userLevel === 2 && tenantId) {
      const subordinateIds = await getSubordinateIds(req.user.id, tenantId);
      isManager = subordinateIds.includes(existing.userId);
    }

    if (!isOwner && !isAdmin && !isManager) {
      return res.status(403).json({ error: 'Forbidden: You do not have permission to cancel this benefit enrollment.' });
    }

    const updated = await prisma.employeeBenefit.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        effectiveEndDate: new Date()
      }
    });

    const targetTenantId = tenantId || existing.tenantId;
    if (targetTenantId) {
      await prisma.auditLog.create({
        data: {
          tenantId: targetTenantId,
          actorId: req.user.id,
          action: 'EMPLOYEE_BENEFIT_CANCELLED',
          details: { enrollmentId: id, planName: existing.plan.name }
        }
      });
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/benefits/my — List employee's active enrolled benefits
 */
const getMyBenefits = async (req, res) => {
  try {
    const tenantId = resolveTenantId(req);
    const userId = req.user.id;

    if (!tenantId) {
      return res.json([]);
    }

    const enrollments = await prisma.employeeBenefit.findMany({
      where: { tenantId, userId, status: 'ACTIVE' },
      include: { plan: true },
      orderBy: { enrolledAt: 'desc' }
    });

    res.json(enrollments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/benefits/all — List all enrollments (Managers/Admins)
 */
const getAllEnrollments = async (req, res) => {
  try {
    const tenantId = resolveTenantId(req);
    const userLevel = req.user?.roleDefinition?.level ?? 3;

    let whereClause = tenantId ? { tenantId } : {};

    if (userLevel === 2 && tenantId) {
      const subordinateIds = await getSubordinateIds(req.user.id, tenantId);
      whereClause.userId = { in: subordinateIds };
    }

    const enrollments = await prisma.employeeBenefit.findMany({
      where: whereClause,
      include: {
        user: { select: { id: true, displayName: true, department: true, jobPosition: true } },
        plan: true
      },
      orderBy: { enrolledAt: 'desc' }
    });

    res.json(enrollments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * POST /api/benefits/plans/seed-defaults — Admin 1-Click Seeder
 */
const seedDefaultPlans = async (req, res) => {
  try {
    const tenantId = resolveTenantId(req);

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant context is required to seed default benefit plans. SuperAdmins must specify a target tenant context.' });
    }

    const count = await seedTenantBenefitPlans(tenantId);

    await prisma.auditLog.create({
      data: {
        tenantId,
        actorId: req.user.id,
        action: 'BENEFIT_PLANS_SEEDED',
        details: { count }
      }
    });

    const plans = await prisma.benefitPlan.findMany({
      where: { tenantId, isActive: true },
      orderBy: { name: 'asc' }
    });

    res.status(201).json({ message: `Successfully seeded ${count} default benefit plans.`, plans });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getPlans,
  createPlan,
  updatePlan,
  togglePlanActive,
  enrollBenefit,
  adjustDeduction,
  cancelEnrollment,
  getMyBenefits,
  getAllEnrollments,
  seedDefaultPlans
};
