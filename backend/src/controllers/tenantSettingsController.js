const prisma = require('../config/db');

// Legal Entity CRUD
exports.getLegalEntities = async (req, res) => {
  try {
    const entities = await prisma.legalEntity.findMany({ where: { tenantId: req.user.tenantId }});
    res.json(entities);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createLegalEntity = async (req, res) => {
  try {
    const { name, pfCode, ptRegNo } = req.body;
    const entity = await prisma.legalEntity.create({
      data: {
        name,
        pfCode,
        ptRegNo,
        tenantId: req.user.tenantId
      }
    });
    res.status(201).json(entity);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Compliance Rule CRUD
exports.getComplianceRules = async (req, res) => {
  try {
    const rules = await prisma.complianceRule.findMany({ where: { tenantId: req.user.tenantId }});
    res.json(rules);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createComplianceRule = async (req, res) => {
  try {
    const { state, ruleType, rateTable } = req.body;
    const rule = await prisma.complianceRule.create({
      data: {
        state,
        ruleType,
        rateTable,
        tenantId: req.user.tenantId
      }
    });
    res.status(201).json(rule);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
