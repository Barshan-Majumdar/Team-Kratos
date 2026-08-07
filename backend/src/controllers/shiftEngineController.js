const prisma = require('../config/db');

// helper: get week start date from ISO string or date
const getWeekStart = (dateStr) => {
  const d = new Date(dateStr);
  const day = d.getDay() || 7; // Sunday = 7
  if (day !== 1) d.setHours(-24 * (day - 1));
  d.setUTCHours(0,0,0,0);
  return d;
};

const getWeeklyRoster = async (req, res) => {
  try {
    const { weekISO } = req.query;
    const tenantId = req.user.tenantId;

    const startDate = weekISO ? getWeekStart(weekISO) : getWeekStart(new Date());
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);

    const employees = await prisma.user.findMany({
      where: { tenantId, status: 'Active' },
      select: { id: true, displayName: true, department: true }
    });

    const slots = await prisma.shiftSlot.findMany({
      where: {
        tenantId,
        date: { gte: startDate, lte: endDate }
      },
      include: {
        assignments: {
          include: { employee: { select: { id: true, displayName: true } } }
        }
      },
      orderBy: [{ date: 'asc' }, { shiftType: 'asc' }]
    });

    res.json({ employees, slots, startDate, endDate });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const autoAssignShifts = async (req, res) => {
  try {
    const { weekISO } = req.body;
    const tenantId = req.user.tenantId;
    const adminId = req.user.id;

    const startDate = weekISO ? getWeekStart(weekISO) : getWeekStart(new Date());
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);

    // Get all empty slots in the week
    const slots = await prisma.shiftSlot.findMany({
      where: {
        tenantId,
        date: { gte: startDate, lte: endDate }
      },
      include: { assignments: true },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }]
    });

    const emptySlots = slots.filter(s => s.assignments.length === 0);
    const assignedLog = [];
    const unresolvableSlots = [];

    for (const slot of emptySlots) {
      // Execute the exact user requested query: find candidates that haven't worked this shift type in the last 7 rolling days.
      // We pass the slot's date to calculate the 7 days window prior to that date to be perfectly accurate for the slot's time.
      const query = `
        SELECT e.id 
        FROM "User" e
        WHERE e."tenantId" = $1
          AND e.status = 'Active'
          AND e.id NOT IN (
            SELECT sa."employeeId"
            FROM "ShiftAssignment" sa
            JOIN "ShiftSlot" ss ON sa."slotId" = ss.id
            WHERE ss."shiftType" = $2
              AND ss.date >= ($3::date - INTERVAL '7 days')
              AND ss.date <= $3::date
              AND sa."tenantId" = $1
          )
        ORDER BY RANDOM()
      `;

      // Postgres requires parameter typing or string passing
      const candidates = await prisma.$queryRawUnsafe(
        query, 
        tenantId, 
        slot.shiftType, 
        slot.date.toISOString().split('T')[0], // The slot's date for 7-day backward check
        startDate.toISOString().split('T')[0], // Week start for load-balancing count
        endDate.toISOString().split('T')[0]    // Week end
      );

      if (candidates.length === 0) {
        unresolvableSlots.push(slot.id);
        continue;
      }

      const picked = candidates[0]; // Ordered by RANDOM()

      const assignment = await prisma.shiftAssignment.create({
        data: {
          tenantId,
          slotId: slot.id,
          employeeId: picked.id,
          mode: 'AUTO',
          assignedBy: null
        }
      });
      assignedLog.push(assignment);
    }

    res.json({ 
      success: true, 
      assignedCount: assignedLog.length, 
      unresolvableSlots 
    });
  } catch (error) {
    console.error('Auto-Assign Error:', error);
    res.status(500).json({ error: error.message });
  }
};

const manualAssignShift = async (req, res) => {
  try {
    const { slotId, employeeId } = req.body;
    const tenantId = req.user.tenantId;

    const assignment = await prisma.shiftAssignment.upsert({
      where: {
        slotId_employeeId: { slotId, employeeId }
      },
      update: {
        mode: 'MANUAL',
        assignedBy: req.user.id
      },
      create: {
        tenantId,
        slotId,
        employeeId,
        mode: 'MANUAL',
        assignedBy: req.user.id
      }
    });

    res.json({ success: true, assignment });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createSlot = async (req, res) => {
    try {
      const { date, shiftType, startTime, endTime } = req.body;
      const tenantId = req.user.tenantId;
  
      const slot = await prisma.shiftSlot.create({
        data: {
          tenantId,
          date: new Date(date),
          shiftType,
          startTime,
          endTime
        }
      });
  
      res.status(201).json({ success: true, slot });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

const clearRoster = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    await prisma.shiftAssignment.deleteMany({ where: { tenantId } });
    await prisma.shiftSlot.deleteMany({ where: { tenantId } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const unassignShift = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;
    
    await prisma.shiftAssignment.delete({
      where: { id }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteSlot = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    // Delete assignments for this slot first
    await prisma.shiftAssignment.deleteMany({
      where: { slotId: id }
    });
    
    await prisma.shiftSlot.delete({
      where: { id }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getWeeklyRoster,
  autoAssignShifts,
  manualAssignShift,
  createSlot,
  clearRoster,
  unassignShift,
  deleteSlot
};
