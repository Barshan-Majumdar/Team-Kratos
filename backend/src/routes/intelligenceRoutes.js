const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const authorize = require('../middleware/role');
const { getRadarData, investigateSignal } = require('../controllers/intelligenceController');

// All intelligence routes require Admin or Manager access (Level <= 2)
router.use(authMiddleware);
router.use(authorize(2));

// Get data for the Risk Radar scatter plot
router.get('/radar', getRadarData);

// Trigger Iris AI investigation for a specific employee
router.post('/investigate', investigateSignal);

module.exports = router;
