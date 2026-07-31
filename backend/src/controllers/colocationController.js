const prisma = require('../config/db');

exports.getNetworkGraph = async (req, res) => {
  try {
    const userRole = req.user?.roleDefinition;
    const tenantId = req.user?.tenantId;

    if (!userRole || !tenantId) {
      return res.status(403).json({ error: 'Access denied: Invalid tenant context or role' });
    }

    const isAdminOrCEO = userRole.name === 'SuperAdmin' || userRole.name === 'CEO' || userRole.name === 'Admin' || userRole.level <= 1;
    const isManager = userRole.name === 'Manager' || userRole.level === 2;

    if (!isAdminOrCEO && !isManager) {
      return res.status(403).json({ error: 'Access denied: Employees cannot view network graph data' });
    }

    const cacheRecord = await prisma.basePrisma.colocationGraphCache.findUnique({
      where: { tenantId }
    });

    if (!cacheRecord) {
      return res.json({ nodes: [], links: [], computedAt: null });
    }

    let nodes = Array.isArray(cacheRecord.nodes) ? cacheRecord.nodes : JSON.parse(cacheRecord.nodes || '[]');
    let links = Array.isArray(cacheRecord.links) ? cacheRecord.links : JSON.parse(cacheRecord.links || '[]');

    if (isManager && !isAdminOrCEO) {
      // Find direct report IDs
      const directReports = await prisma.basePrisma.user.findMany({
        where: { tenantId, managerId: req.user.id },
        select: { id: true }
      });
      const allowedUserIds = new Set([req.user.id, ...directReports.map(r => r.id)]);

      // Filter links where at least source or target is in direct reports set
      links = links.filter(link => allowedUserIds.has(link.source) || allowedUserIds.has(link.target));
      const connectedNodeIds = new Set();
      links.forEach(l => {
        connectedNodeIds.add(l.source);
        connectedNodeIds.add(l.target);
      });
      nodes = nodes.filter(n => connectedNodeIds.has(n.id));
    }

    res.json({
      nodes,
      links,
      computedAt: cacheRecord.computedAt
    });

  } catch (error) {
    console.error('Error fetching colocation network graph:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
