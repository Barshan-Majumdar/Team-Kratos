const prisma = require('../config/db');

/**
 * Processes an event from the Outbox and creates an IrisTask if applicable.
 * @param {Object} event The OutboxEvent
 */
async function processEvent(event) {
  if (event.eventType === 'ROSTER_SHORTAGE') {
    // Check if an active IrisTask already exists for this event
    const existingTask = await prisma.basePrisma.irisTask.findUnique({
      where: { sourceEventId: event.id }
    });

    if (existingTask) {
      return; // Already triggered
    }

    // Create the IrisTask in NEW state
    const task = await prisma.basePrisma.irisTask.create({
      data: {
        tenantId: event.tenantId,
        sourceEventId: event.id,
        status: 'NEW'
      }
    });

    // We can directly invoke the proactive Iris analysis service here for MVP
    const { runIrisAnalysis } = require('./proactiveIrisService');
    
    // Run asynchronously to not block the dispatcher
    runIrisAnalysis(task.id).catch(err => console.error("Iris Analysis failed:", err));
  }
}

module.exports = {
  processEvent
};
