const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const pool = require('../config/db');
const UserModel = require('../models/userModel');
const redisClient = require('../config/redis');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../services/emailService');
require('dotenv').config();

function generateTokens(user) {
  const payload = { id: user.id, email: user.email, role: user.role };

  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });

  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });

  return { accessToken, refreshToken };
}

async function signup(req, res, next) {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const existing = await UserModel.findByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const user = await UserModel.create({ name, email, password });
    const tokens = generateTokens(user);

    await redisClient.set(`refresh:${user.id}`, tokens.refreshToken, { EX: 7 * 24 * 60 * 60 });

    sendVerificationEmail(user.email, user.name, user.verificationToken).catch((err) =>
      console.error('Failed to send verification email:', err)
    );

    const { verificationToken, ...safeUser } = user;
    res.status(201).json({ user: safeUser, ...tokens });
  } catch (err) {
    next(err);
  }
}

async function verifyEmail(req, res, next) {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: 'Verification token is required' });

    const user = await UserModel.verifyByToken(token);
    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired verification link' });
    }

    res.json({ message: 'Email verified successfully', user });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = await UserModel.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await UserModel.comparePassword(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const tokens = generateTokens(user);
    await redisClient.set(`refresh:${user.id}`, tokens.refreshToken, { EX: 7 * 24 * 60 * 60 });
    await UserModel.updateStreak(user.id);

    delete user.password;
    res.json({ user, ...tokens });
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ error: 'Refresh token required' });

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const stored = await redisClient.get(`refresh:${decoded.id}`);

    if (stored !== refreshToken) {
      return res.status(401).json({ error: 'Refresh token revoked or invalid' });
    }

    const tokens = generateTokens(decoded);
    await redisClient.set(`refresh:${decoded.id}`, tokens.refreshToken, { EX: 7 * 24 * 60 * 60 });

    res.json(tokens);
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
}

async function logout(req, res, next) {
  try {
    const { userId } = req.body;
    await redisClient.del(`refresh:${userId}`);
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
}

async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = await UserModel.findByEmail(email);

    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      await redisClient.set(`password-reset:${resetToken}`, user.id, { EX: 15 * 60 });

      sendPasswordResetEmail(user.email, user.name, resetToken).catch((err) =>
        console.error('Failed to send password reset email:', err)
      );
    }

    res.json({ message: 'If that email is registered, a reset link has been sent.' });
  } catch (err) {
    next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const userId = await redisClient.get(`password-reset:${token}`);
    if (!userId) {
      return res.status(400).json({ error: 'Invalid or expired reset link' });
    }

    await UserModel.updatePassword(userId, newPassword);
    await redisClient.del(`password-reset:${token}`);
    await redisClient.del(`refresh:${userId}`);

    res.json({ message: 'Password reset successfully. Please log in with your new password.' });
  } catch (err) {
    next(err);
  }
}

async function googleLogin(req, res, next) {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ error: 'Google credential is required' });

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { email, name } = payload;

    let user = await UserModel.findByEmail(email);

    if (!user) {
      const randomPassword = crypto.randomBytes(32).toString('hex');
      const created = await UserModel.create({ name, email, password: randomPassword });
      await pool.query('UPDATE users SET is_verified = TRUE WHERE id = $1', [created.id]);
      user = await UserModel.findByEmail(email);
    }

    const tokens = generateTokens(user);
    await redisClient.set(`refresh:${user.id}`, tokens.refreshToken, { EX: 7 * 24 * 60 * 60 });
    await UserModel.updateStreak(user.id);

    delete user.password;
    res.json({ user, ...tokens });
  } catch (err) {
    console.error('Google login error:', err.message);
    res.status(401).json({ error: 'Google sign-in failed. Please try again.' });
  }
}

module.exports = { signup, login, refresh, logout, verifyEmail, forgotPassword, resetPassword, googleLogin };