const prisma = require('../config/db');

const getShiftPolicies = async (req, res) => {
  try {
    const policies = await prisma.shiftPolicy.findMany({
      where: { tenantId: req.user.tenantId }
    });
    res.json(policies);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createShiftPolicy = async (req, res) => {
  try {
    const { name, startTime, endTime, graceMinutes, overtimeRateMultiplier, lateDeductionPerMinute, minOvertimeMinutes } = req.body;
    
    const policy = await prisma.shiftPolicy.create({
      data: {
        tenantId: req.user.tenantId,
        name,
        startTime,
        endTime,
        graceMinutes: graceMinutes !== undefined ? parseInt(graceMinutes) : 15,
        overtimeRateMultiplier: overtimeRateMultiplier !== undefined ? parseFloat(overtimeRateMultiplier) : 1.5,
        lateDeductionPerMinute: lateDeductionPerMinute !== undefined ? parseFloat(lateDeductionPerMinute) : 0,
        minOvertimeMinutes: minOvertimeMinutes !== undefined ? parseInt(minOvertimeMinutes) : 30
      }
    });

    res.json(policy);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateShiftPolicy = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, startTime, endTime, graceMinutes, overtimeRateMultiplier, lateDeductionPerMinute, minOvertimeMinutes } = req.body;

    const policy = await prisma.shiftPolicy.update({
      where: { id, tenantId: req.user.tenantId },
      data: {
        name,
        startTime,
        endTime,
        graceMinutes: graceMinutes !== undefined ? parseInt(graceMinutes) : undefined,
        overtimeRateMultiplier: overtimeRateMultiplier !== undefined ? parseFloat(overtimeRateMultiplier) : undefined,
        lateDeductionPerMinute: lateDeductionPerMinute !== undefined ? parseFloat(lateDeductionPerMinute) : undefined,
        minOvertimeMinutes: minOvertimeMinutes !== undefined ? parseInt(minOvertimeMinutes) : undefined
      }
    });

    res.json(policy);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteShiftPolicy = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate that no active users are assigned to this shift policy
    const userCount = await prisma.user.count({
      where: { shiftPolicyId: id, tenantId: req.user.tenantId }
    });

    if (userCount > 0) {
      return res.status(400).json({ error: 'Cannot delete shift policy because it is currently assigned to users.' });
    }

    await prisma.shiftPolicy.delete({
      where: { id, tenantId: req.user.tenantId }
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getShiftPolicies,
  createShiftPolicy,
  updateShiftPolicy,
  deleteShiftPolicy
};
