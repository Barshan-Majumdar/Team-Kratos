const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Starting officeId backfill script...');
  
  // Find all tenants (companies)
  const tenants = await prisma.tenant.findMany();
  
  for (const tenant of tenants) {
    console.log(`\nProcessing tenant: ${tenant.name} (${tenant.id})`);
    
    // Find the first office for this tenant
    const office = await prisma.office.findFirst({
      where: { tenantId: tenant.id }
    });
    
    if (!office) {
      console.log(`  No office found for tenant ${tenant.name}. Skipping...`);
      continue;
    }
    
    console.log(`  Found office: ${office.name} (${office.id})`);
    
    // Find all users in this tenant who don't have an officeId and are not SuperAdmin
    const usersToUpdate = await prisma.user.findMany({
      where: {
        tenantId: tenant.id,
        officeId: null,
        NOT: [
          { customRole: { contains: 'SuperAdmin', mode: 'insensitive' } },
          { roleDefinition: { name: { contains: 'SuperAdmin', mode: 'insensitive' } } }
        ]
      },
      include: {
        roleDefinition: true
      }
    });
    
    if (usersToUpdate.length === 0) {
      console.log(`  No users need updating for this tenant.`);
      continue;
    }
    
    console.log(`  Found ${usersToUpdate.length} users to update.`);
    
    // Update them all
    const updateResult = await prisma.user.updateMany({
      where: {
        id: { in: usersToUpdate.map(u => u.id) }
      },
      data: {
        officeId: office.id
      }
    });
    
    console.log(`  Successfully updated ${updateResult.count} users!`);
    
    // Print names of updated users
    usersToUpdate.forEach(u => {
      console.log(`    - Updated: ${u.displayName} (${u.email}) -> Role: ${u.customRole || u.roleDefinition?.name}`);
    });
  }
  
  console.log('\nBackfill completed successfully!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
