const express = require('express');
const apiKeyMiddleware = require('../middleware/apiKey');
const prisma = require('../config/db');

const router = express.Router();

// Apply API Key Middleware to all v1 routes
router.use(apiKeyMiddleware);

// Example endpoint: Get company profile
router.get('/company', async (req, res) => {
  try {
    const tenant = await prisma.basePrisma.tenant.findUnique({
      where: { id: req.user.tenantId }
    });
    res.json(tenant);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Example endpoint: Get active employees
router.get('/employees', async (req, res) => {
  try {
    const employees = await prisma.basePrisma.user.findMany({
      where: { tenantId: req.user.tenantId, status: 'Active' },
      select: {
        id: true,
        email: true,
        displayName: true,
        department: true,
        jobPosition: true,
        employeeId: true
      }
    });
    res.json(employees);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
