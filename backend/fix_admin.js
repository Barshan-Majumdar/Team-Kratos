const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tenantId = '04448be4-74f4-4eeb-abb7-8c27abf80b30';
  
  const ownerRole = await prisma.roleDefinition.findFirst({
    where: { tenantId, level: 0 }
  });
  
  if (ownerRole) {
    const updated = await prisma.user.update({
      where: { email: 'barshanmajumdar249@gmail.com' },
      data: { 
        tenantId,
        roleDefinitionId: ownerRole.id
      }
    });
    console.log('Fixed:', updated.email, 'Tenant:', updated.tenantId, 'Role:', ownerRole.name);
  } else {
    console.log('Owner role not found!');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
