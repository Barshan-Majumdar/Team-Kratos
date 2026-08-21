const prisma = require('../config/db');
const { 
  createGoalSchema, 
  updateGoalProgressSchema, 
  draftReviewSchema, 
  submitFeedbackSchema 
} = require('../../../packages/shared/validations/performance');
const { isManagerOf } = require('../utils/managerHierarchy');

// Helper to calculate progress
function calculateProgress(metricType, currentValue, targetValue) {
  if (metricType === 'Boolean') {
    return currentValue > 0 ? 100 : 0;
  }
  if (targetValue === 0) return 0;
  return Math.min(100, Math.round((currentValue / targetValue) * 100));
}

// ------------------------------------------------------------------
// GOALS
// ------------------------------------------------------------------

exports.createGoal = async (req, res) => {
  try {
    const data = createGoalSchema.parse(req.body);
    const tenantId = req.user.tenantId;

    // Check if user is upper management (level <= 2)
    const userLevel = req.user.roleDefinition?.level || 3;
    if (userLevel > 2) {
      return res.status(403).json({ error: 'Forbidden: Only managers and admins can set goals' });
    }

    // If Manager (level 2), can only assign to self or subordinates
    if (userLevel === 2 && data.userId !== req.user.id) {
      const isMgr = await isManagerOf(req.user.id, data.userId);
      if (!isMgr) {
        return res.status(403).json({ error: 'Forbidden: You can only assign goals to your team' });
      }
    }

    if (data.parentGoalId) {
      const parent = await prisma.goal.findFirst({ where: { id: data.parentGoalId, tenantId } });
      if (!parent) return res.status(400).json({ error: 'Parent goal not found in this tenant' });
    }

    const goal = await prisma.goal.create({
      data: {
        ...data,
        tenantId
      }
    });

    res.status(201).json(goal);
  } catch (error) {
    if (error.name === 'ZodError') return res.status(400).json({ error: error.errors });
    console.error(error);
    res.status(500).json({ error: 'Server error creating goal', details: error.message });
  }
};

exports.getGoals = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    let whereClause = tenantId ? { tenantId } : {};
    
    const userLevel = req.user.roleDefinition?.level || 3;
    
    // Admins see all goals
    // Managers see their goals + goals assigned to their subordinates
    // Employees see only goals assigned to them
    if (userLevel === 3) {
      whereClause.userId = req.user.id;
    } else if (userLevel === 2) {
      // Find all subordinates
      const teamIds = [];
      const fetchSubordinates = async (managerId, levels = 0) => {
        if (levels >= 5) return;
        const subs = await prisma.user.findMany({ where: { managerId, tenantId }, select: { id: true } });
        for (const sub of subs) {
          teamIds.push(sub.id);
          await fetchSubordinates(sub.id, levels + 1);
        }
      };
      await fetchSubordinates(req.user.id);
      
      whereClause.OR = [
        { userId: req.user.id },
        { userId: { in: teamIds } }
      ];
    }

    const goals = await prisma.goal.findMany({
      where: whereClause,
      include: {
        user: { select: { id: true, displayName: true, avatar: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(goals);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error fetching goals' });
  }
};

exports.updateGoalProgress = async (req, res) => {
  try {
    const { id } = req.params;
    const { currentValue } = updateGoalProgressSchema.parse(req.body);
    const tenantId = req.user.tenantId;

    const goal = await prisma.goal.findFirst({ where: { id, tenantId } });
    if (!goal) return res.status(404).json({ error: 'Goal not found' });
    
    // Only owner, assignee, or higher level manager can update progress
    if (goal.userId !== req.user.id && req.user.roleDefinition?.level > 1) {
       const isMgr = await isManagerOf(req.user.id, goal.userId);
       if (!isMgr) return res.status(403).json({ error: 'Forbidden' });
    }

    const progress = calculateProgress(goal.metricType, currentValue, goal.targetValue);
    
    let status = goal.status;
    if (progress >= 100) status = 'Achieved';
    else if (progress > 0) status = 'InProgress';
    else status = 'NotStarted';

    const updated = await prisma.goal.update({
      where: { id },
      data: { currentValue, progress, status }
    });

    res.json(updated);
  } catch (error) {
    if (error.name === 'ZodError') return res.status(400).json({ error: error.errors });
    console.error(error);
    res.status(500).json({ error: 'Server error updating goal progress' });
  }
};

// ------------------------------------------------------------------
// REVIEWS
// ------------------------------------------------------------------

exports.createOrUpdateReview = async (req, res) => {
  try {
    const data = draftReviewSchema.parse(req.body);
    const tenantId = req.user.tenantId;

    // Check auth
    if (req.user.roleDefinition?.level > 1) {
      const isMgr = await isManagerOf(req.user.id, data.revieweeId);
      if (!isMgr) return res.status(403).json({ error: 'Forbidden: You are not a manager of this employee' });
    }

    // Check for existing review draft
    const existing = await prisma.review.findFirst({
      where: {
        tenantId,
        revieweeId: data.revieweeId,
        cycleName: data.cycleName
      }
    });

    if (existing && (existing.status === 'Published' || existing.status === 'Acknowledged')) {
      return res.status(400).json({ error: `This review is already ${existing.status.toLowerCase()} and immutable` });
    }

    const isPublishing = req.body.publish === true;

    // Calculate overallScore if ratings exist
    let overallScore = null;
    if (data.ratings && Object.keys(data.ratings).length > 0) {
      const vals = Object.values(data.ratings);
      overallScore = vals.reduce((a, b) => a + b, 0) / vals.length;
    }

    if (existing) {
      const updated = await prisma.review.update({
        where: { id: existing.id },
        data: {
          reviewerId: req.user.id,
          ratings: data.ratings || {},
          comments: data.comments || null,
          overallScore,
          status: isPublishing ? 'Published' : 'Draft',
          publishedAt: isPublishing ? new Date() : null
        }
      });
      return res.json(updated);
    }

    const review = await prisma.review.create({
      data: {
        tenantId,
        reviewerId: req.user.id,
        revieweeId: data.revieweeId,
        cycleName: data.cycleName,
        ratings: data.ratings || {},
        comments: data.comments || null,
        overallScore,
        status: isPublishing ? 'Published' : 'Draft',
        publishedAt: isPublishing ? new Date() : null
      }
    });

    res.status(201).json(review);
  } catch (error) {
    if (error.name === 'ZodError') return res.status(400).json({ error: error.errors });
    console.error(error);
    res.status(500).json({ error: 'Server error creating review' });
  }
};

exports.getReviews = async (req, res) => {
  try {
    // Employees see their own published reviews
    // Admins see all
    let whereClause = req.user.tenantId ? { tenantId: req.user.tenantId } : {};
    
    if (req.user.roleDefinition?.level > 1) {
       whereClause = {
         ...whereClause,
         OR: [
           { revieweeId: req.user.id, status: { in: ['Published', 'Acknowledged'] } },
           { reviewerId: req.user.id }
         ]
       };
    }

    const reviews = await prisma.review.findMany({
      where: whereClause,
      include: {
        reviewer: { select: { displayName: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(reviews);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error fetching reviews' });
  }
};

exports.getTeamReviews = async (req, res) => {
  try {
    // Managers see reviews they wrote or need to write for subordinates
    // First, find subordinates
    let teamIds = [];
    // A quick hack for v1: we can find direct reports
    const directReports = await prisma.user.findMany({
      where: { managerId: req.user.id, tenantId: req.user.tenantId },
      select: { id: true }
    });
    teamIds = directReports.map(u => u.id);

    // Skip-level is complex for a simple query, so we fetch direct reports for the dashboard
    // If they need to see skip-levels, they can search by ID in a real app.
    
    const whereClause = {
      revieweeId: { in: teamIds }
    };
    if (req.user.tenantId) whereClause.tenantId = req.user.tenantId;

    const reviews = await prisma.review.findMany({
      where: whereClause,
      include: {
        reviewee: { select: { displayName: true, avatar: true, jobPosition: true } }
      }
    });
    res.json(reviews);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error fetching team reviews' });
  }
};

exports.reopenReview = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    const review = await prisma.review.findFirst({ where: { id, tenantId } });
    if (!review) return res.status(404).json({ error: 'Review not found' });

    if (req.user.roleDefinition?.level > 1 && review.reviewerId !== req.user.id) {
       return res.status(403).json({ error: 'Forbidden' });
    }

    await prisma.$transaction([
      prisma.review.update({ where: { id }, data: { status: 'Draft' } }),
      prisma.auditLog.create({ 
        data: { 
          tenantId, 
          action: 'REVIEW_REOPENED', 
          targetId: id, 
          actorId: req.user.id,
          details: { cycleName: review.cycleName }
        } 
      })
    ]);

    res.json({ message: 'Review reopened successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error reopening review' });
  }
};

exports.acknowledgeReview = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    const review = await prisma.review.findFirst({ where: { id, tenantId } });
    if (!review) return res.status(404).json({ error: 'Review not found' });

    if (review.revieweeId !== req.user.id) {
       return res.status(403).json({ error: 'Forbidden: You can only acknowledge your own review' });
    }

    if (review.status !== 'Published') {
      return res.status(400).json({ error: 'Review must be published to be acknowledged' });
    }

    await prisma.$transaction([
      prisma.review.update({ where: { id }, data: { status: 'Acknowledged' } }),
      prisma.auditLog.create({ 
        data: { 
          tenantId, 
          action: 'REVIEW_ACKNOWLEDGED', 
          targetId: id, 
          actorId: req.user.id,
          details: { cycleName: review.cycleName }
        } 
      })
    ]);

    res.json({ message: 'Review acknowledged successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error acknowledging review' });
  }
};

// ------------------------------------------------------------------
// FEEDBACK 360
// ------------------------------------------------------------------

exports.submitFeedback = async (req, res) => {
  try {
    const data = submitFeedbackSchema.parse(req.body);
    const tenantId = req.user.tenantId;

    if (data.receiverId === req.user.id) {
      return res.status(400).json({ error: 'Self-feedback is not allowed' });
    }

    // Rate Limiting (very basic window limit per cycle/month)
    // Check if providerId (or if anonymous, we don't have it in DB...)
    // Wait, if it's anonymous, providerId is NULL in DB. So we must check if THEY submitted recently
    // BEFORE nulling the ID.
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    // Instead of AuditLog (which hides targetId for anonymous feedback to protect privacy),
    // we query the feedback360 table directly since it securely stores the providerId internally.
    const recentFeedback = await prisma.feedback360.findFirst({
      where: {
        tenantId,
        providerId: req.user.id,
        receiverId: data.receiverId,
        createdAt: { gte: oneMonthAgo }
      }
    });

    if (recentFeedback) {
      return res.status(429).json({ error: 'You have already submitted feedback for this user recently' });
    }

    const feedback = await prisma.$transaction(async (tx) => {
      const fb = await tx.feedback360.create({
        data: {
          tenantId,
          providerId: req.user.id,
          receiverId: data.receiverId,
          content: data.content,
          competencies: data.competencies || null,
          isAnonymous: data.isAnonymous
        }
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          action: 'FEEDBACK_SUBMITTED',
          actorId: req.user.id,
          targetId: data.isAnonymous ? null : data.receiverId,
          details: { isAnonymous: data.isAnonymous }
        }
      });

      return fb;
    });

    res.status(201).json(feedback);
  } catch (error) {
    if (error.name === 'ZodError') return res.status(400).json({ error: error.errors });
    console.error(error);
    res.status(500).json({ error: 'Server error submitting feedback' });
  }
};

exports.getFeedback = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    let whereClause = { status: 'Visible' };
    if (tenantId) whereClause.tenantId = tenantId;

    // Employees only see feedback given to them
    // Admin sees all
    // Managers see feedback given to their team?
    const userLevel = req.user.roleDefinition?.level || 3;
    if (userLevel === 3) {
       whereClause = {
         ...whereClause,
         OR: [
           { receiverId: req.user.id },
           { providerId: req.user.id }
         ]
       };
    } else if (userLevel === 2) {
       const teamIds = [];
       const fetchSubordinates = async (managerId, levels = 0) => {
         if (levels >= 5) return;
         const subs = await prisma.user.findMany({ where: { managerId, tenantId }, select: { id: true } });
         for (const sub of subs) {
           teamIds.push(sub.id);
           await fetchSubordinates(sub.id, levels + 1);
         }
       };
       await fetchSubordinates(req.user.id);

       whereClause = {
         ...whereClause,
         OR: [
           { receiverId: req.user.id },
           { providerId: req.user.id },
           { receiverId: { in: teamIds } }
         ]
       };
    }

    const feedbacks = await prisma.feedback360.findMany({
      where: whereClause,
      include: {
        provider: { select: { id: true, displayName: true, avatar: true } },
        receiver: { select: { id: true, displayName: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const sanitized = feedbacks.map(fb => {
      // If anonymous, hide provider details from everyone EXCEPT the provider themselves
      if (fb.isAnonymous && fb.providerId !== req.user.id) {
        fb.providerId = null;
        fb.provider = null;
      }
      return fb;
    });

    res.json(sanitized);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error fetching feedback' });
  }
};

exports.updateFeedbackStatus = async (req, res) => {
  try {
    // Admin only
    const { id } = req.params;
    const { status } = req.body;
    const tenantId = req.user.tenantId;

    if (!['Visible', 'Hidden'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const existing = await prisma.feedback360.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Feedback not found' });
    
    if (existing.tenantId !== tenantId) {
      return res.status(403).json({ error: 'Forbidden: Access denied to feedback outside your tenant' });
    }

    await prisma.$transaction([
      prisma.feedback360.update({ where: { id }, data: { status } }),
      prisma.auditLog.create({
        data: { tenantId, action: 'FEEDBACK_STATUS_CHANGED', targetId: id, actorId: req.user.id, details: { newStatus: status } }
      })
    ]);

    res.json({ message: 'Feedback status updated' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error updating feedback status' });
  }
};
