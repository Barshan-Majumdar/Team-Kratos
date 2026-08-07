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
router.patch('/company', authorize(1), consoleController.updateCompanyProfile);

// ── Role Hierarchy Manager
router.get('/roles', consoleController.getRoles);
router.post('/roles', authorize(1), consoleController.createRole);
router.patch('/roles/:id', authorize(1), consoleController.updateRole);
router.delete('/roles/:id', authorize(1), consoleController.deleteRole);

// ── Office Management
router.get('/offices', consoleController.getOffices);
router.post('/offices', authorize(1), consoleController.createOffice);    // Chairman + Admin
router.patch('/offices/:id', authorize(1), consoleController.updateOffice); // Chairman + Admin
router.delete('/offices/:id', authorize(1), consoleController.deleteOffice); // Chairman + Admin

// ── Legal Entity Management
router.get('/entities', consoleController.getEntities);
router.post('/entities', authorize(1), consoleController.createEntity);    // Chairman + Admin
router.patch('/entities/:id', authorize(1), consoleController.updateEntity); // Chairman + Admin
router.delete('/entities/:id', authorize(1), consoleController.deleteEntity); // Chairman + Admin

// ── Payroll Configuration
router.get('/payroll-config', consoleController.getPayrollConfig);
router.patch('/payroll-config', authorize(1), consoleController.updatePayrollConfig);

// ── Access Permissions
router.get('/permissions', consoleController.getPermissions);
router.patch('/permissions', authorize(1), consoleController.updatePermissions);

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
