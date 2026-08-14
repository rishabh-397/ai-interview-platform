const pool = require('../config/db');

async function listCompanies(req, res, next) {
  try {
    const result = await pool.query('SELECT id, name, logo_url FROM companies ORDER BY name ASC');
    res.json({ companies: result.rows });
  } catch (err) {
    next(err);
  }
}

module.exports = { listCompanies };