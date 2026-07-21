const express = require('express');
const { generatePFChallan } = require('../controllers/statutoryFilingController');
const auth = require('../middleware/auth');

const router = express.Router();

const authorize = require('../middleware/role');

router.use(auth, authorize(1));
router.post('/pf-challan', generatePFChallan);

module.exports = router;
