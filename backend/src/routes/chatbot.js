const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/chatbotController');
const auth = require('../middleware/auth');
const authorize = require('../middleware/role');
const { chatTenantRateLimiter, chatUserRateLimiter } = require('../middleware/chatbotRateLimit');

router.use(auth, authorize(1));  // Level 0/1 gate on ALL routes — no exceptions

router.post('/query',              chatTenantRateLimiter, chatUserRateLimiter, ctrl.query);
router.get('/sessions',            ctrl.listSessions);
router.get('/sessions/:id',        ctrl.getSession);
router.delete('/sessions/:id',     ctrl.deleteSession);
router.post('/documents/upload',   ctrl.upload.single('document'), ctrl.uploadDocument);
router.get('/documents',           ctrl.listDocuments);
router.patch('/messages/:id/feedback', ctrl.submitFeedback);

module.exports = router;
