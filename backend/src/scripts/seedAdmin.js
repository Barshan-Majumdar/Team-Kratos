const prisma = require('../config/db');
const bcrypt = require('bcrypt');

async function seedAdmin() {
  try {
    const adminExists = await prisma.user.findFirst({ where: { role: 'Admin' } });
    if (adminExists) {
      console.log('Admin already exists:', adminExists.email);
      process.exit(0);
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('AdminPassword123!', salt);

    await prisma.user.create({
      data: {
        employeeId: 'OISYAD20260001',
        email: 'admin@acme.com',
        password: hashedPassword,
        role: 'Admin',
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
