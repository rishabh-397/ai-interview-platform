const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { matchResume } = require('../controllers/resumeController');

router.post('/match', authenticate, matchResume);

module.exports = router;