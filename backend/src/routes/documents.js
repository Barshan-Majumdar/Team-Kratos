const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/role');
const tenantStorage = require('../middleware/tenantContext');
const documentController = require('../controllers/documentController');

const restoreContext = (req, res, next) => {
  if (req.user && req.user.tenantId) {
    tenantStorage.run(req.user.tenantId, () => next());
  } else if (req.user && req.user.roleDefinition?.name === 'SuperAdmin') {
    tenantStorage.run('SUPER_ADMIN_BYPASS', () => next());
  } else {
    next();
  }
};

router.use(auth);
router.use(restoreContext);

// Template Endpoints
router.get('/templates', documentController.getTemplates);
router.post('/templates', authorize(1), documentController.createTemplate);
router.put('/templates/:id', authorize(1), documentController.updateTemplate);
router.delete('/templates/:id', authorize(1), documentController.deleteTemplate);

// Document Generation & Archive
router.post('/generate', authorize(1), documentController.generateDocument);
router.get('/my', documentController.getMyDocuments);
router.get('/all', authorize(1), documentController.getAllDocuments);
router.get('/generated/:id/download', documentController.downloadDocument);

module.exports = router;
