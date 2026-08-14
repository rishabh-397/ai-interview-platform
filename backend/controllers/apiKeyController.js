const crypto = require('crypto');
const pool = require('../config/db');

async function createApiKey(req, res, next) {
  try {
    const { name } = req.body;
    const apiKey = crypto.randomBytes(24).toString('hex');

    const result = await pool.query(
      'INSERT INTO api_keys (user_id, api_key, name) VALUES ($1, $2, $3) RETURNING id, api_key, name, created_at',
      [req.user.id, apiKey, name || 'Unnamed key']
    );

    res.status(201).json({ apiKey: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

async function listApiKeys(req, res, next) {
  try {
    const result = await pool.query(
      'SELECT id, name, created_at, last_used_at, LEFT(api_key, 8) || \'...\' as masked_key FROM api_keys WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json({ keys: result.rows });
  } catch (err) {
    next(err);
  }
}

async function revokeApiKey(req, res, next) {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM api_keys WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    res.json({ message: 'API key revoked' });
  } catch (err) {
    next(err);
  }
}

module.exports = { createApiKey, listApiKeys, revokeApiKey };