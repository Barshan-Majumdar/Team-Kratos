const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@crew.com';
  const password = 'Password123!';
  
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    console.log('SuperAdmin already exists with email:', email);
    return;
  }

  // Find or create SuperAdmin role definition
  let roleDef = await prisma.roleDefinition.findFirst({
    where: { name: 'SuperAdmin' }
  });

  if (!roleDef) {
    roleDef = await prisma.roleDefinition.create({
      data: {
        name: 'SuperAdmin',
        level: -1,
        isSystemDefault: true,
        canAccessConsole: true,
      }
    });
  }

  const salt = await bcrypt.genSalt(12);
  const hashedPassword = await bcrypt.hash(password, salt);

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      displayName: 'System SuperAdmin',
      tenantId: null, // Global access
      roleDefinitionId: roleDef.id,
      mustChangePassword: false,
    }
  });

  console.log(`Created SuperAdmin account:`);
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
