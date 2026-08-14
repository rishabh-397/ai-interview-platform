const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { listQuestions, getProgress, toggleSolved, getQuestion, answerQuestion } = require('../controllers/questionBankController');

router.get('/', authenticate, listQuestions);
router.get('/progress', authenticate, getProgress);
router.get('/:questionId', authenticate, getQuestion);
router.post('/:questionId/toggle-solved', authenticate, toggleSolved);
router.post('/:questionId/answer', authenticate, answerQuestion);

module.exports = router;