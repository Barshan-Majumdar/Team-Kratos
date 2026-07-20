const prisma = require('../config/db');
const bcrypt = require('bcrypt');

async function seedAdmin() {
  try {
    const adminExists = await prisma.basePrisma.user.findFirst({ 
      where: { email: 'admin@acme.com' } 
    });
    if (adminExists) {
      console.log('Admin already exists:', adminExists.email);
      process.exit(0);
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash('AdminPassword123!', salt);

    let superAdminRole = await prisma.basePrisma.roleDefinition.findFirst({
      where: { name: 'SuperAdmin', isSystemDefault: true, tenantId: null }
    });

    if (!superAdminRole) {
      superAdminRole = await prisma.basePrisma.roleDefinition.create({
        data: {
          name: 'SuperAdmin',
          level: -1, // Below owner
          isOwnerRole: false,
          isSystemDefault: true,
          canAccessConsole: true
        }
      });
    }

    await prisma.basePrisma.user.create({
      data: {
        employeeId: 'OISYAD20260001',
        email: 'admin@acme.com',
        password: hashedPassword,
        roleDefinitionId: superAdminRole.id,
        mustChangePassword: true,
        displayName: 'System Admin',
        department: 'IT',
      }
    });

    console.log('Admin seeded successfully! Email: admin@acme.com / Pass: AdminPassword123!');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seedAdmin();
