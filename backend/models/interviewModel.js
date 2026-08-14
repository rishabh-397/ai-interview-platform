const pool = require('../config/db');

const InterviewModel = {
  async createSession(userId, companyId) {
    const result = await pool.query(
      `INSERT INTO interview_sessions (user_id, company_id)
       VALUES ($1, $2) RETURNING *`,
      [userId, companyId]
    );
    return result.rows[0];
  },

  async getQuestionsForCompany(companyId, limit = 5) {
    const query = companyId
      ? `SELECT * FROM questions WHERE company_id = $1 ORDER BY RANDOM() LIMIT $2`
      : `SELECT * FROM questions ORDER BY RANDOM() LIMIT $1`;
    const params = companyId ? [companyId, limit] : [limit];

    const result = await pool.query(query, params);
    return result.rows;
  },

  async getPersonalizedQuestions(userId, companyId, limit = 5) {
    const categoryScores = await pool.query(
      `SELECT q.category, AVG(sa.ai_score) as avg_score
       FROM session_answers sa
       JOIN questions q ON sa.question_id = q.id
       JOIN interview_sessions s ON sa.session_id = s.id
       WHERE s.user_id = $1
       GROUP BY q.category`,
      [userId]
    );

    const allCategoriesResult = await pool.query(
      companyId
        ? 'SELECT DISTINCT category FROM questions WHERE company_id = $1'
        : 'SELECT DISTINCT category FROM questions',
      companyId ? [companyId] : []
    );

    const scoreMap = {};
    categoryScores.rows.forEach((row) => {
      scoreMap[row.category] = parseFloat(row.avg_score);
    });

    const categories = allCategoriesResult.rows
      .map((row) => row.category)
      .filter(Boolean)
      .map((cat) => ({ category: cat, score: scoreMap[cat] ?? 50 }))
      .sort((a, b) => a.score - b.score);

    if (categories.length === 0) {
      return this.getQuestionsForCompany(companyId, limit);
    }

    const weakestCategory = categories[0].category;
    const weakestCount = Math.max(1, Math.ceil(limit * 0.5));

    const weakestQuestionsQuery = companyId
      ? `SELECT * FROM questions WHERE company_id = $1 AND category = $2 ORDER BY RANDOM() LIMIT $3`
      : `SELECT * FROM questions WHERE category = $1 ORDER BY RANDOM() LIMIT $2`;
    const weakestParams = companyId ? [companyId, weakestCategory, weakestCount] : [weakestCategory, weakestCount];

    const weakestQuestions = await pool.query(weakestQuestionsQuery, weakestParams);
    const chosenIds = weakestQuestions.rows.map((q) => q.id);
    const remaining = limit - weakestQuestions.rows.length;

    if (remaining <= 0) return weakestQuestions.rows;

    const fillerQuery = companyId
      ? `SELECT * FROM questions WHERE company_id = $1 AND id != ALL($2::int[]) ORDER BY RANDOM() LIMIT $3`
      : `SELECT * FROM questions WHERE id != ALL($1::int[]) ORDER BY RANDOM() LIMIT $2`;
    const fillerParams = companyId ? [companyId, chosenIds, remaining] : [chosenIds, remaining];

    const fillerQuestions = await pool.query(fillerQuery, fillerParams);

    return [...weakestQuestions.rows, ...fillerQuestions.rows].sort(() => Math.random() - 0.5);
  },

  async saveAnswer({ sessionId, questionId, answerText, codeSubmission, aiFeedback, aiScore, fillerWordCount }) {
    const result = await pool.query(
      `INSERT INTO session_answers
        (session_id, question_id, answer_text, code_submission, ai_feedback, ai_score, filler_word_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [sessionId, questionId, answerText, codeSubmission, aiFeedback, aiScore, fillerWordCount || 0]
    );
    return result.rows[0];
  },

  async completeSession(sessionId, scores) {
    const { overall, communication, technical, confidence } = scores;
    const result = await pool.query(
      `UPDATE interview_sessions SET
        status = 'completed',
        overall_score = $1,
        communication_score = $2,
        technical_score = $3,
        confidence_score = $4,
        completed_at = NOW()
       WHERE id = $5 RETURNING *`,
      [overall, communication, technical, confidence, sessionId]
    );
    return result.rows[0];
  },

  async getSessionHistory(userId) {
    const result = await pool.query(
      `SELECT s.*, c.name AS company_name
       FROM interview_sessions s
       LEFT JOIN companies c ON s.company_id = c.id
       WHERE s.user_id = $1
       ORDER BY s.started_at DESC`,
      [userId]
    );
    return result.rows;
  },

  async getSessionWithAnswers(sessionId) {
    const session = await pool.query('SELECT * FROM interview_sessions WHERE id = $1', [sessionId]);
    const answers = await pool.query(
      `SELECT sa.*, q.question_text, q.category
       FROM session_answers sa
       JOIN questions q ON sa.question_id = q.id
       WHERE sa.session_id = $1
       ORDER BY sa.answered_at ASC`,
      [sessionId]
    );
    return { session: session.rows[0], answers: answers.rows };
  },

  async terminateSession(sessionId) {
    const result = await pool.query(
      `UPDATE interview_sessions SET
        status = 'terminated',
        completed_at = NOW()
       WHERE id = $1 RETURNING *`,
      [sessionId]
    );
    return result.rows[0];
  },
};

module.exports = InterviewModel;