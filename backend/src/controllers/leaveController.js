const prisma = require('../config/db');
const ImageKit = require('imagekit');
const { sendNotification } = require('../utils/notificationEngine');

const imagekit = new ImageKit({
    publicKey : process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey : process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint : process.env.IMAGEKIT_URL_ENDPOINT
});

const applyLeave = async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, startDate, endDate, reason } = req.body;
    let attachment = null;
    if (req.file) {
      const uploadRes = await imagekit.upload({
        file: req.file.buffer.toString('base64'), // base64 encoding avoids buffer payload errors
        fileName: `leave_${userId}_${Date.now()}_${req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`,
        folder: '/leaves',
        useUniqueFileName: true
      });
      attachment = uploadRes.url;
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // basic validation
    if (end < start) {
      return res.status(400).json({ error: 'End date must be after start date' });
    }

    // Find or create a default leave policy for this tenant to satisfy the new schema
    let policy = await prisma.leavePolicy.findFirst({
      where: { tenantId: req.user.tenantId, name: type }
    });
    if (!policy) {
      policy = await prisma.leavePolicy.create({
        data: {
          tenantId: req.user.tenantId,
          name: type,
          annualQuota: 20
        }
      });
    }

    const leave = await prisma.leave.create({
      data: {
        userId,
        tenantId: req.user.tenantId,
        leavePolicyId: policy.id,
        startDate: start,
        endDate: end,
        reason,
        attachment
      }
    });

    // Fire email notification to the Employee as a confirmation
    sendNotification({
      userId: req.user.id,
      tenantId: req.user.tenantId,
      type: 'LEAVE_APPLIED_CONFIRMATION',
      data: {
        date: start.toISOString().split('T')[0]
      }
    });

    res.json(leave);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getMyLeaves = async (req, res) => {
  try {
    const leaves = await prisma.leave.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });
    res.json(leaves);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getAllLeaves = async (req, res) => {
  try {
    const isManager = req.user.role === 'Manager';
    const isAdmin = req.user.role === 'Admin' || req.user.role === 'SuperAdmin' || req.user.role === 'CEO';
    
    let whereClause = { tenantId: req.user.tenantId };
    
    if (isManager && !isAdmin) {
      // Manager only sees leaves of their direct reports
      whereClause = {
        tenantId: req.user.tenantId,
        user: { managerId: req.user.id }
      };
    }

    const leaves = await prisma.leave.findMany({
      where: whereClause,
      include: {
        user: {
          select: { displayName: true, department: true, employeeId: true }
        },
        leavePolicy: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(leaves);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getLeavesByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const leaves = await prisma.leave.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(leaves);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateLeaveStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminRemarks } = req.body;

    const leave = await prisma.leave.findUnique({ where: { id }, include: { user: true } });
    if (!leave) return res.status(404).json({ error: 'Leave request not found' });

    const updated = await prisma.leave.update({
      where: { id },
      data: { status, adminRemarks, approvedById: req.user.id, approvedAt: new Date() }
    });

    // Notify the employee about the approval/rejection
    if (status === 'Approved') {
      sendNotification({
        userId: leave.userId,
        tenantId: req.user.tenantId,
        type: 'LEAVE_APPROVED',
        data: { date: updated.startDate.toISOString().split('T')[0] }
      });
    } else if (status === 'Rejected') {
      sendNotification({
        userId: leave.userId,
        tenantId: req.user.tenantId,
        type: 'LEAVE_REJECTED',
        data: { date: updated.startDate.toISOString().split('T')[0], adminRemarks }
      });
    }

    // We no longer update leavesTaken here. It is computed at query time dynamically.

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  applyLeave,
  getMyLeaves,
  getAllLeaves,
  getLeavesByUser,
  updateLeaveStatus
};
