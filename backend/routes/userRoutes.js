const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { exportMyData, deleteMyAccount } = require('../controllers/userController');

router.get('/export-data', authenticate, exportMyData);
router.delete('/account', authenticate, deleteMyAccount);

module.exports = router;