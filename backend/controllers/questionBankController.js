const pool = require('../config/db');
const aiService = require('../services/aiService');

async function getQuestion(req, res, next) {
  try {
    const { questionId } = req.params;
    const result = await pool.query(
      `SELECT q.id, q.question_text, q.category, q.difficulty, q.expected_keywords,
              c.name as company_name, c.logo_url as company_logo
       FROM questions q
       LEFT JOIN companies c ON q.company_id = c.id
       WHERE q.id = $1`,
      [questionId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Question not found' });
    res.json({ question: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

async function answerQuestion(req, res, next) {
  try {
    const { questionId } = req.params;
    const { answerText, codeSubmission } = req.body;
    const userId = req.user.id;

    const questionResult = await pool.query('SELECT * FROM questions WHERE id = $1', [questionId]);
    if (questionResult.rows.length === 0) return res.status(404).json({ error: 'Question not found' });
    const question = questionResult.rows[0];

    const aiResult = await aiService.evaluateAnswer({
      questionText: question.question_text,
      answerText: answerText || codeSubmission || '',
      expectedKeywords: question.expected_keywords,
    });

    if (aiResult.score >= 50) {
      await pool.query(
        `INSERT INTO question_progress (user_id, question_id) VALUES ($1, $2)
         ON CONFLICT (user_id, question_id) DO NOTHING`,
        [userId, questionId]
      );
    }

    res.json({ aiResult, autoSolved: aiResult.score >= 50 });
  } catch (err) {
    next(err);
  }
}

async function listQuestions(req, res, next) {
  try {
    const { search, companyId, category, difficulty, page = 1, pageSize = 25 } = req.query;
    const userId = req.user.id;

    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (search) {
      conditions.push(`q.question_text ILIKE $${paramIndex}`);
      params.push(`%${search}%`);
      paramIndex++;
    }
    if (companyId) {
      conditions.push(`q.company_id = $${paramIndex}`);
      params.push(companyId);
      paramIndex++;
    }
    if (category) {
      conditions.push(`q.category = $${paramIndex}`);
      params.push(category);
      paramIndex++;
    }
    if (difficulty) {
      conditions.push(`q.difficulty = $${paramIndex}`);
      params.push(difficulty);
      paramIndex++;
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (parseInt(page, 10) - 1) * parseInt(pageSize, 10);

    const countResult = await pool.query(`SELECT COUNT(*) FROM questions q ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count, 10);

    const dataParams = [...params, userId, parseInt(pageSize, 10), offset];
    const result = await pool.query(
      `SELECT q.id, q.question_text, q.category, q.difficulty, c.name as company_name, c.logo_url as company_logo,
              (qp.id IS NOT NULL) as solved
       FROM questions q
       LEFT JOIN companies c ON q.company_id = c.id
       LEFT JOIN question_progress qp ON qp.question_id = q.id AND qp.user_id = $${paramIndex}
       ${whereClause}
       ORDER BY q.id ASC
       LIMIT $${paramIndex + 1} OFFSET $${paramIndex + 2}`,
      dataParams
    );

    res.json({ questions: result.rows, total, page: parseInt(page, 10), pageSize: parseInt(pageSize, 10) });
  } catch (err) {
    next(err);
  }
}

async function getProgress(req, res, next) {
  try {
    const userId = req.user.id;
    const totalResult = await pool.query('SELECT COUNT(*) FROM questions');
    const solvedResult = await pool.query('SELECT COUNT(*) FROM question_progress WHERE user_id = $1', [userId]);

    res.json({
      total: parseInt(totalResult.rows[0].count, 10),
      solved: parseInt(solvedResult.rows[0].count, 10),
    });
  } catch (err) {
    next(err);
  }
}

async function toggleSolved(req, res, next) {
  try {
    const { questionId } = req.params;
    const userId = req.user.id;

    const existing = await pool.query(
      'SELECT id FROM question_progress WHERE user_id = $1 AND question_id = $2',
      [userId, questionId]
    );

    if (existing.rows.length > 0) {
      await pool.query('DELETE FROM question_progress WHERE user_id = $1 AND question_id = $2', [userId, questionId]);
      return res.json({ solved: false });
    } else {
      await pool.query(
        'INSERT INTO question_progress (user_id, question_id) VALUES ($1, $2)',
        [userId, questionId]
      );
      return res.json({ solved: true });
    }
  } catch (err) {
    next(err);
  }
}

module.exports = { listQuestions, getProgress, toggleSolved, getQuestion, answerQuestion };