const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { listCompanies } = require('../controllers/companyController');

router.get('/', authenticate, listCompanies);

module.exports = router;