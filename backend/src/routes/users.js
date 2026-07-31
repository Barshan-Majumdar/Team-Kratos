const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/role');
const userController = require('../controllers/userController');
const multer = require('multer');
const path = require('path');

const storage = multer.memoryStorage();
const upload = multer({ storage });

// Upload KYC documents
router.post('/:id/upload-kyc', auth, upload.fields([
  { name: 'aadharDoc', maxCount: 1 },
  { name: 'panDoc', maxCount: 1 },
  { name: 'voterDoc', maxCount: 1 },
  { name: 'addressProofDoc', maxCount: 1 }
]), userController.uploadKycDocs);

// Public invite token verification and first-time password setup
router.post('/verify-invite-token', userController.verifyInviteToken);
router.post('/set-password', userController.setPasswordFromToken);

// Admin / HR only: Create new employee/HR/Manager
router.post('/', auth, authorize(2), userController.createEmployee);
router.post('/resend-invite/:targetUserId', auth, authorize(2), userController.resendInviteToken);

// Admin & Manager: List all employees
router.get('/', auth, authorize(2), userController.getAllEmployees);

// Any authenticated user: Get own profile
router.get('/me', auth, userController.getMyProfile);

// Any authenticated user: Update own profile
router.put('/me', auth, userController.updateMyProfile);

// Admin only: Manage Admin Emails
router.get('/admin-emails', auth, authorize(1), userController.getAdminEmails);
router.post('/admin-emails', auth, authorize(1), userController.addAdminEmail);
router.delete('/admin-emails/:email', auth, authorize(1), userController.removeAdminEmail);

// Admin only: Manage Invited Employees
router.get('/invited-emails', auth, authorize(2), userController.getInvitedEmails);
router.post('/invited-emails', auth, authorize(2), userController.inviteEmail);
router.delete('/invited-emails/:email', auth, authorize(2), userController.removeInvitedEmail);

// Any authenticated user: View org chart
router.get('/org-chart', auth, userController.getOrgChart);

// Any authenticated user: PII-safe directory for dropdowns (goals, reviews, feedback)
router.get('/directory', auth, userController.getUserDirectory);

// Any authenticated user: Get and update user preferences (e.g. birthday opt-out)
router.get('/preferences', auth, userController.getUserPreferences);
router.put('/preferences', auth, userController.updateUserPreferences);

// Any authenticated user: View another employee (read-only card click)
router.get('/:id', auth, userController.getEmployeeById);

// Update employee (RBAC enforced in controller)
router.put('/:id', auth, userController.updateEmployeeById);

module.exports = router;
