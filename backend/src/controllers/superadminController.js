const prisma = require('../config/db');
const bcrypt = require('bcrypt');

const generateEmployeeId = async (displayName, tenantId) => {
  const year = new Date().getFullYear();
  const parts = (displayName || 'New User').trim().split(/\s+/);
  const f2 = (parts[0] || 'XX').substring(0, 2).toUpperCase();
  const l2 = (parts.length > 1 ? parts[parts.length - 1] : 'XX').substring(0, 2).toUpperCase();
  const prefix = `OI${f2}${l2}${year}`;

  const lastUser = await prisma.basePrisma.user.findFirst({
    where: { employeeId: { startsWith: prefix }, tenantId },
    orderBy: { employeeId: 'desc' },
    select: { employeeId: true }
  });

  let seq = 1;
  if (lastUser && lastUser.employeeId) {
    const lastSeq = parseInt(lastUser.employeeId.slice(-4), 10);
    if (!isNaN(lastSeq)) seq = lastSeq + 1;
  }
  return `${prefix}${seq.toString().padStart(4, '0')}`;
};

const createTenant = async (req, res) => {
  try {
    const { name, domain, adminEmail, adminName, adminPassword } = req.body;
    
    if (!name || !adminEmail || !adminName || !adminPassword) {
      return res.status(400).json({ error: 'Missing required fields for tenant provisioning' });
    }
    
    const existingTenant = await prisma.basePrisma.tenant.findUnique({
      where: { domain }
    });

    if (existingTenant && domain) {
      return res.status(400).json({ error: 'Domain already in use' });
    }

    const tenant = await prisma.basePrisma.tenant.create({
      data: {
        name,
        domain: domain || null
      }
    });
    
    const employeeId = await generateEmployeeId(adminName, tenant.id);
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);
    
    const adminUser = await prisma.basePrisma.user.create({
      data: {
        tenantId: tenant.id,
        employeeId,
        email: adminEmail,
        password: hashedPassword,
        role: 'Admin',
        mustChangePassword: true,
        displayName: adminName,
        companyName: name,
        dateOfJoining: new Date()
      }
    });

    await prisma.basePrisma.adminEmail.create({
      data: {
        tenantId: tenant.id,
        email: adminEmail
      }
    });

    res.status(201).json({ message: 'Tenant provisioned successfully', tenant, adminUser: adminUser.email });
  } catch (error) {
    console.error('Provision Tenant error:', error);
    res.status(500).json({ error: error.message });
  }
};

const getAllTenants = async (req, res) => {
  try {
    const tenants = await prisma.basePrisma.tenant.findMany({
      include: {
        _count: {
          select: { users: true, attendances: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(tenants);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createTenant,
  getAllTenants
};
