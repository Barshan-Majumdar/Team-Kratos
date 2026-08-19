const { runCostInvestigation } = require('./src/services/investigationService');
const prisma = require('./src/config/db');

async function test() {
  const tenant = await prisma.basePrisma.tenant.findFirst();
  try {
    const report = await runCostInvestigation(tenant.id, 'Engineering', '2026-08', '2026-07', 'OVERTIME_COST', false);
    console.log("Success:", report);
  } catch (e) {
    console.error("Error:", e);
  }
}

test().finally(() => process.exit(0));
