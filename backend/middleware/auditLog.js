const pool = require('../config/db');

function auditLog(action) {
  return (req, res, next) => {
    pool
      .query('INSERT INTO audit_log (admin_user_id, action, details) VALUES ($1, $2, $3)', [
        req.user?.id || null,
        action,
        JSON.stringify({ path: req.originalUrl, method: req.method, params: req.params, query: req.query }),
      ])
      .catch((err) => console.error('Audit log write failed:', err));
    next();
  };
}

module.exports = auditLog;