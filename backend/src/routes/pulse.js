const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/role');
const { getLivePulse } = require('../controllers/pulseController');

// Restrict access to Owner (CEO), HR Admin, or SuperAdmin only (level <= 1)
router.get('/live', auth, authorize(1), getLivePulse);

module.exports = router;
