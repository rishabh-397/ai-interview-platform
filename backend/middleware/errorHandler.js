const { sendAdminAlert } = require('../services/alertService');

function errorHandler(err, req, res, next) {
  console.error(err.stack);

  const statusCode = err.statusCode || 500;

  // Day 48: alert admins on real server errors (not expected 4xx client errors)
  if (statusCode >= 500) {
    sendAdminAlert(`🚨 Server error on ${req.method} ${req.originalUrl}: ${err.message}`).catch(() => {});
  }

  res.status(statusCode).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

module.exports = errorHandler;