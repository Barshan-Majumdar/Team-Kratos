const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/role');
const leaveController = require('../controllers/leaveController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.memoryStorage();
const upload = multer({ storage });

// Employee actions
router.post('/apply', auth, upload.single('attachment'), leaveController.applyLeave);
router.get('/me', auth, leaveController.getMyLeaves);

// Admin actions
router.get('/all', auth, authorize('Admin'), leaveController.getAllLeaves);
router.get('/user/:userId', auth, authorize('Admin'), leaveController.getLeavesByUser);
router.put('/:id/status', auth, authorize('Admin'), leaveController.updateLeaveStatus);

module.exports = router;
