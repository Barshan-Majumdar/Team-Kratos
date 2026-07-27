const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/role');
const { createAnnouncement, getAnnouncements, triggerBirthdayCheck, wishBirthday } = require('../controllers/announcementController');

router.use(auth);

router.get('/', getAnnouncements);
router.post('/', authorize(1), createAnnouncement);
router.post('/trigger-birthday-check', authorize(1), triggerBirthdayCheck);
router.post('/:id/wish', wishBirthday);

module.exports = router;
