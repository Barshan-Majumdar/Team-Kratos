const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/role');
const tenantStorage = require('../middleware/tenantContext');
const benefitController = require('../controllers/benefitController');

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

// Plan Management
router.get('/plans', benefitController.getPlans);
router.post('/plans/seed-defaults', authorize(2), benefitController.seedDefaultPlans);
router.post('/plans', authorize(2), benefitController.createPlan);
router.put('/plans/:id', authorize(2), benefitController.updatePlan);
router.put('/plans/:id/toggle', authorize(2), benefitController.togglePlanActive);

// Enrollment & Administration
router.post('/enroll', benefitController.enrollBenefit);
router.put('/enrollments/:id/adjust-deduction', authorize(2), benefitController.adjustDeduction);
router.put('/enrollments/:id/cancel', benefitController.cancelEnrollment);
router.get('/my', benefitController.getMyBenefits);
router.get('/all', authorize(2), benefitController.getAllEnrollments);

module.exports = router;
