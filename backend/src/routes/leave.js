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
  } else if (req.user && req.user.role === 'SuperAdmin') {
    tenantStorage.run('SUPER_ADMIN_BYPASS', () => next());
  } else {
    next();
  }
};

// Employee actions
router.post('/apply', auth, upload.single('attachment'), restoreContext, leaveController.applyLeave);
router.get('/me', auth, leaveController.getMyLeaves);

// Admin actions
router.get('/all', auth, authorize('Admin', 'CEO'), leaveController.getAllLeaves);
router.get('/user/:userId', auth, authorize('Admin', 'CEO'), leaveController.getLeavesByUser);
router.put('/:id/status', auth, authorize('Admin', 'CEO'), leaveController.updateLeaveStatus);

module.exports = router;
