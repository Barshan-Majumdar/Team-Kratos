const express = require('express');
const { createApiKey, getApiKeys, revokeApiKey, createWebhook, getWebhooks, deleteWebhook } = require('../controllers/developerSettingsController');
const auth = require('../middleware/auth');

const router = express.Router();

const authorize = require('../middleware/role');

router.use(auth, authorize(1));

router.post('/api-keys', createApiKey);
router.get('/api-keys', getApiKeys);
router.delete('/api-keys/:id', revokeApiKey);

router.post('/webhooks', createWebhook);
router.get('/webhooks', getWebhooks);
router.delete('/webhooks/:id', deleteWebhook);

module.exports = router;
