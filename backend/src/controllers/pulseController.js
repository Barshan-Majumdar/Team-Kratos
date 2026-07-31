const prisma = require('../config/db');
const pulseEngine = require('../utils/pulseEngine');

const getLivePulse = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant context required.' });
    }
    
    // Seed/initialize states from the database if they don't exist yet
    await pulseEngine.seedStateFromDB(prisma, tenantId);
    
    const data = pulseEngine.getTenantState(tenantId);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getLivePulse
};
