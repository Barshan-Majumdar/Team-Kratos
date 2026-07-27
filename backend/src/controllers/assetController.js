const prisma = require('../config/db');

const getAssets = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const assets = await prisma.asset.findMany({
      where: { tenantId },
      include: {
        assignedTo: { select: { displayName: true, email: true } },
        assignments: {
          orderBy: { assignedAt: 'desc' },
          include: { user: { select: { displayName: true } } }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(assets);
  } catch (error) {
    console.error('getAssets error:', error);
    res.status(500).json({ error: error.message });
  }
};

const createAsset = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { name, category, serialNumber, condition, purchaseDate, price } = req.body;
    
    const asset = await prisma.asset.create({
      data: {
        tenantId,
        name,
        category,
        serialNumber,
        condition,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        price: price ? parseFloat(price) : null,
        status: 'Available'
      }
    });
    res.status(201).json(asset);
  } catch (error) {
    console.error('createAsset error:', error);
    res.status(500).json({ error: error.message });
  }
};

const assignAsset = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;
    const { userId, condition } = req.body;

    const asset = await prisma.asset.findFirst({ where: { id, tenantId } });
    if (!asset) return res.status(404).json({ error: 'Asset not found' });
    if (asset.status === 'Assigned') return res.status(400).json({ error: 'Asset is already assigned' });

    // Transaction to update asset and create assignment log
    const [updatedAsset, assignment] = await prisma.$transaction([
      prisma.asset.update({
        where: { id },
        data: {
          status: 'Assigned',
          assignedToId: userId
        }
      }),
      prisma.assetAssignment.create({
        data: {
          tenantId,
          assetId: id,
          userId,
          condition: condition || asset.condition
        }
      })
    ]);

    res.json(updatedAsset);
  } catch (error) {
    console.error('assignAsset error:', error);
    res.status(500).json({ error: error.message });
  }
};

const unassignAsset = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;
    const { condition } = req.body;

    const asset = await prisma.asset.findFirst({ where: { id, tenantId }, include: { assignments: { orderBy: { assignedAt: 'desc' }, take: 1 } } });
    if (!asset) return res.status(404).json({ error: 'Asset not found' });
    if (asset.status !== 'Assigned' || !asset.assignedToId) return res.status(400).json({ error: 'Asset is not currently assigned' });

    const latestAssignment = asset.assignments[0];

    const operations = [
      prisma.asset.update({
        where: { id },
        data: {
          status: 'Available',
          assignedToId: null,
          condition: condition || asset.condition
        }
      })
    ];

    if (latestAssignment && !latestAssignment.returnedAt) {
      operations.push(
        prisma.assetAssignment.update({
          where: { id: latestAssignment.id },
          data: {
            returnedAt: new Date(),
            condition: condition || latestAssignment.condition
          }
        })
      );
    }

    const [updatedAsset] = await prisma.$transaction(operations);
    res.json(updatedAsset);
  } catch (error) {
    console.error('unassignAsset error:', error);
    res.status(500).json({ error: error.message });
  }
};

const updateAssetStatus = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;
    const { status, condition } = req.body; // e.g. UnderMaintenance, Retired

    const asset = await prisma.asset.findFirst({ where: { id, tenantId } });
    if (!asset) return res.status(404).json({ error: 'Asset not found' });
    
    // Cannot retire or maintain an assigned asset directly without unassigning first usually, but we'll allow it and just remove assignment
    const data = { status };
    if (condition) data.condition = condition;

    if (['UnderMaintenance', 'Retired'].includes(status) && asset.assignedToId) {
      data.assignedToId = null;
      // also close assignment log
      const latestAssignment = await prisma.assetAssignment.findFirst({
        where: { assetId: id, returnedAt: null },
        orderBy: { assignedAt: 'desc' }
      });
      if (latestAssignment) {
        await prisma.assetAssignment.update({
          where: { id: latestAssignment.id },
          data: { returnedAt: new Date() }
        });
      }
    }

    const updated = await prisma.asset.update({
      where: { id },
      data
    });
    res.json(updated);
  } catch (error) {
    console.error('updateAssetStatus error:', error);
    res.status(500).json({ error: error.message });
  }
};

const deleteAsset = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;
    
    // delete assignments first
    await prisma.assetAssignment.deleteMany({ where: { assetId: id, tenantId } });
    await prisma.asset.delete({ where: { id, tenantId } });
    
    res.json({ success: true });
  } catch (error) {
    console.error('deleteAsset error:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAssets,
  createAsset,
  assignAsset,
  unassignAsset,
  updateAssetStatus,
  deleteAsset
};
