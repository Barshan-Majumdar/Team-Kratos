const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/role');
const { createAnnouncement, getAnnouncements } = require('../controllers/announcementController');

router.use(auth);

router.get('/', getAnnouncements);
router.post('/', authorize(1), createAnnouncement);

module.exports = router;
