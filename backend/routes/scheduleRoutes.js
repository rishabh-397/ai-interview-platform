const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { createSchedule, listSchedules, deleteSchedule } = require('../controllers/scheduleController');

router.post('/', authenticate, createSchedule);
router.get('/', authenticate, listSchedules);
router.delete('/:id', authenticate, deleteSchedule);

module.exports = router;