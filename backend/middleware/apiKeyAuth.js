const pool = require('../config/db');

/**
 * Alternative auth for external/public API consumers — a simple X-API-Key header
 * instead of a JWT. Attaches the owning user's id to req for downstream use.
 */
async function apiKeyAuth(req, res, next) {
  const key = req.headers['x-api-key'];
  if (!key) return res.status(401).json({ error: 'Missing X-API-Key header' });

  try {
    const result = await pool.query('SELECT * FROM api_keys WHERE api_key = $1', [key]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid API key' });

    pool.query('UPDATE api_keys SET last_used_at = NOW() WHERE id = $1', [result.rows[0].id]).catch(() => {});
    req.apiUser = { id: result.rows[0].user_id };
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = apiKeyAuth;