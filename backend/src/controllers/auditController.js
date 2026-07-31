const prisma = require('../config/db');
const { generateAuditHash } = require('../utils/auditHashing');
const { sendNotification } = require('../utils/notificationEngine');

exports.verifyChain = async (req, res) => {
  try {
    const roleName = req.user?.roleDefinition?.name || req.user?.role;
    const userLevel = req.user?.roleDefinition?.level;
    const allowedRoles = ['SuperAdmin', 'CEO', 'Admin', 'Manager'];

    if (!allowedRoles.includes(roleName) && (userLevel === undefined || userLevel > 2)) {
      return res.status(403).json({ error: 'Access denied: Requires Manager, Admin, CEO, or SuperAdmin role' });
    }

    // Determine which tenant's logs to check
    // If SuperAdmin and an explicit tenantId is provided via query, use that.
    // Otherwise, use the user's own tenantId.
    const tenantId = (roleName === 'SuperAdmin' && req.query.tenantId) 
      ? req.query.tenantId 
      : req.user.tenantId;

    if (!tenantId) {
      return res.status(400).json({ error: 'No tenant specified' });
    }

    // We use basePrisma to explicitly query logs for a tenant, bypassing $allModels filter if we are SuperAdmin
    const logs = await prisma.basePrisma.auditLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'asc' },
    });

    let verifiedCount = 0;
    let skippedCount = 0;
    let prevHashSoFar = 'GENESIS_HASH';

    for (const log of logs) {
      if (!log.hash) {
        skippedCount++;
        continue; // Legacy row, pre-hash chaining
      }

      const payloadToHash = {
        actorId: log.actorId,
        action: log.action,
        targetId: log.targetId,
        details: log.details,
      };

      const computedHash = generateAuditHash(prevHashSoFar, payloadToHash);

      if (computedHash !== log.hash || log.prevHash !== prevHashSoFar) {
        // Tampering Detected!
        // Notify Admins and CEOs
        const adminUsers = await prisma.basePrisma.user.findMany({
          where: {
            tenantId,
            roleDefinition: {
              name: { in: ['SuperAdmin', 'CEO', 'Admin'] }
            }
          }
        });

        for (const admin of adminUsers) {
          await sendNotification({
            userId: admin.id,
            tenantId,
            type: 'AUDIT_TAMPER_DETECTED',
            data: {
              recordId: log.id,
              action: log.action,
              timestamp: log.createdAt
            }
          });
        }

        return res.status(400).json({
          status: 'error',
          message: 'Tampering Detected',
          recordId: log.id,
        });
      }

      prevHashSoFar = log.hash;
      verifiedCount++;
    }

    res.status(200).json({
      status: 'success',
      message: 'Chain Valid',
      verifiedCount,
      skippedCount
    });

  } catch (error) {
    console.error('Verify Chain Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
