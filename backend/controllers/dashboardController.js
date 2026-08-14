const pool = require('../config/db');

async function getLeaderboard(req, res, next) {
  try {
    const { category } = req.query; // 'overall' | 'DSA' | 'System Design' | 'Behavioural' | 'HR'

    let result;
    if (!category || category === 'overall') {
      result = await pool.query(
        `SELECT u.id, u.name, u.xp,
                AVG(s.overall_score) AS avg_score,
                COUNT(s.id) AS interviews_taken
         FROM users u
         JOIN interview_sessions s ON s.user_id = u.id AND s.status = 'completed'
         GROUP BY u.id
         ORDER BY avg_score DESC NULLS LAST
         LIMIT 50`
      );
    } else {
      // Category-specific leaderboard: average score on answers within that category only
      result = await pool.query(
        `SELECT u.id, u.name, u.xp,
                AVG(sa.ai_score) AS avg_score,
                COUNT(DISTINCT sa.session_id) AS interviews_taken
         FROM users u
         JOIN interview_sessions s ON s.user_id = u.id AND s.status = 'completed'
         JOIN session_answers sa ON sa.session_id = s.id
         JOIN questions q ON sa.question_id = q.id AND q.category = $1
         GROUP BY u.id
         ORDER BY avg_score DESC NULLS LAST
         LIMIT 50`,
        [category]
      );
    }

    res.json({ leaderboard: result.rows });
  } catch (err) {
    next(err);
  }
}

async function getAverageScore(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT AVG(overall_score) as avg_score, COUNT(*) as total_completed
       FROM interview_sessions WHERE status = 'completed'`
    );
    res.json({
      averageScore: result.rows[0].avg_score ? parseFloat(result.rows[0].avg_score).toFixed(2) : null,
      totalCompleted: parseInt(result.rows[0].total_completed, 10),
    });
  } catch (err) {
    next(err);
  }
}
async function getAdminStats(req, res, next) {
  try {
    const totalUsers = await pool.query('SELECT COUNT(*) FROM users');
    const totalSessions = await pool.query('SELECT COUNT(*) FROM interview_sessions');
    const completedSessions = await pool.query(
      `SELECT COUNT(*) FROM interview_sessions WHERE status = 'completed'`
    );
    const avgScoreByCategory = await pool.query(
      `SELECT q.category, AVG(sa.ai_score) as avg_score
       FROM session_answers sa
       JOIN questions q ON sa.question_id = q.id
       GROUP BY q.category`
    );

    res.json({
      totalUsers: totalUsers.rows[0].count,
      totalSessions: totalSessions.rows[0].count,
      completedSessions: completedSessions.rows[0].count,
      avgScoreByCategory: avgScoreByCategory.rows,
    });
  } catch (err) {
    next(err);
  }
}

async function getLiveSessions(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT s.id, s.started_at, u.name as candidate_name, c.name as company_name,
              (SELECT MAX(answered_at) FROM session_answers WHERE session_id = s.id) as last_activity
       FROM interview_sessions s
       JOIN users u ON s.user_id = u.id
       LEFT JOIN companies c ON s.company_id = c.id
       WHERE s.status = 'in_progress'
       ORDER BY s.started_at DESC`
    );
    res.json({ liveSessions: result.rows });
  } catch (err) {
    next(err);
  }
}

async function getAuditLog(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT al.*, u.name as admin_name
       FROM audit_log al
       LEFT JOIN users u ON al.admin_user_id = u.id
       ORDER BY al.created_at DESC
       LIMIT 100`
    );
    res.json({ entries: result.rows });
  } catch (err) {
    next(err);
  }
}

module.exports = { getLeaderboard, getAdminStats, getAverageScore, getLiveSessions, getAuditLog };