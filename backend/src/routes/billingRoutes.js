const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/role');
const billingController = require('../controllers/billingController');

router.post('/subscriptions', auth, authorize(0), billingController.createSubscription);
router.post('/webhook', express.raw({ type: 'application/json' }), billingController.razorpayWebhook);
router.get('/usage', auth, authorize(0), billingController.calculateMeteredUsage);

module.exports = router;
