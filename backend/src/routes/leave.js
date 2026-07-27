const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/role');
const leaveController = require('../controllers/leaveController');
const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage });

const tenantStorage = require('../middleware/tenantContext');
const restoreContext = (req, res, next) => {
  if (req.user && req.user.tenantId) {
    tenantStorage.run(req.user.tenantId, () => next());
  } else if (req.user && req.user.roleDefinition?.name === 'SuperAdmin') {
    tenantStorage.run('SUPER_ADMIN_BYPASS', () => next());
  } else {
    next();
  }
};

// ── Policy Endpoints ──────────────────────────────────
router.get('/policies', auth, restoreContext, leaveController.getPolicies);  // All authenticated users can read policies
router.post('/policies', auth, authorize(1), restoreContext, leaveController.createPolicy);
router.put('/policies/:id', auth, authorize(1), restoreContext, leaveController.updatePolicy);
router.delete('/policies/:id', auth, authorize(1), restoreContext, leaveController.archivePolicy);

// ── Balance Endpoints ─────────────────────────────────────
router.get('/balances', auth, restoreContext, leaveController.getMyBalances);
router.get('/balances/:userId', auth, authorize(2), restoreContext, leaveController.getBalancesByUser);

// ── Employee Actions ──────────────────────────────────────
router.post('/apply', auth, upload.single('attachment'), restoreContext, leaveController.applyLeave);
router.get('/me', auth, restoreContext, leaveController.getMyLeaves);

// ── Manager + Admin Actions ──────────────────────────────
// Level ≤ 2 = managers can see their team's leaves and approve/reject
router.get('/all', auth, authorize(2), restoreContext, leaveController.getAllLeaves);
router.get('/user/:userId', auth, authorize(2), restoreContext, leaveController.getLeavesByUser);
router.put('/:id/status', auth, authorize(2), restoreContext, leaveController.updateLeaveStatus);
// Admin and Manager actions
router.get('/all', auth, authorize(2), leaveController.getAllLeaves);
router.get('/user/:userId', auth, authorize(2), leaveController.getLeavesByUser);
router.put('/:id/status', auth, authorize(2), leaveController.updateLeaveStatus);

module.exports = router;
