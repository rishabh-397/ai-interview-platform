const axios = require('axios');
require('dotenv').config();

const SYSTEM_PROMPT = `You are an AI interview coach helping a candidate prepare for technical and behavioural interviews.
Keep answers concise, practical, and encouraging. When asked about DSA, system design, or behavioural questions,
give structured, actionable guidance (e.g. STAR method for behavioural answers).`;

async function sendMessage(req, res, next) {
  try {
    const { message, history } = req.body;

    if (!process.env.GROQ_API_KEY) {
      return res.status(200).json({
        reply: "The chatbot isn't configured yet — add GROQ_API_KEY to backend/.env to enable real AI responses.",
      });
    }

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...(history || []),
      { role: 'user', content: message },
    ];

    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        messages,
        max_tokens: 500,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const reply = response.data.choices?.[0]?.message?.content || 'No response generated.';
    res.json({ reply });
  } catch (err) {
    console.error('Chatbot error:', err.response?.data || err.message);
    res.status(200).json({ reply: 'Sorry, the chatbot is temporarily unavailable. Please try again shortly.' });
  }
}

module.exports = { sendMessage };