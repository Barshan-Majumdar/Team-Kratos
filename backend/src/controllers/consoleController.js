const prisma = require('../config/db');

// ── Company Profile ───────────────────────────────────────

const getCompanyProfile = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    if (!tenantId) return res.status(400).json({ error: 'No tenant found for user' });

    const tenant = await prisma.basePrisma.tenant.findUnique({
      where: { id: tenantId }
    });

    res.json(tenant);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateCompanyProfile = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    if (!tenantId) return res.status(400).json({ error: 'No tenant found for user' });

    const { name, domain, pan, gstin, cin, industry, size, founded, address, city, state, pincode, country, departments } = req.body;

    const updatedTenant = await prisma.basePrisma.tenant.update({
      where: { id: tenantId },
      data: {
        name, domain, pan, gstin, cin, industry, size, founded, address, city, state, pincode, country,
        departments: departments || undefined
      }
    });

    res.json({ message: 'Company profile updated successfully', tenant: updatedTenant });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ── Role Hierarchy Manager ─────────────────────────────────

const getRoles = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const roles = await prisma.basePrisma.roleDefinition.findMany({
      where: { tenantId },
      orderBy: { level: 'asc' }
    });
    res.json(roles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getEmployees = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const employees = await prisma.basePrisma.user.findMany({
      where: { tenantId },
      select: {
        id: true,
        displayName: true,
        email: true,
        department: true,
        roleDefinition: { select: { name: true } },
        office: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(employees);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createRole = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { name, level } = req.body;
    const actorLevel = req.user.roleDefinition.level;

    if (!name || level === undefined) {
      return res.status(400).json({ error: 'Role name and level are required' });
    }

    // Enforce Level rule: target.level > actor.level
    // Level 0 can create any level > 0.
    if (actorLevel !== 0 && level <= actorLevel) {
      return res.status(403).json({ error: 'You can only create roles with a level strictly greater than your own.' });
    }
    if (level === 0) {
      return res.status(403).json({ error: 'Cannot create a Level 0 role.' });
    }

    const role = await prisma.basePrisma.roleDefinition.create({
      data: {
        tenantId,
        name,
        level,
        isOwnerRole: false,
        isSystemDefault: false,
        canAccessConsole: level <= 1,
        createdById: req.user.id
      }
    });

    const io = req.app.get('io');
    if (io) io.to(`tenant:${tenantId}:admin`).emit('role:created', { role });
    res.status(201).json({ message: 'Role created successfully', role });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateRole = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;
    const { name, level } = req.body;
    const actorLevel = req.user.roleDefinition.level;

    const existingRole = await prisma.basePrisma.roleDefinition.findUnique({ where: { id } });
    if (!existingRole || existingRole.tenantId !== tenantId) {
      return res.status(404).json({ error: 'Role not found' });
    }

    if (existingRole.isOwnerRole) {
      return res.status(403).json({ error: 'Cannot modify the Owner role.' });
    }

    if (existingRole.isSystemDefault && (name !== undefined || level !== undefined)) {
      return res.status(403).json({ error: 'Cannot rename or change the level of system default roles.' });
    }

    // Only allow modification if actor's level is less than the existing role's level
    if (actorLevel !== 0 && existingRole.level <= actorLevel) {
      return res.status(403).json({ error: 'You do not have permission to modify this role.' });
    }

    // Only allow setting the new level to something > actorLevel
    if (level !== undefined) {
      if (actorLevel !== 0 && level <= actorLevel) {
        return res.status(403).json({ error: 'You can only set a role level strictly greater than your own.' });
      }
      if (level === 0) {
        return res.status(403).json({ error: 'Cannot set a role to Level 0.' });
      }
    }

    const updatedRole = await prisma.basePrisma.roleDefinition.update({
      where: { id },
      data: {
        name: name !== undefined ? name : undefined,
        level: level !== undefined ? level : undefined,
        canAccessConsole: level !== undefined ? level <= 1 : undefined
      }
    });

    const io = req.app.get('io');
    if (io) {
      if (name !== undefined && name !== existingRole.name) {
        io.to(`tenant:${tenantId}:admin`).emit('role:renamed', { role: updatedRole });
      }
      if (level !== undefined && level !== existingRole.level) {
        io.to(`tenant:${tenantId}:admin`).emit('role:level_changed', { role: updatedRole });
      }
    }
    res.json({ message: 'Role updated successfully', role: updatedRole });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteRole = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;
    const actorLevel = req.user.roleDefinition.level;

    const existingRole = await prisma.basePrisma.roleDefinition.findUnique({ 
      where: { id },
      include: { _count: { select: { users: true } } }
    });

    if (!existingRole || existingRole.tenantId !== tenantId) {
      return res.status(404).json({ error: 'Role not found' });
    }

    if (existingRole.isOwnerRole || existingRole.isSystemDefault) {
      return res.status(403).json({ error: 'Cannot delete Owner or System Default roles.' });
    }

    if (actorLevel !== 0 && existingRole.level <= actorLevel) {
      return res.status(403).json({ error: 'You do not have permission to delete this role.' });
    }

    if (existingRole._count.users > 0) {
      return res.status(400).json({ error: 'Cannot delete a role that is assigned to users.' });
    }

    await prisma.basePrisma.roleDefinition.delete({ where: { id } });

    const io = req.app.get('io');
    if (io) io.to(`tenant:${tenantId}:admin`).emit('role:deleted', { roleId: id });
    res.json({ message: 'Role deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ── Office Management ──────────────────────────────────────

const getOffices = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const offices = await prisma.basePrisma.office.findMany({
      where: { tenantId }
    });
    res.json(offices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createOffice = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { name, lat, lng, radiusMeters, address, state } = req.body;

    if (!name || lat === undefined || lng === undefined) {
      return res.status(400).json({ error: 'Name, latitude, and longitude are required' });
    }

    const office = await prisma.basePrisma.office.create({
      data: {
        tenantId,
        name,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        radiusMeters: radiusMeters ? parseFloat(radiusMeters) : 100,
        address,
        state
      }
    });

    const io = req.app.get('io');
    if (io) io.to(`tenant:${tenantId}:admin`).emit('office:created', { office });
    res.status(201).json({ message: 'Office created successfully', office });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateOffice = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;
    const { name, lat, lng, radiusMeters, address, state } = req.body;

    const existingOffice = await prisma.basePrisma.office.findUnique({ where: { id } });
    if (!existingOffice || existingOffice.tenantId !== tenantId) {
      return res.status(404).json({ error: 'Office not found' });
    }

    const office = await prisma.basePrisma.office.update({
      where: { id },
      data: {
        name: name !== undefined ? name : undefined,
        lat: lat !== undefined ? parseFloat(lat) : undefined,
        lng: lng !== undefined ? parseFloat(lng) : undefined,
        radiusMeters: radiusMeters !== undefined ? parseFloat(radiusMeters) : undefined,
        address: address !== undefined ? address : undefined,
        state: state !== undefined ? state : undefined
      }
    });

    // TODO: Dispatch socket event (Phase 6)
    res.json({ message: 'Office updated successfully', office });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteOffice = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;

    const existingOffice = await prisma.basePrisma.office.findUnique({ 
      where: { id },
      include: { _count: { select: { users: true } } }
    });
    
    if (!existingOffice || existingOffice.tenantId !== tenantId) {
      return res.status(404).json({ error: 'Office not found' });
    }

    if (existingOffice._count.users > 0) {
      return res.status(400).json({ error: 'Cannot delete an office that has assigned employees.' });
    }

    await prisma.basePrisma.office.delete({ where: { id } });

    // TODO: Dispatch socket event (Phase 6)
    res.json({ message: 'Office deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ── Entity Management ──────────────────────────────────────

const getEntities = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const entities = await prisma.basePrisma.legalEntity.findMany({
      where: { tenantId }
    });
    res.json(entities);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createEntity = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { name, registeredAddress, pan, gstin, cin, pfCode, esiCode, ptRegistration } = req.body;

    if (!name) return res.status(400).json({ error: 'Legal entity name is required' });

    const entity = await prisma.basePrisma.legalEntity.create({
      data: {
        tenantId,
        name,
        registeredAddress,
        pan, gstin, cin, pfCode, esiCode, ptRegistration
      }
    });

    const io = req.app.get('io');
    if (io) io.to(`tenant:${tenantId}:admin`).emit('entity:created', { entity });
    res.status(201).json({ message: 'Legal Entity created successfully', entity });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateEntity = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;
    const { name, registeredAddress, pan, gstin, cin, pfCode, esiCode, ptRegistration } = req.body;

    const existingEntity = await prisma.basePrisma.legalEntity.findUnique({ where: { id } });
    if (!existingEntity || existingEntity.tenantId !== tenantId) {
      return res.status(404).json({ error: 'Entity not found' });
    }

    const entity = await prisma.basePrisma.legalEntity.update({
      where: { id },
      data: {
        name, registeredAddress, pan, gstin, cin, pfCode, esiCode, ptRegistration
      }
    });

    // TODO: Dispatch socket event (Phase 6)
    res.json({ message: 'Legal Entity updated successfully', entity });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteEntity = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;

    const existingEntity = await prisma.basePrisma.legalEntity.findUnique({ 
      where: { id },
      include: { _count: { select: { users: true } } }
    });

    if (!existingEntity || existingEntity.tenantId !== tenantId) {
      return res.status(404).json({ error: 'Entity not found' });
    }

    if (existingEntity._count.users > 0) {
      return res.status(400).json({ error: 'Cannot delete an entity that has assigned employees.' });
    }

    await prisma.basePrisma.legalEntity.delete({ where: { id } });

    // TODO: Dispatch socket event (Phase 6)
    res.json({ message: 'Legal Entity deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ── Payroll Configuration ──────────────────────────────────

const getPayrollConfig = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const config = await prisma.basePrisma.payrollConfig.findFirst({
      where: { tenantId }
    });
    res.json(config || {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// ── Access Permissions ─────────────────────────────────────

const getPermissions = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const roles = await prisma.basePrisma.roleDefinition.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        level: true,
        isOwnerRole: true,
        isSystemDefault: true,
        permissions: true
      },
      orderBy: { level: 'asc' }
    });
    res.json(roles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updatePermissions = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { roleId, permissions } = req.body;
    const actorLevel = req.user.roleDefinition.level;

    if (!roleId || !permissions) {
      return res.status(400).json({ error: 'Role ID and permissions are required' });
    }

    const role = await prisma.basePrisma.roleDefinition.findUnique({
      where: { id: roleId }
    });

    if (!role || role.tenantId !== tenantId) {
      return res.status(404).json({ error: 'Role not found' });
    }

    if (role.isOwnerRole) {
      return res.status(403).json({ error: 'Cannot modify permissions for the Owner role' });
    }

    if (actorLevel !== 0 && role.level <= actorLevel) {
      return res.status(403).json({ error: 'You do not have permission to modify permissions for this role' });
    }

    const updatedRole = await prisma.basePrisma.roleDefinition.update({
      where: { id: roleId },
      data: { permissions }
    });

    const io = req.app.get('io');
    if (io) io.to(`tenant:${tenantId}:admin`).emit('role:permissions_updated', { role: updatedRole });
    res.json({ message: 'Permissions updated successfully', role: updatedRole });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updatePayrollConfig = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    
    // Attempt to find existing config
    let existingConfig = await prisma.basePrisma.payrollConfig.findFirst({
      where: { tenantId }
    });

    const {
      companyName,
      pfEmployeePercent,
      pfEmployerPercent,
      professionalTax,
      standardAllowance,
      basicPercentOfWage,
      hraPercentOfBasic,
      bonusPercentOfBasic,
      ltaPercentOfBasic
    } = req.body;

    let updatedConfig;

    if (!existingConfig) {
      // Must provide companyName if creating for the first time
      const tenant = await prisma.basePrisma.tenant.findUnique({ where: { id: tenantId } });
      updatedConfig = await prisma.basePrisma.payrollConfig.create({
        data: {
          tenantId,
          companyName: companyName || tenant.name || 'Default Company',
          pfEmployeePercent: pfEmployeePercent !== undefined ? parseFloat(pfEmployeePercent) : undefined,
          pfEmployerPercent: pfEmployerPercent !== undefined ? parseFloat(pfEmployerPercent) : undefined,
          professionalTax: professionalTax !== undefined ? parseFloat(professionalTax) : undefined,
          standardAllowance: standardAllowance !== undefined ? parseFloat(standardAllowance) : undefined,
          basicPercentOfWage: basicPercentOfWage !== undefined ? parseFloat(basicPercentOfWage) : undefined,
          hraPercentOfBasic: hraPercentOfBasic !== undefined ? parseFloat(hraPercentOfBasic) : undefined,
          bonusPercentOfBasic: bonusPercentOfBasic !== undefined ? parseFloat(bonusPercentOfBasic) : undefined,
          ltaPercentOfBasic: ltaPercentOfBasic !== undefined ? parseFloat(ltaPercentOfBasic) : undefined
        }
      });
    } else {
      updatedConfig = await prisma.basePrisma.payrollConfig.update({
        where: { id: existingConfig.id },
        data: {
          companyName: companyName !== undefined ? companyName : undefined,
          pfEmployeePercent: pfEmployeePercent !== undefined ? parseFloat(pfEmployeePercent) : undefined,
          pfEmployerPercent: pfEmployerPercent !== undefined ? parseFloat(pfEmployerPercent) : undefined,
          professionalTax: professionalTax !== undefined ? parseFloat(professionalTax) : undefined,
          standardAllowance: standardAllowance !== undefined ? parseFloat(standardAllowance) : undefined,
          basicPercentOfWage: basicPercentOfWage !== undefined ? parseFloat(basicPercentOfWage) : undefined,
          hraPercentOfBasic: hraPercentOfBasic !== undefined ? parseFloat(hraPercentOfBasic) : undefined,
          bonusPercentOfBasic: bonusPercentOfBasic !== undefined ? parseFloat(bonusPercentOfBasic) : undefined,
          ltaPercentOfBasic: ltaPercentOfBasic !== undefined ? parseFloat(ltaPercentOfBasic) : undefined
        }
      });
    }

    res.json({ message: 'Payroll configuration updated successfully', config: updatedConfig });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// ── Billing & Subscription ─────────────────────────────────

const getBilling = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const subscription = await prisma.basePrisma.subscription.findFirst({
      where: { tenantId }
    });
    
    // Usage for current month
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const usage = await prisma.basePrisma.usageRecord.findUnique({
      where: { tenantId_month: { tenantId, month: currentMonth } }
    });

    res.json({ subscription, usage });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const upgradeBilling = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { razorpayPlanId } = req.body;

    if (!razorpayPlanId) {
      return res.status(400).json({ error: 'Razorpay Plan ID is required' });
    }

    let subscription = await prisma.basePrisma.subscription.findFirst({
      where: { tenantId }
    });

    if (subscription) {
      subscription = await prisma.basePrisma.subscription.update({
        where: { id: subscription.id },
        data: { razorpayPlanId, status: 'active' }
      });
    } else {
      subscription = await prisma.basePrisma.subscription.create({
        data: {
          tenantId,
          razorpayPlanId,
          status: 'active'
        }
      });
    }

    const io = req.app.get('io');
    if (io) io.to(`tenant:${tenantId}:admin`).emit('tenant:plan_changed', { subscription });
    res.json({ message: 'Subscription upgraded successfully', subscription });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ── Compliance Center ──────────────────────────────────────

const getComplianceRules = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const rules = await prisma.basePrisma.complianceRule.findMany({
      where: { tenantId },
      orderBy: { state: 'asc' }
    });
    res.json(rules);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createComplianceRule = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { state, ruleType, effectiveFrom, rateTable } = req.body;

    if (!state || !ruleType || !effectiveFrom || !rateTable) {
      return res.status(400).json({ error: 'State, ruleType, effectiveFrom, and rateTable are required' });
    }

    const rule = await prisma.basePrisma.complianceRule.create({
      data: {
        tenantId,
        state,
        ruleType,
        effectiveFrom: new Date(effectiveFrom),
        rateTable
      }
    });

    res.status(201).json({ message: 'Compliance rule created successfully', rule });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateComplianceRule = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;
    const { state, ruleType, effectiveFrom, rateTable } = req.body;

    const existingRule = await prisma.basePrisma.complianceRule.findUnique({
      where: { id }
    });

    if (!existingRule || existingRule.tenantId !== tenantId) {
      return res.status(404).json({ error: 'Compliance rule not found' });
    }

    const rule = await prisma.basePrisma.complianceRule.update({
      where: { id },
      data: {
        state: state !== undefined ? state : undefined,
        ruleType: ruleType !== undefined ? ruleType : undefined,
        effectiveFrom: effectiveFrom !== undefined ? new Date(effectiveFrom) : undefined,
        rateTable: rateTable !== undefined ? rateTable : undefined
      }
    });

    res.json({ message: 'Compliance rule updated successfully', rule });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getCompanyProfile,
  updateCompanyProfile,
  getRoles,
  createRole,
  updateRole,
  deleteRole,
  getOffices,
  createOffice,
  updateOffice,
  deleteOffice,
  getEntities,
  createEntity,
  updateEntity,
  deleteEntity,
  getPayrollConfig,
  updatePayrollConfig,
  getPermissions,
  updatePermissions,
  getBilling,
  upgradeBilling,
  getComplianceRules,
  createComplianceRule,
  updateComplianceRule,
  getEmployees
};
