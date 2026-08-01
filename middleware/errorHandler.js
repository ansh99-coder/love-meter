/**
 * Love Meter ❤️ — Global error handler.
 *
 * Catches unhandled errors and returns a consistent JSON response.
 * Never leaks stack traces to the client in production.
 */

import logger from '../utils/logger.js';

export function errorHandler(err, req, res, next) {
  logger.error('Unhandled error:', err.message || err);

  const status = err.status || err.statusCode || 500;
  const message =
    process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred. Please try again later.'
      : err.message || 'Internal server error';

  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack?.split('\n').slice(0, 3).join('\n') })
  });
}

export default errorHandler;
