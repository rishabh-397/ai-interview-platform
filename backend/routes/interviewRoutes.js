const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { authenticate } = require('../middleware/auth');
const {
  startInterview,
  submitAnswer,
  completeInterview,
  getHistory,
  getReport,
  terminateInterview,
  getAdaptiveNextQuestion,
} = require('../controllers/interviewController');

router.use(authenticate);

const perUserAiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests — please slow down.' },
  keyGenerator: (req) => req.user?.id?.toString() || req.ip,
});
router.use(perUserAiLimiter);

router.post('/start', startInterview);
router.post('/answer', submitAnswer);
router.post('/adaptive-next', getAdaptiveNextQuestion);
router.post('/:sessionId/terminate', terminateInterview);
router.post('/:sessionId/complete', completeInterview);
router.get('/history', getHistory);
router.get('/:sessionId/report', getReport);

module.exports = router;