const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/role');
const multer = require('multer');
const importController = require('../controllers/importController');

const storage = multer.memoryStorage();
const upload = multer({ storage });

const tenantStorage = require('../middleware/tenantContext');
const restoreContext = (req, res, next) => {
  if (req.user && req.user.tenantId) {
    tenantStorage.run(req.user.tenantId, () => next());
  } else if (req.user && req.user.role === 'SuperAdmin') {
    tenantStorage.run('SUPER_ADMIN_BYPASS', () => next());
  } else {
    next();
  }
};

router.post('/upload', auth, authorize('Admin', 'CEO'), upload.single('file'), restoreContext, importController.uploadEmployeesCsv);
router.get('/jobs', auth, authorize('Admin', 'CEO'), importController.getImportJobs);

module.exports = router;
