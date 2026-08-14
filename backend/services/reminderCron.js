const cron = require('node-cron');
const pool = require('../config/db');
const { sendScheduleReminderEmail } = require('./emailService');

/**
 * Runs every hour. Finds scheduled interviews happening in the next 24 hours
 * that haven't had a reminder sent yet, emails the candidate, and marks them notified.
 */
function startReminderCron() {
  cron.schedule('0 * * * *', async () => {
    try {
      const result = await pool.query(
        `SELECT si.*, u.name, u.email
         FROM scheduled_interviews si
         JOIN users u ON si.user_id = u.id
         WHERE si.reminder_sent = FALSE
           AND si.scheduled_at BETWEEN NOW() AND NOW() + INTERVAL '24 hours'`
      );

      for (const row of result.rows) {
        await sendScheduleReminderEmail(row.email, row.name, row.scheduled_at, row.notes);
        await pool.query('UPDATE scheduled_interviews SET reminder_sent = TRUE WHERE id = $1', [row.id]);
      }

      if (result.rows.length > 0) {
        console.log(`Reminder cron: sent ${result.rows.length} reminder email(s)`);
      }
    } catch (err) {
      console.error('Reminder cron error:', err);
    }
  });

  console.log('Reminder cron scheduled (runs hourly)');
}

module.exports = startReminderCron;