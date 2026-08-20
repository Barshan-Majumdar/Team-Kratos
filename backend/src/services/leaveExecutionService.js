const prisma = require('../config/db');
const { sendNotification } = require('../utils/notificationEngine');
const { publishEvent } = require('../services/outboxService');
const { reverseLeave } = require('../utils/leaveLedger');

class ExecutionError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'ExecutionError';
  }
}

async function executeApproveLeave(tenantId, adminId, adminLevel, payload) {
  const { leaveId, adminRemarks } = payload;

  if (!leaveId) {
    throw new ExecutionError('leaveId is required to approve a leave.', 400);
  }

  const leave = await prisma.basePrisma.leave.findUnique({
    where: { id: leaveId },
    include: { user: true }
  });

  if (!leave) {
    throw new ExecutionError('Leave request not found.', 404);
  }

  if (leave.tenantId !== tenantId) {
    throw new ExecutionError('Unauthorized cross-tenant operation.', 403);
  }

  if (leave.status === 'Approved') {
    throw new ExecutionError('Leave is already approved.', 400);
  }

  const updated = await prisma.basePrisma.leave.update({
    where: { id: leaveId },
    data: { 
      status: 'Approved', 
      adminRemarks: adminRemarks || 'Approved via Iris', 
      approvedById: adminId, 
      approvedAt: new Date() 
    }
  });

  sendNotification({
    userId: leave.userId,
    tenantId,
    type: 'LEAVE_APPROVED',
    data: { date: updated.startDate.toISOString().split('T')[0] }
  });

  await prisma.basePrisma.intelligenceProfile.upsert({
    where: { userId: leave.userId },
    update: { isDirty: true },
    create: { tenantId, userId: leave.userId, isDirty: true }
  }).catch(err => console.error('[Intelligence] Failed to mark profile dirty:', err));

  const targetUser = await prisma.basePrisma.user.findUnique({ where: { id: leave.userId }, select: { department: true } });
  
  await publishEvent(prisma, {
    tenantId,
    eventType: 'ROSTER_SHORTAGE',
    sourceEntity: 'Leave',
    sourceEntityId: updated.id,
    payload: {
      department: targetUser?.department || 'General',
      date: updated.startDate.toISOString().split('T')[0],
      employeeId: leave.userId
    }
  }).catch(err => console.error('[Outbox] Failed to publish ROSTER_SHORTAGE:', err));

  await prisma.auditLog.create({
    data: {
      tenantId,
      actorId: adminId,
      action: 'IRIS_EXECUTE_APPROVE_LEAVE',
      targetId: leaveId,
      details: { adminRemarks }
    }
  });

  return updated;
}

async function executeRejectLeave(tenantId, adminId, adminLevel, payload) {
  const { leaveId, adminRemarks } = payload;

  if (!leaveId) {
    throw new ExecutionError('leaveId is required to reject a leave.', 400);
  }

  const leave = await prisma.basePrisma.leave.findUnique({
    where: { id: leaveId },
    include: { user: true, leavePolicy: true }
  });

  if (!leave) {
    throw new ExecutionError('Leave request not found.', 404);
  }

  if (leave.tenantId !== tenantId) {
    throw new ExecutionError('Unauthorized cross-tenant operation.', 403);
  }

  if (leave.status === 'Rejected' || leave.status === 'Approved') {
    throw new ExecutionError(`Leave is already ${leave.status}.`, 400);
  }

  const updated = await prisma.basePrisma.$transaction(async (tx) => {
    const holdEntry = await tx.leaveLedgerEntry.findFirst({
      where: {
        tenantId,
        userId: leave.userId,
        policyGroupId: leave.leavePolicy.policyGroupId,
        reason: 'PENDING_HOLD'
      },
      orderBy: { createdAt: 'desc' }
    });

    if (holdEntry) {
      await reverseLeave(tx, tenantId, holdEntry.id);
    }

    return await tx.leave.update({
      where: { id: leaveId },
      data: { status: 'Rejected', adminRemarks: adminRemarks || 'Rejected via Iris', approvedById: adminId, approvedAt: new Date() }
    });
  }, { maxWait: 10000, timeout: 30000 });

  sendNotification({
    userId: leave.userId,
    tenantId,
    type: 'LEAVE_REJECTED',
    data: { date: updated.startDate.toISOString().split('T')[0], adminRemarks: updated.adminRemarks }
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      actorId: adminId,
      action: 'IRIS_EXECUTE_REJECT_LEAVE',
      targetId: leaveId,
      details: { adminRemarks: updated.adminRemarks }
    }
  });

  return updated;
}

module.exports = {
  executeApproveLeave,
  executeRejectLeave,
  ExecutionError
};
