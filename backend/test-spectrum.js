const prisma = require('./src/config/db');
const attendanceController = require('./src/controllers/attendanceController');

async function test() {
  const req = {
    user: {
      tenantId: 'some-tenant-id',
      roleDefinition: { level: 2 }
    }
  };
  const res = {
    json: (data) => console.log('SUCCESS:', data),
    status: (code) => ({
      json: (data) => console.log(`ERROR ${code}:`, data)
    })
  };

  try {
    await attendanceController.getWeeklySpectrum(req, res);
  } catch (err) {
    console.error('UNCAUGHT CRASH:', err);
  }
}
test().then(() => process.exit(0));
