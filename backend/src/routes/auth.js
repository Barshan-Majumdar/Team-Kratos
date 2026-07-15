const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');

// Public routes
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/register-company', authController.registerCompany);

// Protected routes
router.post('/change-password', auth, authController.changePassword);
router.get('/me', auth, authController.getMe);

module.exports = router;
