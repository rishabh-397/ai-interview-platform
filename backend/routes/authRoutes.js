const express = require('express');
const router = express.Router();
const { signup, login, refresh, logout, verifyEmail, forgotPassword, resetPassword, googleLogin } = require('../controllers/authController');

router.post('/signup', signup);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/verify-email', verifyEmail);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/google', googleLogin);

module.exports = router;