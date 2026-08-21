const prisma = require('../config/db');
const crypto = require('crypto');

// --- API Keys ---
exports.createApiKey = async (req, res) => {
  try {
    const { name } = req.body;
    
    // Generate a secure random API key
    const rawKey = crypto.randomBytes(32).toString('hex');
    const keyPrefix = rawKey.substring(0, 8);
    
    // Hash the key before storing
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    
    const apiKey = await prisma.apiKey.create({
      data: {
        name,
        keyHash,
        keyPrefix,
        tenantId: req.user.tenantId
      }
    });
    
    await prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        action: 'API_KEY_CREATED',
        details: `Generated new API key: ${name}`,
        tenantId: req.user.tenantId
      }
    });

    // Return the raw key ONLY ONCE. It cannot be retrieved again.
    res.status(201).json({ id: apiKey.id, name: apiKey.name, keyPrefix, rawKey: `crew_${rawKey}`, createdAt: apiKey.createdAt });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getApiKeys = async (req, res) => {
  try {
    const keys = await prisma.apiKey.findMany({
      where: { tenantId: req.user.tenantId },
      select: { id: true, name: true, keyPrefix: true, lastUsedAt: true, createdAt: true }
    });
    res.json(keys);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.revokeApiKey = async (req, res) => {
  try {
    const { id } = req.params;
    
    const apiKey = await prisma.apiKey.findUnique({ where: { id } });
    if (!apiKey || apiKey.tenantId !== req.user.tenantId) {
      return res.status(404).json({ error: 'API key not found' });
    }
    
    await prisma.apiKey.delete({ where: { id } });
    
    await prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        action: 'API_KEY_REVOKED',
        details: `Revoked API key ID: ${id}`,
        tenantId: req.user.tenantId
      }
    });
    
    res.json({ message: 'API key revoked successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// --- Webhooks ---
exports.createWebhook = async (req, res) => {
  try {
    const { eventType, targetUrl } = req.body;
    
    const webhook = await prisma.webhookSubscription.create({
      data: {
        eventType,
        targetUrl,
        tenantId: req.user.tenantId
      }
    });
    
    res.status(201).json(webhook);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getWebhooks = async (req, res) => {
  try {
    const webhooks = await prisma.webhookSubscription.findMany({
      where: { tenantId: req.user.tenantId }
    });
    res.json(webhooks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteWebhook = async (req, res) => {
  try {
    const { id } = req.params;
    
    const webhook = await prisma.webhookSubscription.findUnique({ where: { id } });
    if (!webhook || webhook.tenantId !== req.user.tenantId) {
      return res.status(404).json({ error: 'Webhook not found' });
    }
    
    await prisma.webhookSubscription.delete({ where: { id } });
    res.json({ message: 'Webhook deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
