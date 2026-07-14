const { AsyncLocalStorage } = require('async_hooks');

// This holds the tenantId context for the current request
const tenantStorage = new AsyncLocalStorage();

module.exports = tenantStorage;
