const axios = require('axios');
require('dotenv').config();

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

/**
 * Sends an answer to the Python AI microservice for evaluation.
 * The Python service (FastAPI) is expected to expose POST /evaluate
 * and return { score, feedback, filler_word_count, sentiment }
 *
 * This keeps AI/ML logic in Python (where the ecosystem is richer)
 * while Node handles the web-facing API and business logic.
 */
async function evaluateAnswer({
  questionText,
  answerText,
  expectedKeywords,
  persona,
}) {
  try {
    const response = await axios.post(`${AI_SERVICE_URL}/evaluate`, {
      question: questionText,
      answer: answerText,
      expected_keywords: expectedKeywords || [],
      persona: persona || 'friendly',
    });

    return response.data;
  } catch (err) {
    console.error('AI service error:', err.message);

    // Fallback so the interview flow doesn't break if the AI service is down
    return {
      score: 0,
      feedback:
        'AI evaluation is temporarily unavailable. Please try again shortly.',
      filler_word_count: 0,
      sentiment: 'neutral',
    };
  }
}

async function generateFollowUpQuestion({
  previousQuestion,
  previousAnswer,
}) {
  try {
    const response = await axios.post(`${AI_SERVICE_URL}/follow-up`, {
      previous_question: previousQuestion,
      previous_answer: previousAnswer,
    });

    return response.data.question;
  } catch (err) {
    console.error('AI follow-up error:', err.message);
    return null;
  }
}

async function analyzeResume({ resumeText, jobDescription }) {
  try {
    const response = await axios.post(`${AI_SERVICE_URL}/resume-match`, {
      resume_text: resumeText,
      job_description: jobDescription,
    });

    return response.data; // { match_score, missing_skills, suggestions }
  } catch (err) {
    console.error('Resume analysis error:', err.message);

    return {
      match_score: 0,
      missing_skills: [],
      suggestions: [],
    };
  }
}

module.exports = {
  evaluateAnswer,
  generateFollowUpQuestion,
  analyzeResume,
};