const express = require('express');
const router = express.Router();
const apiKeyAuth = require('../middleware/apiKeyAuth');
const pool = require('../config/db');

/**
 * Demonstrates a public API surface — e.g. a college placement portal could use
 * this to pull a candidate's interview stats without needing their login session.
 */
router.get('/my-stats', apiKeyAuth, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT COUNT(*) as total_interviews, AVG(overall_score) as avg_score
       FROM interview_sessions WHERE user_id = $1 AND status = 'completed'`,
      [req.apiUser.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;