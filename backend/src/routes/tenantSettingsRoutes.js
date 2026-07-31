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

// --- Shift Policies CRUD (F22) ---
const shiftPolicyController = require('../controllers/shiftPolicyController');

const authorizePolicyMutations = (req, res, next) => {
  const roleDef = req.user?.roleDefinition;
  if (!roleDef) return res.status(401).json({ error: 'Unauthorized: No role attached to session.' });
  
  // SuperAdmin or HR Admin (Level 1) only
  if (roleDef.name === 'SuperAdmin' || (roleDef.level === -1 && req.user.tenantId === null) || roleDef.level === 1 || roleDef.name === 'HR Admin') {
    return next();
  }
  return res.status(403).json({ error: 'Forbidden: Insufficient privileges.' });
};

router.get('/shift-policies', authorize(2), shiftPolicyController.getShiftPolicies);
router.post('/shift-policies', authorizePolicyMutations, shiftPolicyController.createShiftPolicy);
router.put('/shift-policies/:id', authorizePolicyMutations, shiftPolicyController.updateShiftPolicy);
router.delete('/shift-policies/:id', authorizePolicyMutations, shiftPolicyController.deleteShiftPolicy);

module.exports = router;

