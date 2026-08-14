const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { createApiKey, listApiKeys, revokeApiKey } = require('../controllers/apiKeyController');

router.post('/', authenticate, createApiKey);
router.get('/', authenticate, listApiKeys);
router.delete('/:id', authenticate, revokeApiKey);

module.exports = router;