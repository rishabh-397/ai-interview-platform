const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { createWebhook, listWebhooks, deleteWebhook } = require('../controllers/webhookController');

router.post('/', authenticate, createWebhook);
router.get('/', authenticate, listWebhooks);
router.delete('/:id', authenticate, deleteWebhook);

module.exports = router;