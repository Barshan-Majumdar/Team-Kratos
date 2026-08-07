const prisma = require('../config/db');
const { z } = require('zod');
const { isManagerOf, getSubordinateIds } = require('../utils/managerHierarchy');
const { sendNotification } = require('../utils/notificationEngine');

const createPolicySchema = z.object({
  name: z.string().min(2, "Policy name is required"),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid start time format (HH:MM)"),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid end time format (HH:MM)"),
  gracePeriodMinutes: z.number().min(0).optional().default(15),
  breakDurationMinutes: z.number().min(0).optional().default(60),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color format").optional().default('#6366f1')
});

/**
 * Universal UTC Date Parser — prevents server/browser timezone drift
 */
const parseUtcDate = (dateStr, endOfDay = false) => {
  const cleanStr = String(dateStr).split('T')[0];
  const [y, m, d] = cleanStr.split('-').map(Number);
  if (endOfDay) {
    return new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
  }
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
};

/**
 * GET /api/shifts/policies — List all active (non-archived) shift policies for tenant
 */
const getPolicies = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const policies = await prisma.shiftPolicy.findMany({
      where: { tenantId, isArchived: false },
      orderBy: { createdAt: 'desc' }
    });
    res.json(policies);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * POST /api/shifts/policies — Create a new shift policy template (Admin Level ≤ 1)
 */
const createPolicy = async (req, res) => {
  try {
    const data = createPolicySchema.parse(req.body);
    const tenantId = req.user.tenantId;

    const policy = await prisma.shiftPolicy.create({
      data: {
        ...data,
        tenantId
      }
    });

    res.status(201).json(policy);
  } catch (error) {
    if (error.name === 'ZodError') return res.status(400).json({ error: error.errors });
    res.status(500).json({ error: error.message });
  }
};

/**
 * PUT /api/shifts/policies/:id — Update shift policy (Admin Level ≤ 1)
 */
const updatePolicy = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;
    const data = createPolicySchema.parse(req.body);

    const existing = await prisma.shiftPolicy.findUnique({ where: { id } });
    if (!existing || existing.tenantId !== tenantId) {
      return res.status(404).json({ error: 'Shift policy not found' });
    }

    const updated = await prisma.shiftPolicy.update({
      where: { id },
      data
    });

    res.json(updated);
  } catch (error) {
    if (error.name === 'ZodError') return res.status(400).json({ error: error.errors });
    res.status(500).json({ error: error.message });
  }
};

/**
 * DELETE /api/shifts/policies/:id — Soft-delete / archive shift policy (Admin Level ≤ 1)
 */
const archivePolicy = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    const existing = await prisma.shiftPolicy.findUnique({ where: { id } });
    if (!existing || existing.tenantId !== tenantId) {
      return res.status(404).json({ error: 'Shift policy not found' });
    }

    const archived = await prisma.shiftPolicy.update({
      where: { id },
      data: { isArchived: true }
    });

    res.json({ message: 'Shift policy archived successfully', policy: archived });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/shifts/roster — Query roster matrix for date range
 * Parameters: startDate (YYYY-MM-DD), endDate (YYYY-MM-DD), scope (team|all)
 */
const getRoster = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { startDate, endDate, scope } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate query parameters are required' });
    }

    const start = parseUtcDate(startDate, false);
    const end = parseUtcDate(endDate, true);

    const userLevel = req.user.roleDefinition?.level ?? 3;
    let userWhere = { tenantId, status: 'Active' };

    // Scope filter for Level 2 Managers or Level 3 Employees
    if (scope === 'team' && userLevel === 2) {
      const teamIds = await getSubordinateIds(req.user.id, tenantId);
      userWhere.id = { in: teamIds };
    } else if (scope === 'team' && userLevel >= 3) {
      userWhere.id = req.user.id;
    }

    const rosters = await prisma.shiftRoster.findMany({
      where: {
        tenantId,
        date: { gte: start, lte: end },
        user: userWhere
      },
      include: {
        shiftPolicy: true,
        user: { select: { id: true, displayName: true, department: true, jobPosition: true, avatar: true, shiftPolicyId: true } }
      },
      orderBy: { date: 'asc' }
    });

    res.json(rosters);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * POST /api/shifts/roster/assign — Transactional bulk roster assignment
 * Body: { assignments: [{ userId, date, shiftPolicyId, notes }] }
 * Note: shiftPolicyId === null represents explicit "Off" (rest day)
 */
const assignRoster = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { assignments } = req.body;

    if (!Array.isArray(assignments) || assignments.length === 0) {
      return res.status(400).json({ error: 'assignments array is required' });
    }

    const isAdmin = req.user.roleDefinition && req.user.roleDefinition.level <= 1;
    const todayStr = new Date().toISOString().split('T')[0];
    const startOfToday = new Date(todayStr);

    // 1. Manager Subordinate Scope Guard (Admin bypasses)
    let subordinateIds = [];
    if (!isAdmin) {
      subordinateIds = await getSubordinateIds(req.user.id, tenantId);
    }

    for (const item of assignments) {
      if (!item.userId || !item.date) {
        return res.status(400).json({ error: 'Each assignment must specify userId and date' });
      }

      const itemDate = new Date(item.date);

      // Past-Date Lock Check
      if (itemDate < startOfToday) {
        if (!isAdmin) {
          return res.status(400).json({ error: 'Managers cannot modify shift roster for past dates' });
        }
      }

      // Subordinate Scope Guard
      if (!isAdmin) {
        const isSelf = item.userId === req.user.id;
        const isSubordinate = subordinateIds.includes(item.userId);
        if (!isSelf && !isSubordinate) {
          return res.status(403).json({ error: 'Forbidden: You can only assign shifts to your team members' });
        }
      }

      // Cross-Tenant & Archived Policy Guard (if shiftPolicyId is provided)
      if (item.shiftPolicyId) {
        const policy = await prisma.shiftPolicy.findUnique({ where: { id: item.shiftPolicyId } });
        if (!policy || policy.tenantId !== tenantId) {
          return res.status(403).json({ error: 'Forbidden: Access denied to shift policy outside your tenant' });
        }
        if (policy.isArchived) {
          return res.status(400).json({ error: `Cannot assign archived shift policy "${policy.name}"` });
        }
      }
    }

    // 2. Transactional Execution
    const results = await prisma.$transaction(async (tx) => {
      const upserted = [];

      for (const item of assignments) {
        const dateObj = parseUtcDate(item.date, false);

        // Audit Log for Admin past-date modification
        if (isAdmin && dateObj < startOfToday) {
          await tx.auditLog.create({
            data: {
              tenantId,
              actorId: req.user.id,
              action: 'PAST_ROSTER_MODIFIED',
              targetId: item.userId,
              details: { date: item.date, shiftPolicyId: item.shiftPolicyId }
            }
          });
        }

        const entry = await tx.shiftRoster.upsert({
          where: {
            tenantId_userId_date: {
              tenantId,
              userId: item.userId,
              date: dateObj
            }
          },
          update: {
            shiftPolicyId: item.shiftPolicyId || null,
            notes: item.notes || null
          },
          create: {
            tenantId,
            userId: item.userId,
            shiftPolicyId: item.shiftPolicyId || null,
            date: dateObj,
            notes: item.notes || null
          },
          include: {
            shiftPolicy: true
          }
        });
        upserted.push(entry);
      }
      return upserted;
    });

    // 3. Dispatch Notifications & Real-Time Socket.io Event to assigned users
    results.forEach(entry => {
      if (entry.userId) {
        const shiftName = entry.shiftPolicy ? entry.shiftPolicy.name : 'Off (Rest Day)';
        const dateStr = entry.date ? new Date(entry.date).toISOString().split('T')[0] : '';
        sendNotification({
          userId: entry.userId,
          tenantId,
          type: 'SHIFT_ASSIGNED',
          data: {
            shiftName,
            date: dateStr,
            startTime: entry.shiftPolicy ? entry.shiftPolicy.startTime : 'N/A',
            endTime: entry.shiftPolicy ? entry.shiftPolicy.endTime : 'N/A'
          }
        });
      }
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`tenant:${tenantId}`).emit('shift:updated', { count: results.length });
    }

    res.json({ message: 'Roster assignments updated successfully', assignments: results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * DELETE /api/shifts/roster/entry — Remove date-specific roster override
 * Query: userId, date
 */
const deleteRosterEntry = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { userId, date } = req.query;

    if (!userId || !date) {
      return res.status(400).json({ error: 'userId and date query parameters are required' });
    }

    const isAdmin = req.user.roleDefinition && req.user.roleDefinition.level <= 1;
    const dateObj = parseUtcDate(date, false);

    const todayStr = new Date().toISOString().split('T')[0];
    const startOfToday = new Date(todayStr);

    if (dateObj < startOfToday && !isAdmin) {
      return res.status(400).json({ error: 'Managers cannot modify shift roster for past dates' });
    }

    if (!isAdmin) {
      const subordinateIds = await getSubordinateIds(req.user.id, tenantId);
      if (userId !== req.user.id && !subordinateIds.includes(userId)) {
        return res.status(403).json({ error: 'Forbidden: You can only manage shifts for your team members' });
      }
    }

    if (isAdmin && dateObj < startOfToday) {
      await prisma.auditLog.create({
        data: {
          tenantId,
          actorId: req.user.id,
          action: 'PAST_ROSTER_DELETED',
          targetId: userId,
          details: { date }
        }
      });
    }

    await prisma.shiftRoster.deleteMany({
      where: {
        tenantId,
        userId,
        date: dateObj
      }
    });

    res.json({ message: 'Roster override removed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * POST /api/shifts/roster/assign-default — Set employee's fallback shift (User.shiftPolicyId)
 * Body: { userId, shiftPolicyId }
 */
const assignDefaultShift = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { userId, shiftPolicyId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const isAdmin = req.user.roleDefinition && req.user.roleDefinition.level <= 1;
    if (!isAdmin) {
      const subordinateIds = await getSubordinateIds(req.user.id, tenantId);
      if (userId !== req.user.id && !subordinateIds.includes(userId)) {
        return res.status(403).json({ error: 'Forbidden: You can only assign default shifts to your team members' });
      }
    }

    let policyInfo = null;
    if (shiftPolicyId) {
      policyInfo = await prisma.shiftPolicy.findUnique({ where: { id: shiftPolicyId } });
      if (!policyInfo || policyInfo.tenantId !== tenantId) {
        return res.status(403).json({ error: 'Forbidden: Access denied to shift policy outside your tenant' });
      }
      if (policyInfo.isArchived) {
        return res.status(400).json({ error: `Cannot assign archived shift policy "${policyInfo.name}" as default` });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { shiftPolicyId: shiftPolicyId || null },
      select: { id: true, displayName: true, shiftPolicyId: true }
    });

    sendNotification({
      userId,
      tenantId,
      type: 'SHIFT_ASSIGNED',
      data: {
        shiftName: policyInfo ? `${policyInfo.name} (Default)` : 'Unassigned Default Shift',
        date: 'Regular Schedule',
        startTime: policyInfo ? policyInfo.startTime : 'N/A',
        endTime: policyInfo ? policyInfo.endTime : 'N/A'
      }
    });

    res.json({ message: 'Default shift policy updated', user: updatedUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getPolicies,
  createPolicy,
  updatePolicy,
  archivePolicy,
  getRoster,
  assignRoster,
  deleteRosterEntry,
  assignDefaultShift
};
