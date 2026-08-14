const axios = require('axios');

/**
 * Posts a message to a Slack (or Discord, both accept the same simple JSON shape)
 * incoming webhook, if one is configured. Silently no-ops otherwise.
 */
async function sendAdminAlert(message) {
  if (!process.env.SLACK_WEBHOOK_URL) return;

  try {
    await axios.post(process.env.SLACK_WEBHOOK_URL, { text: message });
  } catch (err) {
    console.error('Failed to send admin alert:', err.message);
  }
}

module.exports = { sendAdminAlert };