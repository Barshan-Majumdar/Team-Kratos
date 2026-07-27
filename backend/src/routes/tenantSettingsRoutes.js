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

const authorize = require('../middleware/role');

// Legal Entities (Admin read/write)
router.get('/legal-entities', authorize(1), getLegalEntities);
router.post('/legal-entities', authorize(0), createLegalEntity);

// Compliance Rules (Admin read/write)
router.get('/compliance-rules', authorize(1), getComplianceRules);
router.post('/compliance-rules', authorize(0), createComplianceRule);

// ── Custom Roles Management ────────────────────────────────
// GET: Any authenticated user (needed to populate dropdowns)
router.get('/roles', getTenantRoles);

// PUT: CEO only — modify role hierarchy
router.put('/roles', authorize(0), updateTenantRoles);

// GET: Tenant info (used across dashboard widgets)
router.get('/info', getTenantInfo);

module.exports = router;

