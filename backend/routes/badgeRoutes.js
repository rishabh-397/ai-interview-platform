const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getUserBadges } = require('../services/badgeService');

router.get('/mine', authenticate, async (req, res, next) => {
  try {
    const badges = await getUserBadges(req.user.id);
    res.json({ badges });
  } catch (err) {
    next(err);
  }
});

module.exports = router;