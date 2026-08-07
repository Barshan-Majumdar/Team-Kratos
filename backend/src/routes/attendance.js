const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/role');
const attendanceController = require('../controllers/attendanceController');

// Employee / User actions
router.post('/check-face', auth, attendanceController.checkFace);
router.post('/clock-in', auth, attendanceController.clockIn);
router.post('/clock-out', auth, attendanceController.clockOut);
router.get('/me', auth, attendanceController.getMyAttendance);
router.get('/history', auth, attendanceController.getMyAttendance);

// Admin & HR / Manager actions
router.get('/today', auth, authorize(2), attendanceController.getTodayAttendance);
router.get('/report', auth, authorize(2), attendanceController.getAttendanceReport);
router.get('/hr/report', auth, authorize(2), attendanceController.getAttendanceReport);

module.exports = router;
