const express = require('express');
const { getLegalEntities, createLegalEntity, getComplianceRules, createComplianceRule } = require('../controllers/tenantSettingsController');
const auth = require('../middleware/auth');

const router = express.Router();

const authorizeAdmin = (req, res, next) => {
  if (req.user && (req.user.role === 'Admin' || req.user.role === 'SuperAdmin' || req.user.role === 'CEO')) {
    next();
  } else {
    res.status(403).json({ error: 'Access denied. Admins only.' });
  }
};

// Only Authenticated Admins can configure tenant settings
router.use(auth, authorizeAdmin);

router.get('/legal-entities', getLegalEntities);
router.post('/legal-entities', createLegalEntity);

router.get('/compliance-rules', getComplianceRules);
router.post('/compliance-rules', createComplianceRule);

module.exports = router;
