const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/role');
const proxyAlertController = require('../controllers/proxyAlertController');

// Read-only routes (Manager Level <= 2)
router.get('/', auth, authorize(2), proxyAlertController.getAlerts);
router.get('/stats', auth, authorize(2), proxyAlertController.getStats);

// Mutation routes (Admin / CEO Level <= 1)
router.patch('/:id/resolve', auth, authorize(1), proxyAlertController.resolveAlert);
router.post('/bulk-dismiss', auth, authorize(1), proxyAlertController.bulkDismiss);

module.exports = router;
