const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/role');
const attendanceController = require('../controllers/attendanceController');

// Employee actions
router.post('/clock-in', auth, attendanceController.clockIn);
router.post('/clock-out', auth, attendanceController.clockOut);
router.get('/me', auth, attendanceController.getMyAttendance);

// Admin actions
router.get('/today', auth, authorize('Admin'), attendanceController.getTodayAttendance);

module.exports = router;
