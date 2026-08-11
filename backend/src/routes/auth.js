const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');

// Public routes
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/send-registration-otp', authController.sendRegistrationOtp);
router.post('/register-company', authController.registerCompany);

// Verify Email OTP (requires being logged in but unverified)
router.post('/verify-otp', auth, authController.verifyOTP);
router.post('/resend-otp', auth, authController.resendOTP);

// Password Reset (Public)
router.post('/forgot-password', authController.requestPasswordReset);
router.post('/verify-reset-otp', authController.verifyResetOtp);
router.post('/reset-password', authController.resetPassword);

// Waitlist (Public)
router.post('/waitlist', authController.joinWaitlist);

// Protected routes
router.post('/change-password', auth, authController.changePassword);
router.get('/me', auth, authController.getMe);

module.exports = router;
