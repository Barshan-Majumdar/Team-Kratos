const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const auditController = require('../controllers/auditController');

router.get('/verify', auth, auditController.verifyChain);

module.exports = router;
