const express = require('express');
const router = express.Router();
const costIntelligenceController = require('../controllers/costIntelligenceController');
const auth = require('../middleware/auth');

router.get('/summary', auth, costIntelligenceController.getCostIntelligence);

module.exports = router;
