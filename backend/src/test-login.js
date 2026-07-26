const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testLogin() {
  try {
    const user = await prisma.user.findUnique({ 
      where: { email: 'barshanmajumdar249@gmail.com' },
      include: { roleDefinition: true }
    });
    console.log("User:", user ? "Found" : "Not Found");
    if (user) {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      await prisma.user.update({
        where: { id: user.id },
        data: { 
          otpCode: otp,
          otpExpiry: new Date(Date.now() + 15 * 60 * 1000) 
        }
      });
      console.log("OTP updated");
    }
  } catch (error) {
    console.error("Prisma error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testLogin();
