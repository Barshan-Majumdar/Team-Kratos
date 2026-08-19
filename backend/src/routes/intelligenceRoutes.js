const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const authorize = require('../middleware/role');
const { getRadarData, investigateSignal, getTeamIntelligence, getCostIntelligence, calculateScenario } = require('../controllers/intelligenceController');

// All intelligence routes require Admin or Manager access (Level <= 2)
router.use(authMiddleware);
router.use(authorize(2));

// Get data for the Risk Radar scatter plot
router.get('/radar', getRadarData);

// Trigger Iris AI investigation for a specific employee
router.post('/investigate', investigateSignal);

// Get factual Team Intelligence for a department
router.get('/team', getTeamIntelligence);

// Get strictly layered Cost Intelligence (Fact vs Estimate)
router.get('/cost', getCostIntelligence);

// Run a deterministic Scenario Projection
router.post('/scenario', calculateScenario);

module.exports = router;
