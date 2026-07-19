const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/role');
const payrollController = require('../controllers/payrollController');

// Employee actions
router.post('/advance', auth, payrollController.requestAdvance);
router.get('/me', auth, payrollController.getMyPayrolls);
router.get('/:id/pdf', auth, payrollController.getPayslipPdf);

// Admin actions
router.get('/config', auth, payrollController.getConfig);
router.put('/config', auth, authorize('Admin', 'CEO'), payrollController.updateConfig);

router.get('/advances', auth, authorize('Admin', 'CEO'), payrollController.getAllAdvances);
router.put('/advance/:id/status', auth, authorize('Admin', 'CEO'), payrollController.updateAdvanceStatus);

router.post('/generate/:month', auth, authorize('Admin', 'CEO'), payrollController.generateMonthlyPayroll);
router.get('/all', auth, authorize('Admin', 'CEO'), payrollController.getAllPayrolls);
router.get('/user/:userId', auth, authorize('Admin', 'CEO'), payrollController.getPayrollsByUser);
router.put('/:id/lock', auth, authorize('Admin', 'CEO'), payrollController.lockPayroll);

// Audit logs
router.get('/audit-log', auth, authorize('Admin', 'CEO'), payrollController.getAuditLogs);

module.exports = router;
