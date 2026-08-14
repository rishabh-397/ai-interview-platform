const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { runCode } = require('../controllers/codeExecutionController');

router.post('/run', authenticate, runCode);

module.exports = router;