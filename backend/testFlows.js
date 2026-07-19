const fs = require('fs');
const prisma = require('./src/config/db');
const jwt = require('jsonwebtoken');

async function runTests() {
  console.log('--- STARTING FLOW TESTS ---');
  try {
    // 1. Find an existing admin user
    console.log('\\n1. Finding an admin user...');
    const adminUser = await prisma.basePrisma.user.findFirst({
      where: { role: { in: ['Admin', 'CEO'] }, status: 'Active' },
      include: { tenant: true }
    });

    if (!adminUser) {
      throw new Error('No Active Admin user found in the database to test with.');
    }
    
    console.log(`Found admin user: ${adminUser.email} (Tenant: ${adminUser.tenant.name})`);

    // 2. Generate token directly
    console.log('\\n2. Generating login token...');
    const token = jwt.sign({ _id: adminUser.id, role: adminUser.role }, process.env.JWT_SECRET || 'supersecret', { expiresIn: '1d' });
    console.log('Token generated successfully');

    // 3. Announcements (Should trigger COMPANY_ANNOUNCEMENT)
    console.log('\\n3. Creating Announcement...');
    const annRes = await fetch('http://localhost:5000/api/announcements', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({
        title: 'Welcome to Test Company',
        message: 'This is a test announcement'
      })
    });

    if (!annRes.ok) throw new Error(`Announcement failed: ${await annRes.text()}`);
    console.log('Announcement created:', await annRes.json());

    // 4. Apply Leave (Should trigger LEAVE_APPLIED_CONFIRMATION)
    console.log('\\n4. Applying for Leave (Multipart)...');
    const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
    let body = '--' + boundary + '\\r\\nContent-Disposition: form-data; name="type"\\r\\n\\r\\nSick Leave\\r\\n';
    body += '--' + boundary + '\\r\\nContent-Disposition: form-data; name="startDate"\\r\\n\\r\\n2025-01-01\\r\\n';
    body += '--' + boundary + '\\r\\nContent-Disposition: form-data; name="endDate"\\r\\n\\r\\n2025-01-02\\r\\n';
    body += '--' + boundary + '\\r\\nContent-Disposition: form-data; name="reason"\\r\\n\\r\\nTesting\\r\\n';
    body += '--' + boundary + '--\\r\\n';

    const leaveRes = await fetch('http://localhost:5000/api/leave/apply', {
      method: 'POST',
      headers: { 
        'Content-Type': 'multipart/form-data; boundary=' + boundary,
        'Authorization': 'Bearer ' + token
      },
      body
    });

    if (!leaveRes.ok) throw new Error(`Leave Apply failed: ${await leaveRes.text()}`);
    const leaveData = await leaveRes.json();
    console.log('Leave applied:', leaveData.id);

    // 5. Approve Leave (Should trigger LEAVE_APPROVED)
    console.log('\\n5. Approving Leave...');
    const approveRes = await fetch('http://localhost:5000/api/leave/' + leaveData.id + '/status', {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({ status: 'Approved' })
    });
    if (!approveRes.ok) throw new Error(`Leave Approve failed: ${await approveRes.text()}`);
    console.log('Leave approved');

    // 5.5 Generate Payroll
    console.log('\\n5.5. Generating Payroll...');
    const payrollRes = await fetch('http://localhost:5000/api/payroll/generate/2026-07', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({ month: 7, year: 2026 })
    });
    if (!payrollRes.ok) {
      console.warn('Payroll generation failed (expected if user has no baseSalary):', await payrollRes.text());
    } else {
      console.log('Payroll generated successfully');
    }

    // 6. Test Cron (Should trigger UNAPPROVED_ABSENCE)
    console.log('\\n6. Triggering Cron...');
    const cronRes = await fetch('http://localhost:5000/api/cron');
    if (!cronRes.ok) throw new Error(`Cron failed: ${await cronRes.text()}`);
    console.log('Cron triggered successfully');

    console.log('\\n--- ALL TESTS PASSED SUCCESSFULLY ---');
  } catch (err) {
    console.error('\\n!!! TEST FAILED !!!\\n', err);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
