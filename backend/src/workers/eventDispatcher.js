const prisma = require('../config/db');
const { processEvent } = require('../services/triggerEngine');

/**
 * Worker that polls the OutboxEvent table and dispatches events to the TriggerEngine.
 */
class EventDispatcher {
  constructor() {
    this.intervalId = null;
    this.isProcessing = false;
    this.pollIntervalMs = 5000; // 5 seconds
    this.consecutiveErrors = 0;
    this.backoffMs = 0;
  }

  start() {
    if (this.intervalId) return;
    console.log('Starting Event Dispatcher...');
    this.intervalId = setInterval(() => this.poll(), this.pollIntervalMs);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async poll() {
    if (this.isProcessing) return;

    // Exponential backoff when DB connection keeps failing
    if (this.backoffMs > 0) {
      await new Promise(r => setTimeout(r, this.backoffMs));
    }

    this.isProcessing = true;

    try {
      // 1. Fetch pending events with lock using Postgres SKIP LOCKED
      // This prevents multiple worker instances from picking up the same events
      const eventsToProcess = await prisma.basePrisma.$queryRaw`
        SELECT id FROM "OutboxEvent"
        WHERE status = 'PENDING'
        ORDER BY "createdAt" ASC
        LIMIT 10
        FOR UPDATE SKIP LOCKED
      `;

      // Successful query — reset backoff
      this.consecutiveErrors = 0;
      this.backoffMs = 0;

      if (!eventsToProcess || eventsToProcess.length === 0) {
        this.isProcessing = false;
        return;
      }

      const eventIds = eventsToProcess.map(e => e.id);

      // Fetch the full event data
      const events = await prisma.basePrisma.outboxEvent.findMany({
        where: { id: { in: eventIds } }
      });

      // 2. Process each event
      for (const event of events) {
        try {
          await processEvent(event);
          
          // Mark as processed
          await prisma.basePrisma.outboxEvent.update({
            where: { id: event.id },
            data: { status: 'PROCESSED', processedAt: new Date() }
          });
        } catch (error) {
          console.error(`Failed to process OutboxEvent ${event.id}:`, error);
          
          // Mark as failed or increment retry
          await prisma.basePrisma.outboxEvent.update({
            where: { id: event.id },
            data: { 
              status: event.retryCount >= 3 ? 'FAILED' : 'PENDING',
              retryCount: { increment: 1 }
            }
          });
        }
      }

    } catch (error) {
      const isConnectionReset = 
        error?.code === 'P1017' ||
        error?.code === 'P1001' ||
        error?.code === 'P1002' ||
        error?.name === 'PrismaClientInitializationError' ||
        error?.message?.includes('Server has closed the connection') ||
        error?.message?.includes('Connection reset') ||
        error?.message?.includes("Can't reach database server") ||
        error?.message?.includes('ECONNRESET') ||
        error?.message?.includes('ETIMEDOUT');

      if (isConnectionReset) {
        this.consecutiveErrors++;
        // Exponential backoff: 3s, 6s, 12s, max 30s
        this.backoffMs = Math.min(3000 * Math.pow(2, this.consecutiveErrors - 1), 30000);
        console.warn(`[EventDispatcher] DB connection temporarily unavailable/reset (${error?.name || error?.code || 'Reset'}). Attempt ${this.consecutiveErrors}, retrying in ${this.backoffMs / 1000}s...`);
        
        // Force Prisma to drop stale connections. It will auto-reconnect on next poll query.
        try { await prisma.basePrisma.$disconnect(); } catch (_) {}
      } else {
        console.error('EventDispatcher Polling Error:', error);
      }
    } finally {
      this.isProcessing = false;
    }
  }
}

module.exports = new EventDispatcher();
