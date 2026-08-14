const pool = require('../config/db');
const UserModel = require('../models/userModel');

async function exportMyData(req, res, next) {
  try {
    const userId = req.user.id;

    const [user, sessions, answers, badges, schedules, questionProgress] = await Promise.all([
      pool.query('SELECT id, name, email, role, xp, streak_count, created_at FROM users WHERE id = $1', [userId]),
      pool.query('SELECT * FROM interview_sessions WHERE user_id = $1', [userId]),
      pool.query(
        `SELECT sa.* FROM session_answers sa
         JOIN interview_sessions s ON sa.session_id = s.id
         WHERE s.user_id = $1`,
        [userId]
      ),
      pool.query('SELECT badge_code, earned_at FROM user_badges WHERE user_id = $1', [userId]),
      pool.query('SELECT * FROM scheduled_interviews WHERE user_id = $1', [userId]),
      pool.query('SELECT question_id, solved_at FROM question_progress WHERE user_id = $1', [userId]),
    ]);

    const exportData = {
      exported_at: new Date().toISOString(),
      profile: user.rows[0],
      interview_sessions: sessions.rows,
      session_answers: answers.rows,
      badges: badges.rows,
      scheduled_interviews: schedules.rows,
      question_progress: questionProgress.rows,
    };

    res.setHeader('Content-Disposition', 'attachment; filename="my-data-export.json"');
    res.setHeader('Content-Type', 'application/json');
    res.json(exportData);
  } catch (err) {
    next(err);
  }
}

async function deleteMyAccount(req, res, next) {
  try {
    const userId = req.user.id;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password confirmation is required to delete your account' });
    }

    const user = await UserModel.findByEmail(req.user.email);
    const isMatch = await UserModel.comparePassword(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Incorrect password' });
    }

    await pool.query('DELETE FROM users WHERE id = $1', [userId]);

    res.json({ message: 'Account deleted successfully.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { exportMyData, deleteMyAccount };