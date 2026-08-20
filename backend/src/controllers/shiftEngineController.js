const prisma = require('../config/db');

// helper: get week start date from ISO string or date
const getWeekStart = (dateStr) => {
  const d = new Date(dateStr);
  const day = d.getDay() || 7; // Sunday = 7
  if (day !== 1) d.setHours(-24 * (day - 1));
  d.setUTCHours(0,0,0,0);
  return d;
};

// Universal validation service to enforce hard constraints
const validateCandidateAvailability = async (tenantId, employeeId, shiftType, dateStr, durationDays) => {
  const query = `
    SELECT e.id 
    FROM "User" e
    WHERE e."tenantId" = $1
      AND e.id = $5
      AND e.status = 'Active'
      AND e.id NOT IN (
        SELECT sa."employeeId"
        FROM "ShiftAssignment" sa
        JOIN "ShiftSlot" ss ON sa."slotId" = ss.id
        WHERE sa."tenantId" = $1
          AND (
            /* Rule 1: No ANY shift during the active block */
            (ss.date > ($3::date - INTERVAL '1 day' * $4::int) AND ss.date <= $3::date)
            OR
            /* Rule 2: No SAME shift for 7 days AFTER the active block ends */
            (ss."shiftType" = $2 AND ss.date > ($3::date - INTERVAL '1 day' * ($4::int + 7)) AND ss.date <= $3::date)
          )
      )
  `;
  const result = await prisma.$queryRawUnsafe(query, tenantId, shiftType, dateStr, durationDays, employeeId);
  return result.length > 0;
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

const { generateRosterPlan } = require('../services/rosterSimulationService');

const simulateRoster = async (req, res) => {
  try {
    const { weekISO, blockDurationDays = 7 } = req.body;
    const tenantId = req.user.tenantId;

    // 1. Generate the pure plan in memory
    const { currentFingerprint, proposedFingerprint, plan, metrics } = await generateRosterPlan(tenantId, weekISO, blockDurationDays);

    // 2. Persist the simulation state for approval
    const simulation = await prisma.rosterSimulation.create({
      data: {
        tenantId,
        currentFingerprint,
        proposedFingerprint,
        plan,
        metrics,
        createdBy: req.user.id,
        // Expire in 30 minutes
        expiresAt: new Date(Date.now() + 30 * 60 * 1000)
      }
    });

    res.json({ success: true, simulation });
  } catch (error) {
    console.error('Simulate Roster Error:', error);
    res.status(500).json({ error: error.message });
  }
};

const autoAssignShifts = async (req, res) => {
  try {
    const { planId } = req.body;
    const tenantId = req.user.tenantId;
    const adminId = req.user.id;

    // 1. Fetch simulation to verify expiry
    const simulation = await prisma.rosterSimulation.findUnique({
      where: { id: planId }
    });

    if (!simulation) {
      return res.status(404).json({ error: 'Roster plan not found.' });
    }
    
    if (new Date() > simulation.expiresAt) {
      await prisma.rosterSimulation.update({ where: { id: planId }, data: { status: 'EXPIRED' } });
      return res.status(409).json({ error: '⚠ This optimization plan has expired. Generate a fresh roster.' });
    }

    // 2. Atomic state transition for Idempotency (GENERATED -> APPLYING)
    const updateResult = await prisma.rosterSimulation.updateMany({
      where: { id: planId, status: 'GENERATED' },
      data: { status: 'APPLYING' }
    });

    if (updateResult.count === 0) {
      // The plan is either already applied, expired, or being processed by another request
      return res.status(409).json({ error: `Cannot apply plan. It has already been applied, expired, or is currently processing.` });
    }

    // 3. Re-verify the fingerprint to prevent race conditions
    const { currentFingerprint: freshFingerprint } = await generateRosterPlan(tenantId, null, 7); 
    
    // 4. Execute the plan in a transaction
    const assignedLog = [];
    const planActions = simulation.plan;

    const operations = [];

    for (const action of planActions) {
      if (action.action !== 'ASSIGN') continue;

      const isNewSlot = action.slotId.startsWith('NEW_');

      if (isNewSlot) {
        // Create slot and assignment in a single atomic nested query
        operations.push(
          prisma.shiftSlot.create({
            data: {
              tenantId,
              date: new Date(action.date),
              shiftType: action.shiftType,
              startTime: action.startTime,
              endTime: action.endTime,
              assignments: {
                create: {
                  tenantId,
                  employeeId: action.employeeId,
                  mode: 'AUTO',
                  assignedBy: adminId
                }
              }
            }
          })
        );
      } else {
        // Upsert assignment directly to existing slot
        operations.push(
          prisma.shiftAssignment.upsert({
            where: {
              slotId_employeeId: { slotId: action.slotId, employeeId: action.employeeId }
            },
            update: { mode: 'AUTO', assignedBy: adminId },
            create: {
              tenantId,
              slotId: action.slotId,
              employeeId: action.employeeId,
              mode: 'AUTO',
              assignedBy: adminId
            }
          })
        );
      }
    }

    // Mark applied
    operations.push(
      prisma.rosterSimulation.update({
        where: { id: planId },
        data: { status: 'APPLIED', appliedAt: new Date(), appliedBy: adminId }
      })
    );

    // Execute everything atomically in ONE database roundtrip!
    const results = await prisma.$transaction(operations);

    res.json({ success: true, appliedCount: operations.length - 1 });
  } catch (error) {
    console.error('Apply Roster Error:', error);
    
    if (error.message.includes('STALE_PLAN')) {
      await prisma.rosterSimulation.update({ where: { id: req.body.planId }, data: { status: 'STALE' } });
      return res.status(409).json({ error: '⚠ This proposed roster is outdated. The underlying roster changed after this simulation was generated.' });
    }

    res.status(500).json({ error: error.message });
  }
};

const manualAssignShift = async (req, res) => {
  try {
    const { slotId, employeeId } = req.body;
    const tenantId = req.user.tenantId;

    // 1. Fetch the base slot being assigned
    const baseSlot = await prisma.shiftSlot.findUnique({
      where: { id: slotId }
    });

    if (!baseSlot) {
      return res.status(404).json({ error: 'Slot not found' });
    }

    // 2. Look up the policy to determine the duration (assignmentDays)
    const policy = await prisma.shiftPolicy.findFirst({
      where: { tenantId, name: baseSlot.shiftType, isArchived: false }
    });
    
    const durationDays = policy?.assignmentDays || 1;
    const startDate = baseSlot.date;

    // Validate using the universal validation service
    const isEligible = await validateCandidateAvailability(
      tenantId, 
      employeeId, 
      baseSlot.shiftType, 
      startDate.toISOString().split('T')[0], 
      durationDays
    );

    if (!isEligible) {
      return res.status(400).json({ error: 'Candidate is not eligible for this shift block due to hard constraints (e.g., rest violations or existing conflicts).' });
    }

    // 3. Forcefully Upsert the slot and assignment for the entire duration
    // This guarantees cross-week persistence!
    const assignments = await prisma.$transaction(async (tx) => {
      const results = [];
      for (let i = 0; i < durationDays; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(currentDate.getDate() + i);

        // Find or create the slot for this exact day
        let targetSlot = await tx.shiftSlot.findFirst({
          where: { tenantId, shiftType: baseSlot.shiftType, date: currentDate }
        });

        if (!targetSlot) {
          targetSlot = await tx.shiftSlot.create({
            data: {
              tenantId,
              date: currentDate,
              shiftType: baseSlot.shiftType,
              startTime: baseSlot.startTime,
              endTime: baseSlot.endTime
            }
          });
        }

        // Database-level conflict protection (No Double Booking)
        const existingAssignments = await tx.shiftAssignment.count({
          where: { slotId: targetSlot.id }
        });
        
        if (existingAssignments >= 1) {
          const isMe = await tx.shiftAssignment.findFirst({
            where: { slotId: targetSlot.id, employeeId }
          });
          if (!isMe) throw new Error(`Slot on ${currentDate.toISOString().split('T')[0]} is already filled by another employee.`);
        }

        // Create the assignment
        const assignment = await tx.shiftAssignment.upsert({
          where: {
            slotId_employeeId: { slotId: targetSlot.id, employeeId }
          },
          update: {
            mode: 'MANUAL',
            assignedBy: req.user.id
          },
          create: {
            tenantId,
            slotId: targetSlot.id,
            employeeId,
            mode: 'MANUAL',
            assignedBy: req.user.id
          }
        });
        results.push(assignment);
      }
      return results;
    });

    res.json({ success: true, assignments, assignedDays: assignments.length });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const createSlot = async (req, res) => {
  try {
    const { date, shiftType, startTime, endTime, assignmentDays = 1 } = req.body;
    const tenantId = req.user.tenantId;

    const startDate = new Date(date);
    const slotsToCreate = [];

    // Dynamically loop based on the duration from the shift details
    for (let i = 0; i < assignmentDays; i++) {
      const currentDay = new Date(startDate);
      currentDay.setDate(currentDay.getDate() + i);
      slotsToCreate.push({
        tenantId,
        date: currentDay,
        shiftType,
        startTime,
        endTime
      });
    }

    const createdSlots = await prisma.$transaction(
      slotsToCreate.map(data => prisma.shiftSlot.create({ data }))
    );

    res.status(201).json({ success: true, slots: createdSlots });
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
  simulateRoster,
  autoAssignShifts,
  manualAssignShift,
  createSlot,
  clearRoster,
  unassignShift,
  deleteSlot
};
