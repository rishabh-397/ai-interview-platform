const InterviewModel = require('../models/interviewModel');
const UserModel = require('../models/userModel');
const aiService = require('../services/aiService');
const { checkAndAwardBadges } = require('../services/badgeService');
const { checkSimilarity } = require('../services/similarityChecker');
const { sendInterviewCompleteEmail } = require('../services/emailService');
const { triggerWebhooks } = require('../services/webhookService');
const pool = require('../config/db');

async function startInterview(req, res, next) {
  try {
    const { companyId, questionCount } = req.body;
    const userId = req.user.id;

    // Clamp to a sane range so the client can't request an absurd/zero amount
    const count = Math.min(Math.max(parseInt(questionCount, 10) || 5, 1), 25);

    const session = await InterviewModel.createSession(userId, companyId);
    const questions = await InterviewModel.getPersonalizedQuestions(userId, companyId, count);

    res.status(201).json({ session, questions });
  } catch (err) {
    next(err);
  }
}

async function submitAnswer(req, res, next) {
  try {
    const { sessionId, questionId, answerText, codeSubmission, questionText, expectedKeywords, persona } = req.body;

    const aiResult = await aiService.evaluateAnswer({
      questionText,
      answerText,
      expectedKeywords,
      persona,
    });

    // Similarity check: compare this code submission against others for the same question
    let similarity = { maxSimilarity: 0, flagged: false };
    if (codeSubmission && codeSubmission.trim().length > 20) {
      const priorResult = await pool.query(
        `SELECT code_submission FROM session_answers
         WHERE question_id = $1 AND session_id != $2 AND code_submission IS NOT NULL
         LIMIT 50`,
        [questionId, sessionId]
      );
      similarity = checkSimilarity(codeSubmission, priorResult.rows.map((r) => r.code_submission));
    }

    const saved = await InterviewModel.saveAnswer({
      sessionId,
      questionId,
      answerText,
      codeSubmission,
      aiFeedback: aiResult.feedback,
      aiScore: aiResult.score,
      fillerWordCount: aiResult.filler_word_count,
    });

    // Optional bonus follow-up question — doesn't block the main flow if it fails
    const followUpQuestion = await aiService.generateFollowUpQuestion({
      previousQuestion: questionText,
      previousAnswer: answerText,
    });

    res.status(201).json({ answer: saved, aiResult, followUpQuestion, similarity });
  } catch (err) {
    next(err);
  }
}

async function completeInterview(req, res, next) {
  try {
    const { sessionId } = req.params;
    const { session, answers } = await InterviewModel.getSessionWithAnswers(sessionId);

    if (!answers.length) {
      return res.status(400).json({ error: 'No answers found for this session' });
    }

    const avg = (list) =>
      list.length ? list.reduce((sum, a) => sum + parseFloat(a.ai_score || 0), 0) / list.length : null;

    const overallScore = avg(answers);

    // Technical ability: DSA + System Design questions
    const technicalAnswers = answers.filter((a) => ['DSA', 'System Design'].includes(a.category));
    // Communication ability: Behavioural + HR questions
    const communicationAnswers = answers.filter((a) => ['Behavioural', 'HR'].includes(a.category));

    const technicalScore = avg(technicalAnswers) ?? overallScore;
    const communicationScore = avg(communicationAnswers) ?? overallScore;

    // Confidence: derived from filler-word usage — fewer fillers relative to answer count = higher confidence.
    // Each filler word softly reduces the score, floored at 0.
    const avgFillerWords =
      answers.reduce((sum, a) => sum + (a.filler_word_count || 0), 0) / answers.length;
    const confidenceScore = Math.max(0, Math.min(100, overallScore - avgFillerWords * 4));

    const scores = {
      overall: overallScore.toFixed(2),
      communication: communicationScore.toFixed(2),
      technical: technicalScore.toFixed(2),
      confidence: confidenceScore.toFixed(2),
    };

    const updated = await InterviewModel.completeSession(sessionId, scores);
    await UserModel.addXP(session.user_id, Math.round(overallScore));
    const newBadges = await checkAndAwardBadges(session.user_id);
    triggerWebhooks(session.user_id, 'interview_completed', {
      sessionId: session.id,
      overallScore: overallScore.toFixed(2),
      completedAt: new Date().toISOString(),
    }).catch(() => {});

    // Day 47: notify the candidate their report is ready (fire-and-forget, never blocks the response)
    UserModel.findById(session.user_id)
      .then((user) => {
        if (user) sendInterviewCompleteEmail(user.email, user.name, overallScore.toFixed(1)).catch(() => {});
      })
      .catch(() => {});

    res.json({ session: updated, answers, newBadges });
  } catch (err) {
    next(err);
  }
}

async function getHistory(req, res, next) {
  try {
    const history = await InterviewModel.getSessionHistory(req.user.id);
    res.json({ history });
  } catch (err) {
    next(err);
  }
}

async function getReport(req, res, next) {
  try {
    const { sessionId } = req.params;
    const report = await InterviewModel.getSessionWithAnswers(sessionId);
    res.json(report);
  } catch (err) {
    next(err);
  }
}

/**
 * Day 34: Adaptive difficulty. After grading an answer, call this to possibly swap
 * the *next* question for one of a different difficulty based on running performance —
 * scoring well nudges toward harder questions, struggling nudges toward easier ones.
 */
async function getAdaptiveNextQuestion(req, res, next) {
  try {
    const { category, currentScore, excludeIds } = req.body;
    const excluded = Array.isArray(excludeIds) && excludeIds.length ? excludeIds : [0];

    let targetDifficulty;
    if (currentScore >= 80) targetDifficulty = 'hard';
    else if (currentScore < 40) targetDifficulty = 'easy';
    else targetDifficulty = 'medium';

    // Try the target difficulty first, within the same category if possible, then relax constraints
    const attempts = [
      { category, difficulty: targetDifficulty },
      { category, difficulty: null },
      { category: null, difficulty: targetDifficulty },
    ];

    for (const attempt of attempts) {
      const conditions = ['id != ALL($1::int[])'];
      const params = [excluded];
      let idx = 2;

      if (attempt.category) {
        conditions.push(`category = $${idx}`);
        params.push(attempt.category);
        idx++;
      }
      if (attempt.difficulty) {
        conditions.push(`difficulty = $${idx}`);
        params.push(attempt.difficulty);
        idx++;
      }

      const result = await pool.query(
        `SELECT * FROM questions WHERE ${conditions.join(' AND ')} ORDER BY RANDOM() LIMIT 1`,
        params
      );
      if (result.rows.length > 0) {
        return res.json({ question: result.rows[0], adjustedDifficulty: targetDifficulty });
      }
    }

    res.json({ question: null, adjustedDifficulty: targetDifficulty });
  } catch (err) {
    next(err);
  }
}

async function terminateInterview(req, res, next) {
  try {
    const { sessionId } = req.params;
    const { reason } = req.body || {};
    const terminated = await InterviewModel.terminateSession(sessionId);
    // record in audit_log for traceability
    try {
      await pool.query(
        `INSERT INTO audit_log (admin_user_id, action, details) VALUES ($1, $2, $3)`,
        [req.user?.id || null, 'forced_termination', JSON.stringify({ sessionId, reason })]
      );
    } catch (logErr) {
      // don't block the response if audit insert fails
      console.error('Failed to write audit log for termination:', logErr);
    }

    res.json({ terminated });
  } catch (err) {
    next(err);
  }
}

module.exports = { startInterview, submitAnswer, completeInterview, getHistory, getReport, getAdaptiveNextQuestion, terminateInterview };