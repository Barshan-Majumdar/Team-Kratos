const prisma = require('../config/db');
const { executeRosterPlan, ExecutionError: ShiftError } = require('../services/shiftExecutionService');
const { executeAddEmployee, ExecutionError: EmployeeError } = require('../services/employeeExecutionService');
const { executeCreateAnnouncement, ExecutionError: AnnouncementError } = require('../services/announcementExecutionService');
const { executeApproveLeave, executeRejectLeave, ExecutionError: LeaveError } = require('../services/leaveExecutionService');

const approveIrisTask = async (req, res) => {
  try {
    const { taskId, proposalFingerprint } = req.body;
    const tenantId = req.user.tenantId;
    const adminId = req.user.id;
    const adminLevel = req.user.roleDefinition?.level ?? 99;
    const adminRoleName = req.user.roleDefinition?.name || req.user.customRole || req.user.role;
    const adminDepartment = req.user.department;

    const task = await prisma.irisTask.findFirst({
      where: { id: taskId, tenantId },
      include: { recommendation: true }
    });

    if (!task) return res.status(404).json({ error: 'Iris Task not found.' });

    // Expiry Check
    if (task.recommendation && new Date(task.recommendation.expiresAt) < new Date()) {
      await prisma.irisTask.update({ where: { id: taskId }, data: { status: 'EXPIRED' } });
      return res.status(400).json({ error: 'This recommendation has expired and is no longer valid.' });
    }
    
    // Stale Plan Protection
    if (task.recommendation.dataFingerprint !== proposalFingerprint) {
      return res.status(409).json({ error: 'Stale recommendation. Data has changed since it was generated.' });
    }

    // Atomic State Transition to prevent Double Approvals and lock execution
    const updateCount = await prisma.irisTask.updateMany({
      where: { id: taskId, tenantId, status: 'AWAITING_APPROVAL' },
      data: { status: 'EXECUTING' }
    });

    if (updateCount.count === 0) {
      return res.status(409).json({ error: 'Task is no longer awaiting approval (it may have been concurrently executed or expired).' });
    }

    // 1. Record the human approval explicitly
    await prisma.irisApproval.create({
      data: {
        tenantId,
        taskId,
        approvedBy: adminId,
        actionType: task.recommendation.actionType,
        proposalFingerprint
      }
    });

    // 3. Delegate to Extracted Business Logic Services
    let resultData = null;

    if (task.recommendation.actionType === 'ROSTER_ADJUSTMENT') {
      const planId = task.recommendation.actionParameters.planId;
      if (!planId) return res.status(400).json({ error: 'Missing planId in Iris Recommendation.' });

      // Only pass department limit if admin is Level 1 or higher (i.e. not CEO)
      const departmentLimit = adminLevel >= 1 ? adminDepartment : null;

      try {
        resultData = await executeRosterPlan(tenantId, adminId, planId, departmentLimit);
      } catch (err) {
        if (err instanceof ShiftError) {
          await prisma.irisTask.update({ where: { id: taskId }, data: { status: 'FAILED' } });
          return res.status(err.statusCode).json({ error: err.message });
        }
        throw err;
      }

    } else if (task.recommendation.actionType === 'ADD_EMPLOYEE') {
      try {
        resultData = await executeAddEmployee(
          tenantId, 
          adminLevel, 
          adminRoleName, 
          adminDepartment, 
          task.recommendation.actionParameters
        );
      } catch (err) {
        if (err instanceof EmployeeError) {
          await prisma.irisTask.update({ where: { id: taskId }, data: { status: 'FAILED' } });
          return res.status(err.statusCode).json({ error: err.message });
        }
        throw err;
      }
    } else if (task.recommendation.actionType === 'CREATE_ANNOUNCEMENT') {
      try {
        resultData = await executeCreateAnnouncement(
          tenantId,
          adminId,
          task.recommendation.actionParameters,
          req.app.get('io')
        );
      } catch (err) {
        if (err instanceof AnnouncementError) {
          await prisma.irisTask.update({ where: { id: taskId }, data: { status: 'FAILED' } });
          return res.status(err.statusCode).json({ error: err.message });
        }
        throw err;
      }
    } else if (task.recommendation.actionType === 'APPROVE_LEAVE') {
      try {
        resultData = await executeApproveLeave(
          tenantId,
          adminId,
          adminLevel,
          task.recommendation.actionParameters
        );
      } catch (err) {
        if (err instanceof LeaveError) {
          await prisma.irisTask.update({ where: { id: taskId }, data: { status: 'FAILED' } });
          return res.status(err.statusCode).json({ error: err.message });
        }
        throw err;
      }
    } else if (task.recommendation.actionType === 'REJECT_LEAVE') {
      try {
        resultData = await executeRejectLeave(
          tenantId,
          adminId,
          adminLevel,
          task.recommendation.actionParameters
        );
      } catch (err) {
        if (err instanceof LeaveError) {
          await prisma.irisTask.update({ where: { id: taskId }, data: { status: 'FAILED' } });
          return res.status(err.statusCode).json({ error: err.message });
        }
        throw err;
      }
    } else {
      return res.status(400).json({ error: 'Unsupported action type.' });
    }

    // 4. Final verification & transition
    await prisma.irisTask.update({
      where: { id: taskId },
      data: { status: 'EXECUTED' }
    });

    // 5. Generate human-readable success message
    let successMessage = 'Action approved and executed successfully.';
    if (task.recommendation.actionType === 'ROSTER_ADJUSTMENT' && resultData) {
      if (resultData.appliedCount === 0) {
        successMessage = 'No assignments made: All eligible employees are maxed on hours or on leave.';
      } else {
        const names = resultData.assignedNames && resultData.assignedNames.length > 0 
          ? `to ${resultData.assignedNames.join(', ')}` 
          : 'to the live database';
        successMessage = `Executed! Assigned ${resultData.appliedCount} shift(s) ${names}.`;
      }
    } else if (task.recommendation.actionType === 'ADD_EMPLOYEE') {
      successMessage = 'Executed! Employee onboarded and synced to the database.';
    } else if (task.recommendation.actionType === 'CREATE_ANNOUNCEMENT') {
      successMessage = 'Executed! Announcement broadcasted company-wide.';
    } else if (task.recommendation.actionType === 'APPROVE_LEAVE' || task.recommendation.actionType === 'REJECT_LEAVE') {
      successMessage = 'Executed! Leave status updated in the database.';
    }

    return res.json({ success: true, message: successMessage, result: resultData });

  } catch (error) {
    console.error('Approve Iris Task Error:', error);
    res.status(500).json({ error: error.message });
  }
};

const getIrisTask = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    const task = await prisma.irisTask.findFirst({
      where: { id, tenantId },
      include: { recommendation: true }
    });

    if (!task) return res.status(404).json({ error: 'Iris Task not found.' });
    
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  approveIrisTask,
  getIrisTask
};
