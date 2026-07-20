const prisma = require('../config/db');

// Legal Entity CRUD
exports.getLegalEntities = async (req, res) => {
  try {
    const entities = await prisma.legalEntity.findMany({ where: { tenantId: req.user.tenantId }});
    res.json(entities);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createLegalEntity = async (req, res) => {
  try {
    const { name, pfCode, ptRegNo } = req.body;
    const entity = await prisma.legalEntity.create({
      data: {
        name,
        pfCode,
        ptRegNo,
        tenantId: req.user.tenantId
      }
    });
    res.status(201).json(entity);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Compliance Rule CRUD
exports.getComplianceRules = async (req, res) => {
  try {
    const rules = await prisma.complianceRule.findMany({ where: { tenantId: req.user.tenantId }});
    res.json(rules);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createComplianceRule = async (req, res) => {
  try {
    const { state, ruleType, rateTable } = req.body;
    const rule = await prisma.complianceRule.create({
      data: {
        state,
        ruleType,
        rateTable,
        tenantId: req.user.tenantId
      }
    });
    res.status(201).json(rule);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// ── Tenant Custom Roles & Departments ────────────────────────
// NOTE: Tenant is a global model, so we use prisma.basePrisma directly
// and manually scope by tenantId from req.user.

/**
 * GET /api/tenant-settings/roles
 * Returns the full Tenant record fields: customRoles & departments.
 * Used by the "Add Employee" form to populate role dropdowns dynamically.
 */
exports.getTenantRoles = async (req, res) => {
  try {
    const tenant = await prisma.basePrisma.tenant.findUnique({
      where: { id: req.user.tenantId },
      select: { customRoles: true, departments: true }
    });

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    // customRoles is stored as Json in Prisma — parse if needed
    let roles = tenant.customRoles;
    if (typeof roles === 'string') {
      try { roles = JSON.parse(roles); } catch { roles = []; }
    }
    if (!Array.isArray(roles)) roles = [];

    res.json({ customRoles: roles, departments: tenant.departments || [] });
  } catch (error) {
    console.error('getTenantRoles error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * PUT /api/tenant-settings/roles
 * Allows CEO/Admin to update the custom role hierarchy post-registration.
 * Request body: { customRoles: [{name, level, locked, canManage, description}] }
 */
exports.updateTenantRoles = async (req, res) => {
  try {
    // Only CEO can modify the role structure
    if (req.user.role !== 'CEO' && req.user.role !== 'SuperAdmin') {
      return res.status(403).json({ error: 'Only the account owner (CEO) can modify role structure.' });
    }

    const { customRoles } = req.body;
    if (!Array.isArray(customRoles)) {
      return res.status(400).json({ error: 'customRoles must be an array' });
    }

    // Enforce minimum: system roles must be present
    const hasOwnerLevel = customRoles.some(r => r.level === 0);
    const hasEmployeeLevel = customRoles.some(r => r.level >= 3);
    if (!hasOwnerLevel || !hasEmployeeLevel) {
      return res.status(400).json({ error: 'Role hierarchy must include at least a Level 0 (Owner) and a Level 3+ (Employee) role.' });
    }

    const updated = await prisma.basePrisma.tenant.update({
      where: { id: req.user.tenantId },
      data: { customRoles },
      select: { customRoles: true, departments: true }
    });

    res.json({ message: 'Role hierarchy updated successfully', customRoles: updated.customRoles });
  } catch (error) {
    console.error('updateTenantRoles error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/tenant-settings/info
 * Returns full public info about the tenant for use across the dashboard
 */
exports.getTenantInfo = async (req, res) => {
  try {
    const tenant = await prisma.basePrisma.tenant.findUnique({
      where: { id: req.user.tenantId },
      select: {
        id: true, name: true, industry: true, size: true,
        address: true, city: true, state: true, country: true,
        departments: true, customRoles: true, planTier: true,
        pan: true, gstin: true, cin: true
      }
    });

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    let roles = tenant.customRoles;
    if (typeof roles === 'string') {
      try { roles = JSON.parse(roles); } catch { roles = []; }
    }

    res.json({ ...tenant, customRoles: Array.isArray(roles) ? roles : [] });
  } catch (error) {
    console.error('getTenantInfo error:', error);
    res.status(500).json({ error: error.message });
  }
};

