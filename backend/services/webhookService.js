const axios = require('axios');
const pool = require('../config/db');

/**
 * Fires registered webhooks for a given user/event — e.g. notifying an external
 * ATS (Applicant Tracking System) whenever a candidate completes a mock interview.
 */
async function triggerWebhooks(userId, eventType, payload) {
  try {
    const result = await pool.query(
      'SELECT * FROM webhook_subscriptions WHERE user_id = $1 AND event_type = $2',
      [userId, eventType]
    );

    for (const sub of result.rows) {
      axios.post(sub.target_url, { event: eventType, data: payload, timestamp: new Date().toISOString() }, { timeout: 5000 })
        .catch((err) => console.error(`Webhook delivery failed for ${sub.target_url}:`, err.message));
    }
  } catch (err) {
    console.error('triggerWebhooks error:', err);
  }
}

module.exports = { triggerWebhooks };