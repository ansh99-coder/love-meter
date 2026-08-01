/**
 * Love Meter ❤️ — Security middleware.
 *
 * Sets standard security headers and provides a simple XSS filter.
 */

import helmet from 'helmet';
import config from '../config/index.js';

/**
 * Helmet configuration with a relaxed Content-Security-Policy that allows
 * firebase auth, google apis, and our own CDN imports.
 */
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'", // Needed for the admin triple-click style
        'https://cdn.jsdelivr.net',
        'https://apis.google.com',
        'https://www.gstatic.com'
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        'https://fonts.googleapis.com',
        'https://cdn.jsdelivr.net'
      ],
      connectSrc: [
        "'self'",
        'https://identitytoolkit.googleapis.com',
        'https://securetoken.googleapis.com',
        'https://firestore.googleapis.com',
        `https://firestore.googleapis.com`,
        `https://www.googleapis.com`
      ],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'blob:'],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' }
});

/**
 * Simple XSS filter for request bodies.
 * Strips obvious script tags from string values.
 */
export function xssFilter(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    for (const key of Object.keys(req.body)) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key]
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript\s*:/gi, '')
          .replace(/on\w+\s*=/gi, '');
      }
    }
  }
  next();
}

export default { securityHeaders, xssFilter };
