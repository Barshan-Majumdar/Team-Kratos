const prisma = require('../config/db');
const { sendNotification } = require('../utils/notificationEngine');

const createAnnouncement = async (req, res) => {
  try {
    const { title, message } = req.body;
    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required' });
    }

    const tenantId = req.user.tenantId;

    const announcement = await prisma.announcement.create({
      data: {
        tenantId,
        adminId: req.user.id,
        message: `${title}\n\n${message}` // Schema just has 'message', let's combine them
      }
    });

    // Fetch all active users in tenant
    const users = await prisma.user.findMany({
      where: { tenantId, status: 'Active' }
    });

    // Trigger email for all users
    users.forEach(user => {
      sendNotification({
        userId: user.id,
        tenantId,
        type: 'COMPANY_ANNOUNCEMENT',
        data: {
          title,
          messageContent: message
        }
      });
    });

    res.status(201).json({ message: 'Announcement sent successfully', announcement });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getAnnouncements = async (req, res) => {
  try {
    const announcements = await prisma.announcement.findMany({
      where: { tenantId: req.user.tenantId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(announcements);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createAnnouncement,
  getAnnouncements
};
