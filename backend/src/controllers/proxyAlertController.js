const prisma = require('../config/db');

const getAlerts = async (req, res) => {
  try {
    const { resolved, severity, alertType, attendanceDate } = req.query;
    const where = { tenantId: req.user.tenantId };
    
    if (resolved !== undefined) {
      where.resolved = resolved === 'true';
    }
    if (severity) {
      where.severity = severity;
    }
    if (alertType) {
      where.alertType = alertType;
    }
    if (attendanceDate) {
      where.attendanceDate = new Date(attendanceDate);
    }
    
    const alerts = await prisma.proxyAlert.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    const userIds = [...new Set(alerts.flatMap(a => [a.userId, a.targetUserId]).filter(Boolean))];
    const users = await prisma.basePrisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, displayName: true, email: true, employeeId: true, avatar: true }
    });

    const userMap = users.reduce((acc, u) => {
      acc[u.id] = u;
      return acc;
    }, {});

    const alertsWithUsers = alerts.map(a => ({
      ...a,
      user: userMap[a.userId] || null,
      targetUser: a.targetUserId ? (userMap[a.targetUserId] || null) : null
    }));

    res.json(alertsWithUsers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getStats = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const totalUnresolved = await prisma.proxyAlert.count({
      where: { tenantId, resolved: false }
    });
    
    const severityCounts = await prisma.proxyAlert.groupBy({
      by: ['severity'],
      where: { tenantId, resolved: false },
      _count: true
    });
    
    const typeCounts = await prisma.proxyAlert.groupBy({
      by: ['alertType'],
      where: { tenantId, resolved: false },
      _count: true
    });
    
    res.json({
      totalUnresolved,
      severity: severityCounts.reduce((acc, s) => {
        acc[s.severity] = s._count;
        return acc;
      }, { HIGH: 0, MEDIUM: 0, LOW: 0 }),
      alertType: typeCounts.reduce((acc, t) => {
        acc[t.alertType] = t._count;
        return acc;
      }, { coordinate_proximity: 0, travel_speed: 0, temporal_cluster: 0, identity_embedding_collision: 0 })
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const resolveAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolution, comments } = req.body;
    const tenantId = req.user.tenantId;
    
    if (!['dismissed', 'confirmed_fraud', 'false_positive'].includes(resolution)) {
      return res.status(400).json({ error: 'Invalid resolution value.' });
    }

    const updatedAlert = await prisma.proxyAlert.update({
      where: {
        id,
        tenantId // Explicit tenant check
      },
      data: {
        resolved: true,
        resolvedBy: req.user.email || req.user.id,
        resolvedAt: new Date(),
        resolution
      }
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        actorId: req.user.id,
        action: 'PROXY_ALERT_RESOLVED',
        targetId: id,
        details: {
          resolution,
          comments: comments || '',
          resolvedBy: req.user.email
        }
      }
    });

    res.json(updatedAlert);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const bulkDismiss = async (req, res) => {
  try {
    const { ids, resolution, comments } = req.body;
    const tenantId = req.user.tenantId;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Array of alert IDs is required.' });
    }
    
    const finalResolution = resolution || 'dismissed';
    if (!['dismissed', 'confirmed_fraud', 'false_positive'].includes(finalResolution)) {
      return res.status(400).json({ error: 'Invalid resolution value.' });
    }

    const result = await prisma.proxyAlert.updateMany({
      where: {
        id: { in: ids },
        tenantId // Explicit tenant check
      },
      data: {
        resolved: true,
        resolvedBy: req.user.email || req.user.id,
        resolvedAt: new Date(),
        resolution: finalResolution
      }
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        actorId: req.user.id,
        action: 'PROXY_ALERT_BULK_RESOLVED',
        details: {
          count: result.count,
          ids,
          resolution: finalResolution,
          comments: comments || ''
        }
      }
    });

    res.json({ success: true, count: result.count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAlerts,
  getStats,
  resolveAlert,
  bulkDismiss
};
