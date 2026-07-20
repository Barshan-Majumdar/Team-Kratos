const express = require('express');
const { 
  getLegalEntities, createLegalEntity, 
  getComplianceRules, createComplianceRule,
  getTenantRoles, updateTenantRoles,
  getTenantInfo
} = require('../controllers/tenantSettingsController');
const auth = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(auth);

// Admin/CEO/Manager can read settings; only CEO can modify role structure
const authorizeAdmin = (req, res, next) => {
  if (req.user && ['Admin', 'SuperAdmin', 'CEO', 'Manager'].includes(req.user.role)) {
    next();
  } else {
    res.status(403).json({ error: 'Access denied.' });
  }
};

const authorizeCEO = (req, res, next) => {
  if (req.user && ['CEO', 'SuperAdmin'].includes(req.user.role)) {
    next();
  } else {
    res.status(403).json({ error: 'Only the account owner can perform this action.' });
  }
};

// Legal Entities (Admin only write, read for all admins)
router.get('/legal-entities', authorizeAdmin, getLegalEntities);
router.post('/legal-entities', authorizeAdmin, createLegalEntity);

// Compliance Rules (Admin only)
router.get('/compliance-rules', authorizeAdmin, getComplianceRules);
router.post('/compliance-rules', authorizeAdmin, createComplianceRule);

// ── Custom Roles Management ────────────────────────────────
// GET: Any authenticated user (needed to populate dropdowns)
router.get('/roles', getTenantRoles);

// PUT: CEO only — modify role hierarchy
router.put('/roles', authorizeCEO, updateTenantRoles);

// GET: Tenant info (used across dashboard widgets)
router.get('/info', getTenantInfo);

module.exports = router;

