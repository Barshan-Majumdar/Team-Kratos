const express = require('express');
const router = express.Router();
const onboardingController = require('../controllers/onboardingController');
const auth = require('../middleware/auth');
const multer = require('multer');
const rateLimit = require('express-rate-limit');

// Restore AsyncLocalStorage tenant context — needed after Multer's upload.single('file')
// because Multer processes the multipart stream inside its own async boundary which can
// strip the AsyncLocalStorage context set by the auth middleware.
const tenantStorage = require('../middleware/tenantContext');
const restoreContext = (req, res, next) => {
  if (req.user && req.user.tenantId) {
    tenantStorage.run(req.user.tenantId, () => next());
  } else if (req.user && req.user.roleDefinition?.name === 'SuperAdmin') {
    tenantStorage.run('SUPER_ADMIN_BYPASS', () => next());
  } else {
    next();
  }
};

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
router.post('/upload', upload.single('file'), restoreContext, onboardingController.uploadDocument);
router.get('/documents/:id', documentRateLimiter, onboardingController.getDocument);
router.get('/pipeline', onboardingController.getPipeline);
router.get('/tasks', onboardingController.getTasks);
router.post('/tasks', onboardingController.assignTask);
router.put('/tasks/:id/complete', onboardingController.completeTask);

// Checklist template endpoints
router.get('/checklist-templates', onboardingController.getChecklistTemplates);
router.post('/checklist-templates', onboardingController.createChecklistTemplate);

module.exports = router;

