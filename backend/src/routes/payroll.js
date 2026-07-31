const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/role');
const payrollController = require('../controllers/payrollController');

// Employee actions
router.post('/advance', auth, payrollController.requestAdvance);
router.get('/my-advances', auth, payrollController.getMyAdvances);
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

// Forecast Simulator
router.get('/forecast-baseline', auth, authorize(1), payrollController.getForecastBaseline);

// Audit logs
router.get('/audit-log', auth, authorize(2), payrollController.getAuditLogs);

const shiftComplianceController = require('../controllers/shiftComplianceController');

// Compliance Preview (Managers Level <= 2, Employees Level <= 3)
router.get('/compliance-preview/:month', auth, authorize(2), shiftComplianceController.getCompliancePreview);
router.get('/compliance-preview/:month/:userId', auth, authorize(3), shiftComplianceController.getUserCompliancePreview);

module.exports = router;
