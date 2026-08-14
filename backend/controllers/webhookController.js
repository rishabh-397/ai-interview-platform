const pool = require('../config/db');

async function createWebhook(req, res, next) {
  try {
    const { targetUrl, eventType } = req.body;
    if (!targetUrl) return res.status(400).json({ error: 'targetUrl is required' });

    const result = await pool.query(
      'INSERT INTO webhook_subscriptions (user_id, target_url, event_type) VALUES ($1, $2, $3) RETURNING *',
      [req.user.id, targetUrl, eventType || 'interview_completed']
    );
    res.status(201).json({ webhook: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

async function listWebhooks(req, res, next) {
  try {
    const result = await pool.query('SELECT * FROM webhook_subscriptions WHERE user_id = $1', [req.user.id]);
    res.json({ webhooks: result.rows });
  } catch (err) {
    next(err);
  }
}

async function deleteWebhook(req, res, next) {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM webhook_subscriptions WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    res.json({ message: 'Webhook removed' });
  } catch (err) {
    next(err);
  }
}

module.exports = { createWebhook, listWebhooks, deleteWebhook };