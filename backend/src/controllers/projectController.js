const prisma = require('../config/db');

// --- Project Management ---

const getProjects = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const projects = await prisma.project.findMany({
      where: { tenantId },
      include: {
        _count: {
          select: { timesheets: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(projects);
  } catch (error) {
    console.error('getProjects error:', error);
    res.status(500).json({ error: error.message });
  }
};

const createProject = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { name, description, status, startDate, endDate, budget } = req.body;
    const project = await prisma.project.create({
      data: {
        tenantId,
        name,
        description,
        status: status || 'Active',
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        budget: budget ? parseFloat(budget) : null
      }
    });
    res.status(201).json(project);
  } catch (error) {
    console.error('createProject error:', error);
    res.status(500).json({ error: error.message });
  }
};

// --- Timesheet Management ---

const getTimesheets = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { projectId, userId, startDate, endDate } = req.query;

    let whereClause = { tenantId };
    if (projectId) whereClause.projectId = projectId;
    
    // If not admin/manager (L2 or below), restrict to their own timesheets
    if (req.user.roleDefinition?.level > 2) {
      whereClause.userId = req.user._id || req.user.id;
    } else if (userId) {
      whereClause.userId = userId;
    }

    if (startDate && endDate) {
      whereClause.date = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    const timesheets = await prisma.timesheetEntry.findMany({
      where: whereClause,
      include: {
        project: { select: { name: true } },
        user: { select: { displayName: true } }
      },
      orderBy: { date: 'desc' }
    });
    res.json(timesheets);
  } catch (error) {
    console.error('getTimesheets error:', error);
    res.status(500).json({ error: error.message });
  }
};

const createTimesheet = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const userId = req.user._id || req.user.id;
    const { projectId, date, hours, description, isBillable } = req.body;

    const entry = await prisma.timesheetEntry.create({
      data: {
        tenantId,
        userId,
        projectId,
        date: new Date(date),
        hours: parseFloat(hours),
        description,
        isBillable: isBillable !== undefined ? isBillable : true
      },
      include: {
        project: { select: { name: true } }
      }
    });
    res.status(201).json(entry);
  } catch (error) {
    console.error('createTimesheet error:', error);
    res.status(500).json({ error: error.message });
  }
};

const updateTimesheetStatus = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;
    const { status } = req.body;

    // Only allow managers/admins to approve (redundant with authorize(2) route middleware, but safe)
    if (req.user.roleDefinition?.level > 2) {
      return res.status(403).json({ error: 'Unauthorized to update status' });
    }

    const updated = await prisma.timesheetEntry.update({
      where: { id, tenantId },
      data: { status }
    });
    res.json(updated);
  } catch (error) {
    console.error('updateTimesheetStatus error:', error);
    res.status(500).json({ error: error.message });
  }
};

const getProjectAnalytics = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;
    
    const timesheets = await prisma.timesheetEntry.findMany({
      where: { tenantId, projectId: id }
    });
    
    const totalHours = timesheets.reduce((sum, ts) => sum + ts.hours, 0);
    const billableHours = timesheets.filter(ts => ts.isBillable).reduce((sum, ts) => sum + ts.hours, 0);
    
    res.json({ totalHours, billableHours, entries: timesheets.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getProjects,
  createProject,
  getTimesheets,
  createTimesheet,
  updateTimesheetStatus,
  getProjectAnalytics
};
