require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const prisma = require('../config/db');
const { getDistanceInMeters, getTravelSpeedKmh } = require('../utils/geoUtils');
const { detectProxyAnomalies, degradedTrustScoreCap, getPreviousWorkday, getDateMinusDays } = require('../utils/proxyDetectionEngine');

async function runTests() {
  console.log('--- STARTING PROXY DETECTION ENGINE TESTS ---');

  // Test 1: Geo math
  console.log('\n[Test 1] Testing Geo Math...');
  const lat1 = 12.9716, lon1 = 77.5946; // Bangalore
  const lat2 = lat1 + (0.5 / 111111), lon2 = lon1; // approx 0.5m north
  const dist = getDistanceInMeters(lat1, lon1, lat2, lon2);
  console.log(`Bangalore to 0.5m North distance: ${dist.toFixed(4)} meters (Expected: ~0.5m)`);
  if (dist < 1) {
    console.log('✓ distance calculation < 1 meter holds!');
  } else {
    throw new Error('Distance math failed');
  }

  // Cross country travel speed
  const latDel = 28.7041, lonDel = 77.1025; // Delhi
  const time1 = Date.now() - 3600 * 1000 * 2; // 2 hours ago
  const time2 = Date.now();
  const speed = getTravelSpeedKmh(lat1, lon1, time1, latDel, lonDel, time2);
  console.log(`Bangalore to Delhi (in 2 hours) speed: ${speed.toFixed(2)} km/h (Expected: > 900 km/h)`);
  if (speed > 400) {
    console.log('✓ cross-country implied speed check holds!');
  } else {
    throw new Error('Speed math failed');
  }

  // Seed data for database tests
  console.log('\n[Test 2] Seeding mock data in Postgres...');
  let tenant = await prisma.basePrisma.tenant.findFirst();
  if (!tenant) {
    tenant = await prisma.basePrisma.tenant.create({
      data: {
        name: 'Test Tenant',
        domain: 'test-tenant.com'
      }
    });
  }
  console.log(`Using Tenant: ${tenant.name} (${tenant.id})`);

  // Create test users
  const createTestUser = async (email, employeeId, displayName) => {
    let u = await prisma.basePrisma.user.findUnique({ where: { email } });
    if (!u) {
      u = await prisma.basePrisma.user.create({
        data: {
          email,
          employeeId,
          displayName,
          password: 'PasswordHash123!',
          tenantId: tenant.id
        }
      });
    }
    return u;
  };

  const userA = await createTestUser('test.usera@acme.com', 'EMP001', 'Test User A');
  const userB = await createTestUser('test.userb@acme.com', 'EMP002', 'Test User B');
  const userC = await createTestUser('test.userc@acme.com', 'EMP003', 'Test User C');
  const userD = await createTestUser('test.userd@acme.com', 'EMP004', 'Test User D');
  const userE = await createTestUser('test.usere@acme.com', 'EMP005', 'Test User E');

  const today = new Date();
  today.setUTCHours(0,0,0,0);
  const prevWorkday = getPreviousWorkday(today);

  // Clear previous test logs for clean run
  await prisma.basePrisma.proxyAlert.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.basePrisma.attendance.deleteMany({ 
    where: { 
      tenantId: tenant.id, 
      userId: { in: [userA.id, userB.id, userC.id, userD.id, userE.id] } 
    } 
  });

  // Seed coordinate proximity check-in (A and B checks in at identical locations today)
  console.log('Seeding proximity check-in for User A and B...');
  await prisma.basePrisma.attendance.create({
    data: {
      tenantId: tenant.id,
      userId: userA.id,
      date: today,
      checkIn: new Date(),
      latitude: lat1,
      longitude: lon1,
      trustScore: 95
    }
  });

  await prisma.basePrisma.attendance.create({
    data: {
      tenantId: tenant.id,
      userId: userB.id,
      date: today,
      checkIn: new Date(Date.now() + 1000), // 1 sec later
      latitude: lat1 + (0.3 / 111111), // 0.3 meters apart
      longitude: lon1,
      trustScore: 90
    }
  });

  // Seed travel speed check-in (C checks in at Bangalore on prevWorkday, Delhi today)
  console.log('Seeding travel speed check-in for User C...');
  const baseTime = Date.now() - 3600000 * 2; // 2 hours ago
  await prisma.basePrisma.attendance.create({
    data: {
      tenantId: tenant.id,
      userId: userC.id,
      date: prevWorkday,
      checkIn: new Date(baseTime), // Bangalore check-in
      latitude: lat1,
      longitude: lon1,
      trustScore: 100
    }
  });
  await prisma.basePrisma.attendance.create({
    data: {
      tenantId: tenant.id,
      userId: userC.id,
      date: today,
      checkIn: new Date(baseTime + 3600000), // Delhi check-in 1 hour later
      latitude: latDel,
      longitude: lonDel,
      trustScore: 95
    }
  });

  // Seed temporal cluster (D and E checks in within 5 seconds of each other for 4 days in last 7 days)
  console.log('Seeding temporal cluster checks for User D and E...');
  for (let offset = 0; offset < 4; offset++) {
    const runDate = getDateMinusDays(today, offset);
    await prisma.basePrisma.attendance.create({
      data: {
        tenantId: tenant.id,
        userId: userD.id,
        date: runDate,
        checkIn: new Date(runDate.getTime() + 9 * 3600000),
        latitude: lat1,
        longitude: lon1,
        trustScore: 100
      }
    });
    await prisma.basePrisma.attendance.create({
      data: {
        tenantId: tenant.id,
        userId: userE.id,
        date: runDate,
        checkIn: new Date(runDate.getTime() + 9 * 3600000 + 2000), // 2 seconds apart
        latitude: lat1,
        longitude: lon1,
        trustScore: 100
      }
    });
  }

  // Running detection engine
  console.log('\n[Test 3] Running detectProxyAnomalies...');
  const detectedAlerts = await detectProxyAnomalies(prisma.basePrisma, tenant.id, today);
  console.log(`Detected Alerts Count: ${detectedAlerts.length}`);
  
  detectedAlerts.forEach(a => {
    console.log(`- Alert Type: ${a.alertType} | Severity: ${a.severity} | Reason: ${a.reason}`);
  });

  const proximityAlert = detectedAlerts.find(a => a.alertType === 'coordinate_proximity');
  const speedAlert = detectedAlerts.find(a => a.alertType === 'travel_speed');
  const clusterAlert = detectedAlerts.find(a => a.alertType === 'temporal_cluster');

  if (proximityAlert) console.log('✓ Proximity alert successfully detected!');
  else throw new Error('Failed to detect proximity alert');

  if (speedAlert) console.log('✓ Travel speed alert successfully detected!');
  else throw new Error('Failed to detect travel speed alert');

  if (clusterAlert && clusterAlert.metadata.occurrences === 4) console.log('✓ Temporal cluster alert successfully detected with 4 occurrences!');
  else throw new Error('Failed to detect temporal cluster alert');

  // Test 4: Deduplication of temporal cluster on multiple runs
  console.log('\n[Test 4] Testing temporal cluster update and deduplication...');
  await prisma.basePrisma.proxyAlert.create({
    data: clusterAlert
  });

  const existing = await prisma.basePrisma.proxyAlert.findFirst({
    where: {
      tenantId: tenant.id,
      userId: clusterAlert.userId,
      targetUserId: clusterAlert.targetUserId,
      alertType: 'temporal_cluster',
      resolved: false
    }
  });

  if (existing) {
    console.log('Found existing unresolved temporal cluster alert in DB. Testing update...');
    const updated = await prisma.basePrisma.proxyAlert.update({
      where: { id: existing.id },
      data: {
        metadata: {
          ...existing.metadata,
          occurrences: 5
        }
      }
    });
    console.log(`✓ Updated successfully! New occurrences: ${updated.metadata.occurrences}`);
  } else {
    throw new Error('Deduplication test failed: Existing unresolved temporal cluster alert not found');
  }

  // Cleanup
  console.log('\nCleaning up seed data...');
  await prisma.basePrisma.proxyAlert.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.basePrisma.attendance.deleteMany({ 
    where: { 
      tenantId: tenant.id, 
      userId: { in: [userA.id, userB.id, userC.id, userD.id, userE.id] } 
    } 
  });
  console.log('✓ Cleanup done!');
  
  console.log('\n--- ALL TEST PASSED SUCCESSFULLY ---');
}

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test run failed with error:', err);
    process.exit(1);
  });
