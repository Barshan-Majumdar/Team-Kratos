const express = require('express');
const requireConsoleAccess = require('../middleware/requireConsoleAccess');
const auth = require('../middleware/auth');

const consoleController = require('../controllers/consoleController');

const router = new express.Router();

// Placeholder route to verify console access
router.get('/verify-access', auth, requireConsoleAccess, async (req, res) => {
  res.status(200).json({
    message: 'Access verified for Console Dashboard',
    role: req.user.roleDefinition.name,
    level: req.user.roleDefinition.level
  });
});

// All console routes require authentication and console access (Level 0 or 1)
router.use(auth, requireConsoleAccess);

const authorize = require('../middleware/role');

// ── Company Profile
router.get('/company', consoleController.getCompanyProfile);
router.patch('/company', authorize(0), consoleController.updateCompanyProfile);

// ── Role Hierarchy Manager
router.get('/roles', consoleController.getRoles);
router.post('/roles', authorize(0), consoleController.createRole);
router.patch('/roles/:id', authorize(0), consoleController.updateRole);
router.delete('/roles/:id', authorize(0), consoleController.deleteRole);

// ── Office Management
router.get('/offices', consoleController.getOffices);
router.post('/offices', authorize(0), consoleController.createOffice);    // Chairman only
router.patch('/offices/:id', authorize(0), consoleController.updateOffice); // Chairman only
router.delete('/offices/:id', authorize(0), consoleController.deleteOffice); // Chairman only

// ── Legal Entity Management
router.get('/entities', consoleController.getEntities);
router.post('/entities', authorize(0), consoleController.createEntity);    // Chairman only
router.patch('/entities/:id', authorize(0), consoleController.updateEntity); // Chairman only
router.delete('/entities/:id', authorize(0), consoleController.deleteEntity); // Chairman only

// ── Payroll Configuration
router.get('/payroll-config', consoleController.getPayrollConfig);
router.patch('/payroll-config', authorize(0), consoleController.updatePayrollConfig);

// ── Access Permissions
router.get('/permissions', consoleController.getPermissions);
router.patch('/permissions', authorize(0), consoleController.updatePermissions);

// ── Employees Roster
router.get('/employees', consoleController.getEmployees);

// ── Billing & Subscription
router.get('/billing', consoleController.getBilling);
router.post('/billing/upgrade', authorize(0), consoleController.upgradeBilling); // Chairman only

// ── Compliance Center
router.get('/compliance', consoleController.getComplianceRules);
router.post('/compliance', consoleController.createComplianceRule);
router.patch('/compliance/:id', consoleController.updateComplianceRule);

module.exports = router;
