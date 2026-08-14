const axios = require('axios');

// Judge0's own free public demo instance — no signup, no API key, rate-limited but free.
const JUDGE0_URL = 'https://ce.judge0.com/submissions';

const LANGUAGE_MAP = {
  javascript: 63, // Node.js
  python: 71,     // Python 3
  java: 62,       // Java (OpenJDK)
  cpp: 54,        // C++ (GCC)
  c: 50,          // C (GCC)
};

async function runCode(req, res, next) {
  try {
    const { code, language, input } = req.body;
    const languageId = LANGUAGE_MAP[language];

    if (!languageId) {
      return res.status(400).json({ error: `Unsupported language: ${language}` });
    }

    const response = await axios.post(
      `${JUDGE0_URL}?base64_encoded=false&wait=true`,
      {
        source_code: code,
        language_id: languageId,
        stdin: input || '',
      },
      {
        headers: { 'content-type': 'application/json' },
        timeout: 15000,
      }
    );

    const result = response.data;
    res.json({
      output: result.stdout || '',
      error: result.stderr || result.compile_output || (result.status?.description !== 'Accepted' ? result.status?.description : '') || '',
      exitCode: result.status?.id === 3 ? 0 : -1,
    });
  } catch (err) {
    console.error('Code execution error:', err.response?.data || err.message);
    res.status(200).json({ output: '', error: 'Code execution service is temporarily unavailable — please try again shortly.', exitCode: -1 });
  }
}

module.exports = { runCode };