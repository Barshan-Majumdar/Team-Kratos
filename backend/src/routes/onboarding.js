const express = require('express');
const router = express.Router();
const onboardingController = require('../controllers/onboardingController');
const auth = require('../middleware/auth');
const multer = require('multer');
const rateLimit = require('express-rate-limit');

// Rate limiting keyed by userId
const documentRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each user to 100 requests per windowMs
  keyGenerator: (req) => {
    return req.user ? req.user.id : 'anonymous';
  },
  message: 'Too many requests for documents from this user, please try again later.'
});

const upload = multer({ 
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only images are allowed'));
    }
    cb(null, true);
  }
});

router.use(auth);

router.put('/wizard-step', onboardingController.submitWizardStep);
router.post('/upload', upload.single('file'), onboardingController.uploadDocument);
router.get('/documents/:id', documentRateLimiter, onboardingController.getDocument);
router.get('/pipeline', onboardingController.getPipeline);
router.get('/tasks', onboardingController.getTasks);
router.post('/tasks', onboardingController.assignTask);
router.put('/tasks/:id/complete', onboardingController.completeTask);

module.exports = router;
