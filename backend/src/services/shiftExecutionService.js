const prisma = require('../config/db');
const { generateRosterPlan } = require('./rosterSimulationService');

class ExecutionError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

async function executeRosterPlan(tenantId, adminId, planId, departmentLimit = null, adminLevel = 99) {
  // 1. Fetch the simulation record
  const simulation = await prisma.basePrisma.rosterSimulation.findUnique({
    where: { id: planId }
  });

  // Strict tenant check: only Founders (adminLevel 0) can execute plans across tenants
  if (simulation && simulation.tenantId !== tenantId) {
    if (adminLevel !== 0) {
      throw new ExecutionError('Access Denied: This shift plan belongs to a different organization.', 403);
    }
    // Founder executing cross-tenant: skip departmentLimit enforcement (it won't make sense cross-tenant)
  }

  if (!simulation) {
    throw new ExecutionError('Simulation plan not found', 404);
  }

  // 2. Enforce strict resource ownership (Department boundaries)
  if (departmentLimit) {
    // If the executor is limited to a department, ensure NO assignments go outside it
    const targetEmployeeIds = simulation.plan.filter(p => p.action === 'ASSIGN').map(p => p.employeeId);
    
    if (targetEmployeeIds.length > 0) {
      const outOfBoundsEmployees = await prisma.basePrisma.user.count({
        where: {
          id: { in: targetEmployeeIds },
          department: { not: departmentLimit },
          tenantId
        }
      });

      if (outOfBoundsEmployees > 0) {
        throw new ExecutionError(`Access Denied: You can only execute rosters for employees in the ${departmentLimit} department.`, 403);
      }
    }
  }

  // 3. Atomically lock the simulation record
  const updateResult = await prisma.basePrisma.rosterSimulation.updateMany({
    where: { id: planId, status: { in: ['GENERATED', 'EXPIRED'] } },
    data: { status: 'APPLYING' }
  });

  if (updateResult.count === 0) {
    throw new ExecutionError('Cannot apply plan. It has already been applied, expired, or is currently processing.', 409);
  }

  // 4. Stale-Plan Protection: Re-verify fingerprint live
  const params = simulation.metrics?.simulationParams || {};
  const { currentFingerprint: freshFingerprint } = await generateRosterPlan(
    tenantId, 
    params.targetDate || null, 
    params.daysAhead || 7, 
    params.departmentFilter || null
  ); 
  
  if (simulation.currentFingerprint !== freshFingerprint) {
    await prisma.basePrisma.rosterSimulation.update({ where: { id: planId }, data: { status: 'STALE' } });
    throw new ExecutionError('⚠ This proposed roster is outdated. The underlying roster changed after this simulation was generated.', 409);
  }

  // 5. Build and execute transaction
  const operations = [];
  
  for (const action of simulation.plan) {
    if (action.action !== 'ASSIGN') continue;

    const isNewSlot = action.slotId.startsWith('NEW_');

    if (isNewSlot) {
      operations.push(
        prisma.basePrisma.shiftSlot.create({
          data: {
            tenantId,
            date: new Date(action.date),
            shiftType: action.shiftType,
            startTime: action.startTime,
            endTime: action.endTime,
            assignments: {
              create: {
                tenantId,
                employeeId: action.employeeId,
                mode: 'AUTO',
                assignedBy: adminId
              }
            }
          }
        })
      );
    } else {
      operations.push(
        prisma.basePrisma.shiftAssignment.upsert({
          where: {
            slotId_employeeId: { slotId: action.slotId, employeeId: action.employeeId }
          },
          update: { mode: 'AUTO', assignedBy: adminId },
          create: {
            tenantId,
            slotId: action.slotId,
            employeeId: action.employeeId,
            mode: 'AUTO',
            assignedBy: adminId
          }
        })
      );
    }
  }

  operations.push(
    prisma.basePrisma.rosterSimulation.update({
      where: { id: planId },
      data: { status: 'APPLIED', appliedAt: new Date(), appliedBy: adminId }
    })
  );

  await prisma.basePrisma.$transaction(operations);

  // Execute audit log securely through the extended client to guarantee cryptographic hashing
  await prisma.auditLog.create({
    data: {
      tenantId,
      actorId: adminId,
      action: 'IRIS_EXECUTE_ROSTER_ADJUSTMENT',
      targetId: planId,
      details: { planId }
    }
  });

  // Extract assigned names for a richer success message
  const uniqueEmployeeIds = [...new Set(simulation.plan.filter(a => a.action === 'ASSIGN').map(a => a.employeeId))];
  const assignedUsers = await prisma.basePrisma.user.findMany({
    where: { id: { in: uniqueEmployeeIds } },
    select: { displayName: true }
  });
  const assignedNames = assignedUsers.map(u => u.displayName);
  const totalAssigned = simulation.plan.filter(a => a.action === 'ASSIGN').length;

  return { appliedCount: totalAssigned, assignedNames };
}

module.exports = {
  executeRosterPlan,
  ExecutionError
};
