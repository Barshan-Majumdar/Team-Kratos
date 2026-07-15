const axios = require('axios');
const prisma = require('../config/db');

/**
 * Dispatches an event to all subscribed webhooks for a tenant.
 * @param {string} tenantId - The tenant's ID
 * @param {string} eventType - The event type (e.g. 'user.created', 'attendance.checkin')
 * @param {object} payload - The data payload for the webhook
 */
const dispatchWebhook = async (tenantId, eventType, payload) => {
  try {
    const subscriptions = await prisma.webhookSubscription.findMany({
      where: { tenantId, eventType }
    });

    if (subscriptions.length === 0) return;

    const promises = subscriptions.map(sub => {
      // Dispatch async without awaiting the response directly in the loop to avoid blocking
      return axios.post(sub.targetUrl, {
        event: eventType,
        timestamp: new Date().toISOString(),
        data: payload
      }, {
        timeout: 5000,
        headers: { 'Content-Type': 'application/json' }
      }).catch(err => {
        console.error(`Webhook dispatch failed for ${sub.targetUrl}:`, err.message);
        // Optionally: we could log failure to a WebhookDeliveryLog table for retries
      });
    });

    await Promise.allSettled(promises);
  } catch (error) {
    console.error('Error fetching webhook subscriptions:', error.message);
  }
};

module.exports = { dispatchWebhook };
