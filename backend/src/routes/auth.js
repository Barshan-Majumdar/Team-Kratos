const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');

// Public routes
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/register-company', authController.registerCompany);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// OTP Verification
router.post('/verify-otp', auth, authController.verifyOTP);
router.post('/resend-otp', auth, authController.resendOTP);

// Protected routes
router.post('/change-password', auth, authController.changePassword);
router.get('/me', auth, authController.getMe);

module.exports = router;
