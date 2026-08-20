const prisma = require('../config/db');
const { sendNotification } = require('./../utils/notificationEngine');

class ExecutionError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'ExecutionError';
  }
}

async function executeCreateAnnouncement(tenantId, adminId, payload, io) {
  const { title, category, message } = payload;

  if (!title || !message) {
    throw new ExecutionError('Title and message are required for announcements', 400);
  }

  const validCategories = ['General', 'Policy', 'Event', 'Birthday', 'Urgent'];
  const resolvedCategory = validCategories.includes(category) ? category : 'General';

  const [announcement] = await prisma.basePrisma.$transaction([
    prisma.basePrisma.announcement.create({
      data: {
        tenantId,
        adminId,
        title,
        category: resolvedCategory,
        message
      }
    })
  ]);

  await prisma.auditLog.create({
    data: {
      tenantId,
      actorId: adminId,
      action: 'IRIS_EXECUTE_CREATE_ANNOUNCEMENT',
      targetId: 'announcement',
      details: { title, category: resolvedCategory }
    }
  });

  if (io) {
    io.to(`tenant:${tenantId}`).emit('announcement:new', announcement);
  }

  const users = await prisma.basePrisma.user.findMany({
    where: { tenantId, status: 'Active' },
    select: { id: true }
  });

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

  return announcement;
}

module.exports = {
  executeCreateAnnouncement,
  ExecutionError
};
