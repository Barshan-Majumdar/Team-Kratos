const prisma = require('../config/db');
const crypto = require('crypto');

const generateHash = (userId, surveyId) => {
  const salt = process.env.PULSE_SALT || 'crew_pulse_secret_salt_123';
  return crypto.createHash('sha256').update(`${userId}:${surveyId}:${salt}`).digest('hex');
};

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

    // 1. Prepare queries
    const leavesWhere = isAdmin ? { tenantId, createdAt: { gte: fortyEightHoursAgo } } : { tenantId, managerId: userId, createdAt: { gte: fortyEightHoursAgo } };
    const expensesWhere = isAdmin ? { tenantId, createdAt: { gte: fortyEightHoursAgo } } : { tenantId, approverId: userId, createdAt: { gte: fortyEightHoursAgo } };

    const [leaves, advances, expenses, tasks, applications, pulseSurveys] = await Promise.all([
      prisma.leave.findMany({
        where: leavesWhere,
        include: { user: { select: { displayName: true, email: true } } }
      }),
      isAdmin ? prisma.salaryAdvance.findMany({
        where: { tenantId, createdAt: { gte: fortyEightHoursAgo } },
        include: { user: { select: { displayName: true } } }
      }) : Promise.resolve([]),
      prisma.expenseClaim.findMany({
        where: expensesWhere,
        include: { user: { select: { displayName: true } } }
      }),
      prisma.onboardingTask.findMany({
        where: { tenantId, userId: userId, createdAt: { gte: fortyEightHoursAgo } },
      }),
      isAdmin ? prisma.application.findMany({
        where: { tenantId, createdAt: { gte: fortyEightHoursAgo } },
        include: {
          candidate: { select: { firstName: true, lastName: true } },
          jobRequisition: { select: { title: true, department: true } }
        }
      }) : Promise.resolve([]),
      prisma.pulseSurvey.findMany({
        where: { tenantId, isActive: true }
      })
    ]);

    // 2. Process Results
    leaves.forEach(l => {
      inboxItems.push({
        id: `leave_${l.id}`,
        type: 'Leave',
        title: `Leave Request: ${l.durationType || 'FullDay'}`,
        description: `${l.user?.displayName || 'A user'} requested leave from ${new Date(l.startDate).toISOString().split('T')[0]} to ${new Date(l.endDate).toISOString().split('T')[0]}`,
        createdAt: l.createdAt,
        status: l.status,
        actionUrl: '/dashboard/leave-approvals',
        originalId: l.id
      });
    });

    advances.forEach(a => {
      inboxItems.push({
        id: `advance_${a.id}`,
        type: 'SalaryAdvance',
        title: `Salary Advance: ${a.amount}`,
        description: `${a.user?.displayName || 'A user'} requested an advance. Reason: ${a.reason}`,
        createdAt: a.createdAt,
        status: a.status,
        actionUrl: '/dashboard/salary-advance',
        originalId: a.id
      });
    });

    expenses.forEach(e => {
      inboxItems.push({
        id: `expense_${e.id}`,
        type: 'ExpenseClaim',
        title: `Expense Claim: ${e.amount} ${e.currency || 'USD'}`,
        description: `${e.user?.displayName || 'A user'} submitted an expense. Category: ${e.category}`,
        createdAt: e.createdAt,
        status: e.status,
        actionUrl: '/dashboard/expenses',
        originalId: e.id
      });
    });

    tasks.forEach(t => {
      inboxItems.push({
        id: `task_${t.id}`,
        type: 'OnboardingTask',
        title: `Onboarding Task: ${t.title}`,
        description: t.description || 'Please complete this onboarding task.',
        createdAt: t.createdAt,
        status: t.isCompleted ? 'Completed' : 'Pending',
        actionUrl: '/dashboard/my-profile',
        originalId: t.id
      });
    });

    applications.forEach(app => {
      inboxItems.push({
        id: `app_${app.id}`,
        type: 'Recruitment',
        title: `New Job Application: ${app.jobRequisition?.title}`,
        description: `${app.candidate?.firstName} ${app.candidate?.lastName} applied for ${app.jobRequisition?.title} (${app.jobRequisition?.department}).`,
        createdAt: app.createdAt,
        status: app.stage || 'Applied',
        actionUrl: '/dashboard/recruitment',
        originalId: app.id
      });
    });

    for (const s of pulseSurveys) {
      const hash = generateHash(userId, s.id);
      const hasResponded = await prisma.pulseResponse.findUnique({
        where: { surveyId_respondentHash: { surveyId: s.id, respondentHash: hash } }
      });
      if (!hasResponded) {
        inboxItems.push({
          id: `pulse_${s.id}`,
          type: 'PulseSurvey',
          title: `Pulse Check: ${s.title}`,
          description: 'A new anonymous pulse survey requires your feedback.',
          createdAt: s.createdAt,
          status: 'Pending',
          actionUrl: '/dashboard/pulse',
          originalId: s.id
        });
      }
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
