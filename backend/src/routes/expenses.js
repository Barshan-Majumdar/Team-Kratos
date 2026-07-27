const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/role');
const expenseController = require('../controllers/expenseController');
const multer = require('multer');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Restore AsyncLocalStorage tenant context — needed after Multer's upload.single('receipt')
// because Multer processes the multipart stream inside its own async boundary which strips
// the AsyncLocalStorage context set by auth middleware.
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

router.use(auth);

// Employee Endpoints
router.post('/', upload.single('receipt'), restoreContext, expenseController.createClaim);
router.get('/my', restoreContext, expenseController.getMyClaims);
router.get('/:id/receipt', restoreContext, expenseController.getReceipt);
router.put('/:id/resubmit', upload.single('receipt'), restoreContext, expenseController.resubmitClaim);

// Approver / Manager / Admin Endpoints
router.get('/all', authorize(2), restoreContext, expenseController.getAllClaims);
router.put('/:id/approve', authorize(2), restoreContext, expenseController.approveClaim);
router.put('/:id/reject', authorize(2), restoreContext, expenseController.rejectClaim);
router.put('/:id/unapprove', authorize(1), restoreContext, expenseController.unapproveClaim);
router.post('/settle-batch', authorize(1), restoreContext, expenseController.settleBatch);

module.exports = router;
