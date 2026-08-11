const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/role');
const tenantStorage = require('../middleware/tenantContext');
const analyticsController = require('../controllers/analyticsController');

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
router.use(restoreContext);

// Analytics Endpoints (Authorized for Level <= 2 Managers & Admins)
router.get('/summary', authorize(2), analyticsController.getSummaryStats);
router.get('/demographics', authorize(2), analyticsController.getDemographicsAnalytics);
router.get('/attendance', authorize(2), analyticsController.getAttendanceAnalytics);
router.get('/payroll', authorize(1), analyticsController.getPayrollAnalytics); // Admin Level <= 1
router.get('/benefits', authorize(2), analyticsController.getBenefitsAnalytics);
router.get('/attrition-risk', authorize(2), analyticsController.getAttritionRisk);
router.get('/export', authorize(2), analyticsController.exportReportCSV);

module.exports = router;
