const axios = require('axios');
require('dotenv').config();

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

async function sendEmail({ to, subject, htmlContent }) {
  try {
    await axios.post(
      BREVO_API_URL,
      {
        sender: {
          name: 'AI Interview Platform',
          email: process.env.BREVO_SENDER_EMAIL,
        },
        to: [{ email: to }],
        subject,
        htmlContent,
      },
      {
        headers: {
          'api-key': process.env.BREVO_API_KEY,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      }
    );
    return true;
  } catch (err) {
    console.error('Brevo email error:', err.response?.data || err.message);
    return false;
  }
}

async function sendVerificationEmail(toEmail, name, token) {
  const verifyUrl = `${process.env.CLIENT_URL}/verify-email?token=${token}`;
  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: auto;">
      <h2>Welcome to AI Interview Platform, ${name}!</h2>
      <p>Please confirm your email address to activate your account.</p>
      <a href="${verifyUrl}" style="display:inline-block; padding:12px 24px; background:#5b8def; color:white; text-decoration:none; border-radius:6px;">
        Verify My Email
      </a>
      <p style="color:#888; font-size:12px; margin-top:20px;">If you didn't create this account, you can ignore this email.</p>
    </div>
  `;
  return sendEmail({ to: toEmail, subject: 'Verify your email', htmlContent: html });
}

async function sendInterviewCompleteEmail(toEmail, name, score) {
  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: auto;">
      <h2>Your Interview Report is Ready</h2>
      <p>Hi ${name}, you scored <strong>${score}/100</strong> on your recent mock interview.</p>
      <p>Log in to view your detailed feedback and areas to improve.</p>
    </div>
  `;
  return sendEmail({ to: toEmail, subject: 'Your interview report is ready', htmlContent: html });
}

async function sendPasswordResetEmail(toEmail, name, token) {
  const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${token}`;
  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: auto;">
      <h2>Reset your password</h2>
      <p>Hi ${name}, we received a request to reset your password.</p>
      <a href="${resetUrl}" style="display:inline-block; padding:12px 24px; background:#5b8def; color:white; text-decoration:none; border-radius:6px;">
        Reset My Password
      </a>
      <p style="color:#888; font-size:12px; margin-top:20px;">This link expires in 15 minutes. If you didn't request this, you can safely ignore this email.</p>
    </div>
  `;
  return sendEmail({ to: toEmail, subject: 'Reset your password', htmlContent: html });
}

async function sendScheduleReminderEmail(toEmail, name, scheduledAt, notes) {
  const formattedTime = new Date(scheduledAt).toLocaleString();
  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: auto;">
      <h2>Upcoming Practice Interview Reminder</h2>
      <p>Hi ${name}, this is a reminder for your scheduled mock interview at <strong>${formattedTime}</strong>.</p>
      ${notes ? `<p>Notes: ${notes}</p>` : ''}
      <p>Log in whenever you're ready to start practicing.</p>
    </div>
  `;
  return sendEmail({ to: toEmail, subject: 'Reminder: upcoming mock interview', htmlContent: html });
}

module.exports = { sendVerificationEmail, sendInterviewCompleteEmail, sendPasswordResetEmail, sendScheduleReminderEmail };