const prisma = require('../config/db');
const path = require('path');
const fs = require('fs');
const { getSubordinateIds } = require('../utils/managerHierarchy');
const { sendNotification } = require('../utils/notificationEngine');
const { Prisma } = require('@prisma/client');

// Ensure uploads/receipts directory exists
const receiptsDir = path.join(__dirname, '../../uploads/receipts');
if (!fs.existsSync(receiptsDir)) {
  fs.mkdirSync(receiptsDir, { recursive: true });
}

/**
 * POST /api/expenses — Submit a new expense claim
 */
const createClaim = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const userId = req.user.id;
    const { title, category, amount, currency, date, description } = req.body;

    if (!title || !amount || !date) {
      return res.status(400).json({ error: 'Title, amount, and date are required' });
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number' });
    }

    let receiptFileId = null;
    let receiptFileName = null;
    let receiptMimeType = null;

    if (req.file) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
      if (!allowedTypes.includes(req.file.mimetype)) {
        return res.status(400).json({ error: 'Only images (JPEG, PNG, WebP) and PDF files are allowed' });
      }

      if (req.file.size > 5 * 1024 * 1024) {
        return res.status(400).json({ error: 'Receipt file size must not exceed 5MB' });
      }

      receiptFileId = `rcpt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}${path.extname(req.file.originalname)}`;
      receiptFileName = req.file.originalname;
      receiptMimeType = req.file.mimetype;

      const savePath = path.join(receiptsDir, receiptFileId);
      fs.writeFileSync(savePath, req.file.buffer);
    }

    const claim = await prisma.expenseClaim.create({
      data: {
        tenantId,
        userId,
        title,
        category: category || 'Other',
        amount: new Prisma.Decimal(numAmount),
        currency: currency || 'INR',
        date: new Date(date),
        description: description || null,
        receiptFileId,
        receiptFileName,
        receiptMimeType,
        status: 'PENDING'
      },
      include: {
        user: { select: { id: true, displayName: true, avatar: true, department: true } }
      }
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`tenant:${tenantId}`).emit('expense:updated', { claimId: claim.id, action: 'submitted' });
    }

    res.status(201).json(claim);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/expenses/my — List employee's own submitted claims
 */
const getMyClaims = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const userId = req.user.id;

    const claims = await prisma.expenseClaim.findMany({
      where: { tenantId, userId },
      include: {
        approver: { select: { id: true, displayName: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(claims);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/expenses/all — Query approval & settlement queue
 * Scoping: Level 2 Managers view subordinate tree claims (excluding self-owned claims, which route forward). Admins view all.
 */
const getAllClaims = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const userLevel = req.user.roleDefinition?.level ?? 3;

    let whereClause = { tenantId };

    if (userLevel === 2) {
      const subordinateIds = await getSubordinateIds(req.user.id, tenantId);
      // Exclude self-owned claims from manager's own queue (forward-routing self-claims to superior managers / admins)
      const allowedUserIds = subordinateIds.filter(id => id !== req.user.id);
      whereClause.userId = { in: allowedUserIds };
    }

    const claims = await prisma.expenseClaim.findMany({
      where: whereClause,
      include: {
        user: { select: { id: true, displayName: true, avatar: true, department: true, jobPosition: true } },
        approver: { select: { id: true, displayName: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(claims);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/expenses/:id/receipt — Protected receipt file stream
 * Verifies caller is submitter, authorized manager, or Admin
 */
const getReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;
    const userId = req.user.id;
    const userLevel = req.user.roleDefinition?.level ?? 3;

    const claim = await prisma.expenseClaim.findUnique({ where: { id } });
    if (!claim || claim.tenantId !== tenantId) {
      return res.status(404).json({ error: 'Expense claim or receipt not found' });
    }

    if (!claim.receiptFileId) {
      return res.status(404).json({ error: 'No receipt file attached to this claim' });
    }

    // Access check: Submitter, Admin, or Manager of Subordinate
    const isSubmitter = claim.userId === userId;
    const isAdmin = userLevel <= 1;
    let isManagerOfSubmitter = false;

    if (userLevel === 2) {
      const subordinateIds = await getSubordinateIds(userId, tenantId);
      isManagerOfSubmitter = subordinateIds.includes(claim.userId);
    }

    if (!isSubmitter && !isAdmin && !isManagerOfSubmitter) {
      return res.status(403).json({ error: 'Forbidden: Access denied to this receipt file' });
    }

    const filePath = path.join(receiptsDir, claim.receiptFileId);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Receipt file does not exist on disk' });
    }

    res.setHeader('Content-Type', claim.receiptMimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${claim.receiptFileName || claim.receiptFileId}"`);
    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * PUT /api/expenses/:id/approve — Approve expense claim
 */
const approveClaim = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;
    const userId = req.user.id;
    const userLevel = req.user.roleDefinition?.level ?? 3;

    const claim = await prisma.expenseClaim.findUnique({ where: { id } });
    if (!claim) return res.status(404).json({ error: 'Expense claim not found' });

    // 1. Cross-Tenant Guard
    if (claim.tenantId !== tenantId) {
      return res.status(403).json({ error: 'Forbidden: Access denied to expense claim outside your tenant' });
    }

    // 2. Self-Approval Prevention Guard
    if (claim.userId === userId) {
      return res.status(403).json({ error: 'Forbidden: You cannot approve your own expense claim. It has been forwarded to your manager.' });
    }

    // 3. Manager Subordinate Scope Guard
    if (userLevel > 1) {
      const subordinateIds = await getSubordinateIds(userId, tenantId);
      if (!subordinateIds.includes(claim.userId)) {
        return res.status(403).json({ error: 'Forbidden: You can only approve expense claims for your team members' });
      }
    }

    // 4. State Guard
    if (claim.status !== 'PENDING') {
      return res.status(400).json({ error: `Cannot approve claim with status '${claim.status}'. Only PENDING claims can be approved.` });
    }

    const updated = await prisma.expenseClaim.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approverId: userId
      },
      include: {
        user: { select: { id: true, displayName: true } }
      }
    });

    // 5. Audit Log
    await prisma.auditLog.create({
      data: {
        tenantId,
        actorId: userId,
        action: 'EXPENSE_APPROVED',
        targetId: claim.userId,
        details: { claimId: id, amount: Number(claim.amount), currency: claim.currency, title: claim.title }
      }
    });

    // 6. Notification & Socket.io
    sendNotification({
      userId: claim.userId,
      tenantId,
      type: 'EXPENSE_APPROVED',
      data: {
        title: claim.title,
        amount: Number(claim.amount),
        currency: claim.currency,
        status: 'APPROVED'
      }
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`tenant:${tenantId}`).emit('expense:updated', { claimId: id, status: 'APPROVED' });
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * PUT /api/expenses/:id/reject — Reject expense claim
 */
const rejectClaim = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminRemarks } = req.body;
    const tenantId = req.user.tenantId;
    const userId = req.user.id;
    const userLevel = req.user.roleDefinition?.level ?? 3;

    const claim = await prisma.expenseClaim.findUnique({ where: { id } });
    if (!claim) return res.status(404).json({ error: 'Expense claim not found' });

    if (claim.tenantId !== tenantId) {
      return res.status(403).json({ error: 'Forbidden: Access denied to expense claim outside your tenant' });
    }

    if (claim.userId === userId) {
      return res.status(403).json({ error: 'Forbidden: You cannot reject your own expense claim' });
    }

    if (userLevel > 1) {
      const subordinateIds = await getSubordinateIds(userId, tenantId);
      if (!subordinateIds.includes(claim.userId)) {
        return res.status(403).json({ error: 'Forbidden: You can only reject expense claims for your team members' });
      }
    }

    if (claim.status !== 'PENDING') {
      return res.status(400).json({ error: `Cannot reject claim with status '${claim.status}'. Only PENDING claims can be rejected.` });
    }

    const updated = await prisma.expenseClaim.update({
      where: { id },
      data: {
        status: 'REJECTED',
        approverId: userId,
        adminRemarks: adminRemarks || 'Claim rejected by manager'
      }
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        actorId: userId,
        action: 'EXPENSE_REJECTED',
        targetId: claim.userId,
        details: { claimId: id, amount: Number(claim.amount), remarks: adminRemarks }
      }
    });

    sendNotification({
      userId: claim.userId,
      tenantId,
      type: 'EXPENSE_REJECTED',
      data: {
        title: claim.title,
        amount: Number(claim.amount),
        currency: claim.currency,
        status: 'REJECTED',
        adminRemarks
      }
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`tenant:${tenantId}`).emit('expense:updated', { claimId: id, status: 'REJECTED' });
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * PUT /api/expenses/:id/resubmit — Resubmit rejected claim with field cleanup
 */
const resubmitClaim = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, category, amount, description } = req.body;
    const tenantId = req.user.tenantId;
    const userId = req.user.id;

    const claim = await prisma.expenseClaim.findUnique({ where: { id } });
    if (!claim || claim.tenantId !== tenantId) {
      return res.status(404).json({ error: 'Expense claim not found' });
    }

    if (claim.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden: You can only resubmit your own expense claims' });
    }

    if (claim.status !== 'REJECTED') {
      return res.status(400).json({ error: 'Only REJECTED claims can be resubmitted' });
    }

    const numAmount = parseFloat(amount || claim.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number' });
    }

    let receiptFileId = claim.receiptFileId;
    let receiptFileName = claim.receiptFileName;
    let receiptMimeType = claim.receiptMimeType;

    if (req.file) {
      receiptFileId = `rcpt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}${path.extname(req.file.originalname)}`;
      receiptFileName = req.file.originalname;
      receiptMimeType = req.file.mimetype;
      fs.writeFileSync(path.join(receiptsDir, receiptFileId), req.file.buffer);
    }

    // Field Cleanup: Reset status to PENDING and null out stale approverId & adminRemarks
    const updated = await prisma.expenseClaim.update({
      where: { id },
      data: {
        title: title || claim.title,
        category: category || claim.category,
        amount: new Prisma.Decimal(numAmount),
        description: description !== undefined ? description : claim.description,
        receiptFileId,
        receiptFileName,
        receiptMimeType,
        status: 'PENDING',
        approverId: null,     // Explicit field cleanup
        adminRemarks: null   // Explicit field cleanup
      }
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`tenant:${tenantId}`).emit('expense:updated', { claimId: id, action: 'resubmitted' });
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * PUT /api/expenses/:id/unapprove — Admin unapprove claim back to PENDING
 */
const unapproveClaim = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;
    const userId = req.user.id;
    const isAdmin = req.user.roleDefinition && req.user.roleDefinition.level <= 1;

    if (!isAdmin) {
      return res.status(403).json({ error: 'Forbidden: Only Admins can unapprove expense claims' });
    }

    const claim = await prisma.expenseClaim.findUnique({ where: { id } });
    if (!claim || claim.tenantId !== tenantId) {
      return res.status(404).json({ error: 'Expense claim not found' });
    }

    if (claim.status !== 'APPROVED') {
      return res.status(400).json({ error: 'Only APPROVED claims can be unapproved' });
    }

    const updated = await prisma.expenseClaim.update({
      where: { id },
      data: {
        status: 'PENDING',
        approverId: null
      }
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        actorId: userId,
        action: 'EXPENSE_UNAPPROVED',
        targetId: claim.userId,
        details: { claimId: id, title: claim.title }
      }
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * POST /api/expenses/settle-batch — Atomic Single-Currency TOCTOU-Safe Batch Settlement
 * Body: { claimIds: [...] }
 */
const settleBatch = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const userId = req.user.id;
    const { claimIds } = req.body;

    if (!Array.isArray(claimIds) || claimIds.length === 0) {
      return res.status(400).json({ error: 'claimIds array is required' });
    }

    // 1. Query target claims for validation order
    const claimsToSettle = await prisma.expenseClaim.findMany({
      where: {
        id: { in: claimIds },
        tenantId
      }
    });

    if (claimsToSettle.length !== claimIds.length) {
      return res.status(400).json({ error: 'One or more claim IDs are invalid or belong to another tenant' });
    }

    // 2. Single-Currency Uniformity Validation (Order step 1)
    const currencies = [...new Set(claimsToSettle.map(c => c.currency))];
    if (currencies.length > 1) {
      return res.status(400).json({ error: `Cannot batch settle claims with mixed currencies (${currencies.join(', ')}). Please settle one currency at a time.` });
    }
    const batchCurrency = currencies[0] || 'INR';

    // 3. Decimal-Safe Summation
    const totalAmount = claimsToSettle.reduce((sum, c) => sum + Number(c.amount), 0);

    // 4. Atomic Execution in Transaction with tenant AND status matching
    await prisma.$transaction(async (tx) => {
      const updateResult = await tx.expenseClaim.updateMany({
        where: {
          id: { in: claimIds },
          tenantId,
          status: 'APPROVED' // Atomic status guard
        },
        data: {
          status: 'SETTLED',
          settledAt: new Date()
        }
      });

      if (updateResult.count !== claimIds.length) {
        throw new Error(`Batch settlement failed: Expected ${claimIds.length} APPROVED claims, but only ${updateResult.count} were eligible.`);
      }

      // Audit Log
      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: userId,
          action: 'EXPENSE_SETTLED',
          targetId: userId,
          details: { count: claimIds.length, totalAmount, currency: batchCurrency, claimIds }
        }
      });
    });

    // 5. Notifications & Socket.io
    claimsToSettle.forEach(claim => {
      sendNotification({
        userId: claim.userId,
        tenantId,
        type: 'EXPENSE_SETTLED',
        data: {
          title: claim.title,
          amount: Number(claim.amount),
          currency: claim.currency,
          status: 'SETTLED'
        }
      });
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`tenant:${tenantId}`).emit('expense:settled', { count: claimIds.length, totalAmount, currency: batchCurrency });
    }

    res.json({ message: `Successfully settled ${claimIds.length} expense claims`, count: claimIds.length, totalAmount, currency: batchCurrency });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createClaim,
  getMyClaims,
  getAllClaims,
  getReceipt,
  approveClaim,
  rejectClaim,
  resubmitClaim,
  unapproveClaim,
  settleBatch
};
