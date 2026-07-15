const express = require('express');
const { createApiKey, getApiKeys, revokeApiKey, createWebhook, getWebhooks, deleteWebhook } = require('../controllers/developerSettingsController');
const auth = require('../middleware/auth');

const router = express.Router();

const authorizeAdmin = (req, res, next) => {
  if (req.user && (req.user.role === 'Admin' || req.user.role === 'SuperAdmin' || req.user.role === 'CEO')) {
    next();
  } else {
    res.status(403).json({ error: 'Access denied. Admins only.' });
  }
};

router.use(auth, authorizeAdmin);

router.post('/api-keys', createApiKey);
router.get('/api-keys', getApiKeys);
router.delete('/api-keys/:id', revokeApiKey);

router.post('/webhooks', createWebhook);
router.get('/webhooks', getWebhooks);
router.delete('/webhooks/:id', deleteWebhook);

module.exports = router;
