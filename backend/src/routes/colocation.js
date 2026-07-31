const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const colocationController = require('../controllers/colocationController');

router.get('/network', auth, colocationController.getNetworkGraph);

module.exports = router;
