const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const UserModel = {
  async create({ name, email, password }) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const result = await pool.query(
      `INSERT INTO users (name, email, password, verification_token)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role, xp, is_verified, created_at`,
      [name, email, hashedPassword, verificationToken]
    );
    return { ...result.rows[0], verificationToken };
  },

  async verifyByToken(token) {
    const result = await pool.query(
      `UPDATE users SET is_verified = TRUE, verification_token = NULL
       WHERE verification_token = $1
       RETURNING id, name, email, is_verified`,
      [token]
    );
    return result.rows[0];
  },

  async findByEmail(email) {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0];
  },

  async findById(id) {
    const result = await pool.query(
      'SELECT id, name, email, role, xp, streak_count, created_at FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0];
  },

  async comparePassword(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword);
  },

  async addXP(userId, points) {
    const result = await pool.query(
      'UPDATE users SET xp = xp + $1 WHERE id = $2 RETURNING xp',
      [points, userId]
    );
    return result.rows[0];
  },

  async updateStreak(userId) {
    const result = await pool.query(
      `UPDATE users SET
        streak_count = CASE
          WHEN last_active_date = CURRENT_DATE - INTERVAL '1 day' THEN streak_count + 1
          WHEN last_active_date = CURRENT_DATE THEN streak_count
          ELSE 1
        END,
        last_active_date = CURRENT_DATE
       WHERE id = $1
       RETURNING streak_count`,
      [userId]
    );
    return result.rows[0];
  },

  async updatePassword(userId, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, userId]);
  },
};

module.exports = UserModel;