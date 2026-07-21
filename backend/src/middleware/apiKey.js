const prisma = require('../config/db');
const crypto = require('crypto');

const apiKeyMiddleware = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid API key' });
  }

  const rawKey = authHeader.split(' ')[1];
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

  try {
    const apiKeyRecord = await prisma.basePrisma.apiKey.findUnique({
      where: { keyHash },
      include: { tenant: true }
    });

    if (!apiKeyRecord) {
      return res.status(403).json({ error: 'Invalid API key' });
    }

    // Attach tenant logic similar to JWT auth
    req.user = {
      tenantId: apiKeyRecord.tenantId,
      isApiUser: true
    };
    
    req.tenant = apiKeyRecord.tenant;

    // Update last used
    await prisma.basePrisma.apiKey.update({
      where: { id: apiKeyRecord.id },
      data: { lastUsedAt: new Date() }
    });

    next();
  } catch (error) {
    console.error('API Key Middleware error:', error);
    res.status(500).json({ error: 'Internal server error validating API key' });
  }
};

module.exports = apiKeyMiddleware;
