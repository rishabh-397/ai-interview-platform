const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const auditLog = require('../middleware/auditLog');
const { getLeaderboard, getAdminStats, getAverageScore, getLiveSessions, getAuditLog } = require('../controllers/dashboardController');

router.get('/leaderboard', authenticate, getLeaderboard);
router.get('/average-score', authenticate, getAverageScore);
router.get('/admin/stats', authenticate, authorize('admin'), auditLog('view_admin_stats'), getAdminStats);
router.get('/admin/live-sessions', authenticate, authorize('admin'), auditLog('view_live_sessions'), getLiveSessions);
router.get('/admin/audit-log', authenticate, authorize('admin'), getAuditLog);

module.exports = router;