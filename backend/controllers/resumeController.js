const aiService = require('../services/aiService');

async function matchResume(req, res, next) {
  try {
    const { resumeText, jobDescription } = req.body;

    if (!resumeText || !jobDescription) {
      return res.status(400).json({ error: 'Both resumeText and jobDescription are required' });
    }

    const result = await aiService.analyzeResume({ resumeText, jobDescription });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { matchResume };