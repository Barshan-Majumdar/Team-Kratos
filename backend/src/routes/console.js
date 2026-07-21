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
router.post('/offices', consoleController.createOffice);
router.patch('/offices/:id', consoleController.updateOffice);
router.delete('/offices/:id', consoleController.deleteOffice);

// ── Legal Entity Management
router.get('/entities', consoleController.getEntities);
router.post('/entities', consoleController.createEntity);
router.patch('/entities/:id', consoleController.updateEntity);
router.delete('/entities/:id', consoleController.deleteEntity);

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
router.post('/billing/upgrade', consoleController.upgradeBilling);

// ── Compliance Center
router.get('/compliance', consoleController.getComplianceRules);
router.post('/compliance', consoleController.createComplianceRule);
router.patch('/compliance/:id', consoleController.updateComplianceRule);

module.exports = router;
