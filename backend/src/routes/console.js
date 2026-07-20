const express = require('express');
const requireConsoleAccess = require('../middleware/requireConsoleAccess');
const auth = require('../middleware/auth');

const router = new express.Router();

// Placeholder route to verify console access
router.get('/verify-access', auth, requireConsoleAccess, async (req, res) => {
  res.status(200).json({
    message: 'Access verified for Console Dashboard',
    role: req.user.roleDefinition.name,
    level: req.user.roleDefinition.level
  });
});

module.exports = router;
