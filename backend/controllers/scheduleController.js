const pool = require('../config/db');

async function createSchedule(req, res, next) {
  try {
    const { scheduledAt, notes, companyId } = req.body;
    if (!scheduledAt) return res.status(400).json({ error: 'scheduledAt is required' });

    const result = await pool.query(
      `INSERT INTO scheduled_interviews (user_id, company_id, scheduled_at, notes)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.user.id, companyId || null, scheduledAt, notes || null]
    );
    res.status(201).json({ schedule: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

async function listSchedules(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT si.*, c.name as company_name
       FROM scheduled_interviews si
       LEFT JOIN companies c ON si.company_id = c.id
       WHERE si.user_id = $1
       ORDER BY si.scheduled_at ASC`,
      [req.user.id]
    );
    res.json({ schedules: result.rows });
  } catch (err) {
    next(err);
  }
}

async function deleteSchedule(req, res, next) {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM scheduled_interviews WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    res.json({ message: 'Schedule removed' });
  } catch (err) {
    next(err);
  }
}

module.exports = { createSchedule, listSchedules, deleteSchedule };