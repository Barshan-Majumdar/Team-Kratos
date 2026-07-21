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
router.put('/config', auth, authorize(1), payrollController.updateConfig);

router.get('/advances', auth, authorize(1), payrollController.getAllAdvances);
router.put('/advance/:id/status', auth, authorize(1), payrollController.updateAdvanceStatus);

router.post('/generate/:month', auth, authorize(1), payrollController.generateMonthlyPayroll);
router.get('/all', auth, authorize(1), payrollController.getAllPayrolls);
router.get('/user/:userId', auth, authorize(1), payrollController.getPayrollsByUser);
router.put('/:id/lock', auth, authorize(1), payrollController.lockPayroll);

// Audit logs
router.get('/audit-log', auth, authorize(1), payrollController.getAuditLogs);

module.exports = router;
