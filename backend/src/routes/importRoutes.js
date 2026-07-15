const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/role');
const multer = require('multer');
const importController = require('../controllers/importController');

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post('/upload', auth, authorize('Admin', 'CEO'), upload.single('file'), importController.uploadEmployeesCsv);
router.get('/jobs', auth, authorize('Admin', 'CEO'), importController.getImportJobs);

module.exports = router;
