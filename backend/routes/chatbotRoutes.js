const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { sendMessage } = require('../controllers/chatbotController');

router.post('/message', authenticate, sendMessage);

module.exports = router;