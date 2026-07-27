const prisma = require('../config/db');

const getInbox = async (req, res) => {
  try {
    const userId = req.user.id;
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      return res.json([]);
    }
    const isAdmin = req.user.roleDefinition?.level <= 1 || req.user.customRole === 'SuperAdmin' || req.user.role === 'SuperAdmin';

    let inboxItems = [];

    // Filter out items older than 48 hours
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

    // 1. Leave Requests
    const leavesWhere = isAdmin ? { tenantId, status: 'Pending', createdAt: { gte: fortyEightHoursAgo } } : { tenantId, managerId: userId, status: 'Pending', createdAt: { gte: fortyEightHoursAgo } };
    const leaves = await prisma.leave.findMany({
      where: leavesWhere,
      include: { user: { select: { displayName: true, email: true } } }
    });
    leaves.forEach(l => {
      inboxItems.push({
        id: `leave_${l.id}`,
        type: 'Leave',
        title: `Leave Request: ${l.durationType || 'FullDay'}`,
        description: `${l.user.displayName || 'A user'} requested leave from ${new Date(l.startDate).toISOString().split('T')[0]} to ${new Date(l.endDate).toISOString().split('T')[0]}`,
        createdAt: l.createdAt,
        status: l.status,
        actionUrl: '/dashboard/leave-approvals',
        originalId: l.id
      });
    });

    // 2. Salary Advances
    if (isAdmin) {
      const advances = await prisma.salaryAdvance.findMany({
        where: { tenantId, status: 'Pending', createdAt: { gte: fortyEightHoursAgo } },
        include: { user: { select: { displayName: true } } }
      });
      advances.forEach(a => {
        inboxItems.push({
          id: `advance_${a.id}`,
          type: 'SalaryAdvance',
          title: `Salary Advance: ${a.amount}`,
          description: `${a.user.displayName || 'A user'} requested an advance. Reason: ${a.reason}`,
          createdAt: a.createdAt,
          status: a.status,
          actionUrl: '/dashboard/payroll',
          originalId: a.id
        });
      });
    }

    // 3. Expense Claims
    const expensesWhere = isAdmin ? { tenantId, status: 'Pending', createdAt: { gte: fortyEightHoursAgo } } : { tenantId, managerId: userId, status: 'Pending', createdAt: { gte: fortyEightHoursAgo } };
    const expenses = await prisma.expenseClaim.findMany({
      where: expensesWhere,
      include: { user: { select: { displayName: true } } }
    });
    expenses.forEach(e => {
      inboxItems.push({
        id: `expense_${e.id}`,
        type: 'ExpenseClaim',
        title: `Expense Claim: ${e.amount} ${e.currency || 'USD'}`,
        description: `${e.user.displayName || 'A user'} submitted an expense. Category: ${e.category}`,
        createdAt: e.createdAt,
        status: e.status,
        actionUrl: '/dashboard/expenses',
        originalId: e.id
      });
    });

    // 4. Onboarding Tasks (for the employee)
    const tasks = await prisma.onboardingTask.findMany({
      where: { tenantId, userId: userId, isCompleted: false, createdAt: { gte: fortyEightHoursAgo } },
    });
    tasks.forEach(t => {
      inboxItems.push({
        id: `task_${t.id}`,
        type: 'OnboardingTask',
        title: `Onboarding Task: ${t.title}`,
        description: t.description || 'Please complete this onboarding task.',
        createdAt: t.createdAt,
        status: 'Pending',
        actionUrl: '/dashboard/my-profile',
        originalId: t.id
      });
    });

    // 5. Job Applications (ATS)
    if (isAdmin) {
      const applications = await prisma.application.findMany({
        where: { tenantId, stage: 'Applied', createdAt: { gte: fortyEightHoursAgo } },
        include: {
          candidate: { select: { firstName: true, lastName: true } },
          jobRequisition: { select: { title: true, department: true } }
        }
      });
      applications.forEach(app => {
        inboxItems.push({
          id: `app_${app.id}`,
          type: 'Recruitment',
          title: `New Job Application: ${app.jobRequisition.title}`,
          description: `${app.candidate.firstName} ${app.candidate.lastName} applied for ${app.jobRequisition.title} (${app.jobRequisition.department}).`,
          createdAt: app.createdAt,
          status: 'Pending Review',
          actionUrl: '/dashboard/recruitment',
          originalId: app.id
        });
      });
    }

    // Sort descending by created date
    inboxItems.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(inboxItems);
  } catch (error) {
    console.error('getInbox error:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getInbox
};
