const prisma = require('../config/db');
const ImageKit = require('imagekit');

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

    const leave = await prisma.leave.create({
      data: {
        userId,
        type,
        startDate: start,
        endDate: end,
        reason,
        attachment
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
    const leaves = await prisma.leave.findMany({
      include: {
        user: {
          select: { displayName: true, department: true, employeeId: true }
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
      data: { status, adminRemarks }
    });

    // Smart logic: if approved, deduct from leavesTaken
    if (status === 'Approved' && leave.status !== 'Approved') {
      // Calculate working days taken
      const days = Math.ceil((new Date(leave.endDate) - new Date(leave.startDate)) / (1000 * 60 * 60 * 24)) + 1;
      
      await prisma.user.update({
        where: { id: leave.userId },
        data: {
          leavesTaken: { increment: days }
        }
      });
    } else if (status !== 'Approved' && leave.status === 'Approved') {
      // If it was approved but is now rejected/pending, give the days back
      const days = Math.ceil((new Date(leave.endDate) - new Date(leave.startDate)) / (1000 * 60 * 60 * 24)) + 1;
      await prisma.user.update({
        where: { id: leave.userId },
        data: {
          leavesTaken: { decrement: days }
        }
      });
    }

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
