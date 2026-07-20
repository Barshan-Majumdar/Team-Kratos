const prisma = require('../config/db');

async function seedRoles() {
  try {
    const tenants = await prisma.basePrisma.tenant.findMany();
    for (const tenant of tenants) {
      const existingRoles = await prisma.basePrisma.roleDefinition.findMany({
        where: { tenantId: tenant.id }
      });
      
      if (existingRoles.length === 0) {
        console.log(`Seeding roles for tenant: ${tenant.id}`);
        // Seed default roles
        const ownerRole = await prisma.basePrisma.roleDefinition.create({
          data: { tenantId: tenant.id, name: 'Owner', level: 0, isOwnerRole: true, isSystemDefault: true, canAccessConsole: true }
        });
        const hrAdminRole = await prisma.basePrisma.roleDefinition.create({
          data: { tenantId: tenant.id, name: 'HR Admin', level: 1, isOwnerRole: false, isSystemDefault: true, canAccessConsole: true }
        });
        const managerRole = await prisma.basePrisma.roleDefinition.create({
          data: { tenantId: tenant.id, name: 'Manager', level: 2, isOwnerRole: false, isSystemDefault: true, canAccessConsole: false }
        });
        const employeeRole = await prisma.basePrisma.roleDefinition.create({
          data: { tenantId: tenant.id, name: 'Employee', level: 3, isOwnerRole: false, isSystemDefault: true, canAccessConsole: false }
        });
        
        // Give everyone currently in this tenant the Employee role for safety,
        // or Owner if they were created first. (But we don't have created first easily, so let's default to Employee).
        await prisma.basePrisma.user.updateMany({
          where: { tenantId: tenant.id, roleDefinitionId: null },
          data: { roleDefinitionId: employeeRole.id }
        });
      }
    }
    console.log('Role seeding completed.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seedRoles();
