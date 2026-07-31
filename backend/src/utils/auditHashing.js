const crypto = require('crypto');

function generateAuditHash(prevHash, payload) {
  const dataString = prevHash + JSON.stringify(payload);
  return crypto.createHash('sha256').update(dataString).digest('hex');
}

module.exports = { generateAuditHash };
