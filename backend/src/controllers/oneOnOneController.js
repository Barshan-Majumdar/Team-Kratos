const prisma = require('../config/db');
const { sendNotification } = require('../utils/notificationEngine');

const getOneOnOnes = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const userId = req.user._id || req.user.id;
    const isManager = req.user.roleDefinition?.level <= 2;

    let whereClause = { tenantId };

    // Managers see meetings where they are the manager. 
    // Employees see meetings where they are the employee.
    // If Admin, they could potentially see all, but let's restrict to meetings they are involved in for privacy, unless specified.
    if (!isManager || req.user.role !== 'Admin') {
      whereClause.OR = [
        { employeeId: userId },
        { managerId: userId }
      ];
    }

    const meetings = await prisma.oneOnOne.findMany({
      where: whereClause,
      include: {
        employee: { select: { id: true, displayName: true, email: true } },
        manager: { select: { id: true, displayName: true, email: true } }
      },
      orderBy: { date: 'desc' }
    });

    res.json(meetings);
  } catch (error) {
    console.error('getOneOnOnes error:', error);
    res.status(500).json({ error: error.message });
  }
};

const createOneOnOne = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const managerId = req.user._id || req.user.id;
    const { employeeId, date, talkingPoints, notes, actionItems } = req.body;

    if (managerId === employeeId) {
      return res.status(400).json({ error: 'You cannot schedule a 1:1 meeting with yourself.' });
    }

    const meeting = await prisma.oneOnOne.create({
      data: {
        tenantId,
        managerId,
        employeeId,
        date: new Date(date),
        talkingPoints: talkingPoints || [],
        notes: notes || '',
        actionItems: actionItems || []
      },
      include: {
        employee: { select: { displayName: true } },
        manager: { select: { displayName: true } }
      }
    });

    // Send Notification
    try {
      await sendNotification({
        userId: employeeId,
        tenantId,
        type: '1ON1_SCHEDULED',
        data: {
          managerName: meeting.manager.displayName || 'Your Manager',
          date: meeting.date
        }
      });
    } catch (notifErr) {
      console.error('Failed to send 1:1 notification:', notifErr);
    }

    res.status(201).json(meeting);
  } catch (error) {
    console.error('createOneOnOne error:', error);
    res.status(500).json({ error: error.message });
  }
};

const updateOneOnOne = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;
    const { date, talkingPoints, notes, actionItems, status } = req.body;

    const updateData = {};
    if (date) updateData.date = new Date(date);
    if (talkingPoints) updateData.talkingPoints = talkingPoints;
    if (notes !== undefined) updateData.notes = notes;
    if (actionItems) updateData.actionItems = actionItems;
    if (status) updateData.status = status;

    const meeting = await prisma.oneOnOne.update({
      where: { id, tenantId },
      data: updateData,
      include: {
        employee: { select: { displayName: true } },
        manager: { select: { displayName: true } }
      }
    });

    res.json(meeting);
  } catch (error) {
    console.error('updateOneOnOne error:', error);
    res.status(500).json({ error: error.message });
  }
};

const deleteOneOnOne = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;

    await prisma.oneOnOne.delete({
      where: { id, tenantId }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('deleteOneOnOne error:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getOneOnOnes,
  createOneOnOne,
  updateOneOnOne,
  deleteOneOnOne
};
