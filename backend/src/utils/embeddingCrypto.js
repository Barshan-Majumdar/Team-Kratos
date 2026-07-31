const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';

function getEncryptionKey() {
  const hexKey = process.env.FACE_EMBEDDING_ENCRYPTION_KEY;
  if (!hexKey) {
    return Buffer.from('8f2b3e4a5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f', 'hex');
  }
  return Buffer.from(hexKey, 'hex');
}

function encryptEmbeddings(embeddingsArray) {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const plaintext = Buffer.from(JSON.stringify(embeddingsArray), 'utf8');
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Store iv (12B) + authTag (16B) + ciphertext together as one Bytes blob
  return Buffer.concat([iv, authTag, ciphertext]);
}

function decryptEmbeddings(blob) {
  const key = getEncryptionKey();
  const buffer = Buffer.isBuffer(blob) ? blob : Buffer.from(blob);
  const iv = buffer.subarray(0, 12);
  const authTag = buffer.subarray(12, 28);
  const ciphertext = buffer.subarray(28);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return JSON.parse(plaintext.toString('utf8'));
}

module.exports = { encryptEmbeddings, decryptEmbeddings };
