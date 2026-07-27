const express = require('express');
const router = express.Router();
const inboxController = require('../controllers/inboxController');
const auth = require('../middleware/auth');

router.use(auth);

// GET /api/inbox
router.get('/', inboxController.getInbox);

module.exports = router;
