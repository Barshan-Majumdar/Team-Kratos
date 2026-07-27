const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/role');
const shiftController = require('../controllers/shiftController');

const tenantStorage = require('../middleware/tenantContext');
const restoreContext = (req, res, next) => {
  if (req.user && req.user.tenantId) {
    tenantStorage.run(req.user.tenantId, () => next());
  } else {
    next();
  }
};

router.use(auth);
router.use(restoreContext);

// ── Policy Endpoints ─────────────────────────────────────
router.get('/policies', shiftController.getPolicies);
router.post('/policies', authorize(1), shiftController.createPolicy);
router.put('/policies/:id', authorize(1), shiftController.updatePolicy);
router.delete('/policies/:id', authorize(1), shiftController.archivePolicy);

// ── Roster Endpoints ─────────────────────────────────────
router.get('/roster', shiftController.getRoster);
router.post('/roster/assign', authorize(2), shiftController.assignRoster);
router.delete('/roster/entry', authorize(2), shiftController.deleteRosterEntry);
router.post('/roster/assign-default', authorize(2), shiftController.assignDefaultShift);

module.exports = router;
