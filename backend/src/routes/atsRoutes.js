const express = require('express');
const router = express.Router();
const multer = require('multer');
const atsController = require('../controllers/atsController');
const auth = require('../middleware/auth');
const authorize = require('../middleware/role');

const upload = multer({ storage: multer.memoryStorage() });

// Public Routes
router.get('/public/jobs/:tenantId', atsController.getPublicJobs);
router.post('/public/apply', upload.single('resumeFile'), atsController.publicApply);

// Middleware to ensure user is logged in
router.use(auth);

// Job Requisitions
router.get('/jobs', atsController.getJobRequisitions);
router.post('/jobs', authorize(2), atsController.createJobRequisition);
router.patch('/jobs/:id', authorize(2), atsController.updateJobRequisition);
router.delete('/jobs/:id', authorize(2), atsController.deleteJobRequisition);

// Candidates
router.get('/candidates', atsController.getCandidates);
router.post('/candidates', authorize(2), atsController.createCandidate);
router.post('/candidates/parse-resume', authorize(2), atsController.parseResume);

// Applications
router.get('/applications', atsController.getApplications);
router.post('/applications', authorize(2), atsController.createApplication);
router.patch('/applications/:id/stage', authorize(2), atsController.updateApplicationStage);

module.exports = router;
