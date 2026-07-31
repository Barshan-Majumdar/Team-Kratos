const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const faceRegistrationController = require('../controllers/faceRegistrationController');

router.post('/', auth, faceRegistrationController.registerFace);
router.post('/register', auth, faceRegistrationController.registerFace);
router.get('/status', auth, faceRegistrationController.getRegistrationStatus);
router.post('/reset/:targetUserId', auth, faceRegistrationController.resetRegistration);

module.exports = router;
