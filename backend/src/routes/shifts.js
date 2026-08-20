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

const shiftEngineController = require('../controllers/shiftEngineController');

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

// ── My Shift Today (Employee self-service — used by frontend for clock-in gating) ──
router.get('/my-shift-today', shiftController.getMyShiftToday);

// ── Auto-Assign Engine Endpoints ─────────────────────────
router.get('/engine/roster', shiftEngineController.getWeeklyRoster);
router.post('/engine/simulate', authorize(1), shiftEngineController.simulateRoster);
router.post('/engine/auto-assign', authorize(1), shiftEngineController.autoAssignShifts);
router.post('/engine/assign', authorize(1), shiftEngineController.manualAssignShift);
router.delete('/engine/assign/:id', authorize(1), shiftEngineController.unassignShift);
router.post('/engine/slots', authorize(1), shiftEngineController.createSlot);
router.delete('/engine/slots/:id', authorize(1), shiftEngineController.deleteSlot);
router.delete('/engine/roster', authorize(1), shiftEngineController.clearRoster);

module.exports = router;
