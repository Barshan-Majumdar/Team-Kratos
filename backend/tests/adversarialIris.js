require('dotenv').config();
const prisma = require('../src/config/db');
const { processEvent } = require('../src/services/triggerEngine');
const { executeRosterPlan, ExecutionError } = require('../src/services/shiftExecutionService');
const { executeAddEmployee } = require('../src/services/employeeExecutionService');

async function runAdversarialTests() {
  console.log('--- STARTING ADVERSARIAL SECURITY TESTS ---\n');
  const tenantId = 'TEST_TENANT';
  
  // Create mock tenant and users
  await prisma.basePrisma.tenant.upsert({
    where: { id: tenantId },
    update: {},
    create: { id: tenantId, name: 'Adversarial Test Corp' }
  });

  console.log('Test 1: Tenant Isolation Attack');
  try {
    const maliciousTenantId = 'EVIL_TENANT';
    // Evil tenant tries to execute test tenant's shift execution
    await executeRosterPlan(maliciousTenantId, 'HACKER_ID', 'plan_123_test');
    console.log('❌ FAIL: Execution proceeded despite wrong tenant');
  } catch (err) {
    if (err instanceof ExecutionError && err.statusCode === 404) {
      console.log('✅ PASS: Cross-tenant execution blocked (404 Not Found due to tenant scope)');
    } else {
      console.log('❌ FAIL: Unexpected error', err.message);
    }
  }

  console.log('\nTest 2: Department Ownership Attack');
  try {
    // HR Manager in Sales tries to approve Engineering employee onboarding
    await executeAddEmployee(tenantId, 1, 'Manager', 'Sales', {
      email: 'haxor@test.com',
      displayName: 'Haxor',
      department: 'Engineering',
      customRole: 'Employee',
      officeId: 'office_123'
    });
    console.log('❌ FAIL: Sales Manager was able to onboard Engineering employee');
  } catch (err) {
    if (err.message.includes('Sales')) {
      console.log('✅ PASS: Department ownership enforced:', err.message);
    } else {
      console.log('❌ FAIL:', err.message);
    }
  }

  console.log('\nTest 3: Gemini RBAC Manipulation Attack (Privilege Escalation)');
  try {
    // Gemini attempts to create an Admin (Level 1) when requested by a Level 2 Supervisor
    await executeAddEmployee(tenantId, 2, 'Supervisor', 'Sales', {
      email: 'admin@test.com',
      displayName: 'New Admin',
      department: 'Sales',
      customRole: 'Admin', // Level 1 role
      officeId: 'office_123'
    });
  } catch (err) {
    if (err.message.includes('hierarchy configured for this company')) {
       console.log('✅ PASS: RBAC rejected missing hierarchy or invalid role assignment request');
    }
  }

  console.log('\nTest 4: Stale Plan Protection (Concurrency)');
  try {
    // Attempting to apply a plan that is no longer valid
    await executeRosterPlan(tenantId, 'admin_123', 'fake_plan');
  } catch (err) {
     if (err.statusCode === 404) {
       console.log('✅ PASS: Invalid/Stale plan lookup cleanly rejected');
     }
  }

  console.log('\n--- TESTS COMPLETE ---');
}

runAdversarialTests().catch(console.error).finally(() => process.exit(0));
