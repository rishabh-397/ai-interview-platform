const pool = require('../config/db');

const BADGE_DEFINITIONS = {
  first_interview: { label: 'First Steps', icon: '🎯', description: 'Completed your first mock interview' },
  streak_3: { label: '3-Day Streak', icon: '🔥', description: 'Practiced 3 days in a row' },
  streak_7: { label: '7-Day Streak', icon: '🔥🔥', description: 'Practiced 7 days in a row' },
  ten_interviews: { label: 'Dedicated', icon: '📚', description: 'Completed 10 mock interviews' },
  high_scorer: { label: 'High Scorer', icon: '⭐', description: 'Scored 90+ on an interview' },
  dsa_master: { label: 'DSA Master', icon: '🧠', description: 'Averaged 80+ on DSA questions across 3+ interviews' },
};

async function checkAndAwardBadges(userId) {
  const newlyAwarded = [];

  const sessionsResult = await pool.query(
    `SELECT s.*, array_agg(DISTINCT q.category) FILTER (WHERE q.category IS NOT NULL) as categories
     FROM interview_sessions s
     LEFT JOIN session_answers sa ON sa.session_id = s.id
     LEFT JOIN questions q ON sa.question_id = q.id
     WHERE s.user_id = $1 AND s.status = 'completed'
     GROUP BY s.id`,
    [userId]
  );
  const completedSessions = sessionsResult.rows;

  const userResult = await pool.query('SELECT streak_count FROM users WHERE id = $1', [userId]);
  const streak = userResult.rows[0]?.streak_count || 0;

  const candidateBadges = [];

  if (completedSessions.length >= 1) candidateBadges.push('first_interview');
  if (completedSessions.length >= 10) candidateBadges.push('ten_interviews');
  if (streak >= 3) candidateBadges.push('streak_3');
  if (streak >= 7) candidateBadges.push('streak_7');
  if (completedSessions.some((s) => parseFloat(s.overall_score) >= 90)) candidateBadges.push('high_scorer');

  const dsaScoresResult = await pool.query(
    `SELECT AVG(sa.ai_score) as avg_score, COUNT(DISTINCT sa.session_id) as session_count
     FROM session_answers sa
     JOIN questions q ON sa.question_id = q.id
     JOIN interview_sessions s ON sa.session_id = s.id
     WHERE s.user_id = $1 AND q.category = 'DSA' AND s.status = 'completed'`,
    [userId]
  );
  const dsaRow = dsaScoresResult.rows[0];
  if (dsaRow.session_count >= 3 && parseFloat(dsaRow.avg_score) >= 80) {
    candidateBadges.push('dsa_master');
  }

  for (const badgeCode of candidateBadges) {
    const result = await pool.query(
      `INSERT INTO user_badges (user_id, badge_code) VALUES ($1, $2)
       ON CONFLICT (user_id, badge_code) DO NOTHING
       RETURNING badge_code`,
      [userId, badgeCode]
    );
    if (result.rows.length > 0) newlyAwarded.push(badgeCode);
  }

  return newlyAwarded;
}

async function getUserBadges(userId) {
  const result = await pool.query(
    'SELECT badge_code, earned_at FROM user_badges WHERE user_id = $1 ORDER BY earned_at DESC',
    [userId]
  );
  return result.rows.map((row) => ({
    code: row.badge_code,
    earnedAt: row.earned_at,
    ...BADGE_DEFINITIONS[row.badge_code],
  }));
}

module.exports = { checkAndAwardBadges, getUserBadges, BADGE_DEFINITIONS };