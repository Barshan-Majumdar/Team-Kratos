const rateLimit = require('express-rate-limit');

// Per-user: 15 req/min — generous for real HR use, blocks scripted abuse
const chatUserRateLimiter = rateLimit({
  windowMs: 60_000, max: 15,
  keyGenerator: (req) => `chatbot:user:${req.user.tenantId}:${req.user.id}`,
  message: { error: 'Too many requests. Please wait before asking again.' },
});

// Per-tenant: 60 req/min — one compromised account can't burn the whole org's budget
const chatTenantRateLimiter = rateLimit({
  windowMs: 60_000, max: 60,
  keyGenerator: (req) => `chatbot:tenant:${req.user.tenantId}`,
  message: { error: 'Tenant query limit reached. Please wait a moment.' },
});

module.exports = { chatUserRateLimiter, chatTenantRateLimiter };
