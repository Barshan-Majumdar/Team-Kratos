const prisma = require('../config/db');

/**
 * Creates an event in the outbox.
 * This should ideally be called within an existing Prisma transaction.
 * 
 * @param {Object} tx - The Prisma transaction client (or base client if no tx is available).
 * @param {Object} event - The event details.
 */
async function publishEvent(tx, { tenantId, eventType, sourceEntity, sourceEntityId, payload, idempotencyKey }) {
  // Use basePrisma to avoid tenant context issues in background jobs
  const db = tx || prisma.basePrisma;
  
  try {
    return await db.outboxEvent.create({
      data: {
        tenantId,
        eventType,
        sourceEntity,
        sourceEntityId,
        payload,
        idempotencyKey
      }
    });
  } catch (err) {
    if (err.code === 'P2002') {
      // Idempotency key collision, ignore
      return null;
    }
    throw err;
  }
}

module.exports = {
  publishEvent
};
