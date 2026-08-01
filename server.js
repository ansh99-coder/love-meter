/**
 * Love Meter ❤️ — Production-ready Express server.
 *
 * Features:
 *  - Firebase Firestore storage (with preview memory fallback)
 *  - Firebase Authentication for admin dashboard
 *  - Rate limiting, XSS protection, security headers
 *  - PWA static serving with SPA fallback
 *  - Export (CSV/JSON/Excel), analytics, search, pagination
 */

import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import config from './config/index.js';
import { securityHeaders, xssFilter } from './middleware/security.js';
import { errorHandler } from './middleware/errorHandler.js';
import { rateLimiter } from './middleware/rateLimit.js';
import logger from './utils/logger.js';

// Route imports
import calculateRouter from './routes/calculate.js';
import adminRouter from './routes/admin.js';
import healthRouter from './routes/health.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = config.server.port;

// ---------------------------------------------------------------------------
// Express app
// ---------------------------------------------------------------------------
const app = express();

// Trust proxy if behind a reverse proxy (e.g., Nginx, Cloudflare)
if (config.server.trustProxy) {
  app.set('trust proxy', 1);
}

app.disable('x-powered-by');

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
app.use(cors({ origin: config.server.corsOrigin, credentials: true }));
app.use(securityHeaders);
app.use(xssFilter);
app.use(express.json({ limit: config.security.bodyLimit }));

// General rate limiter for all API calls
app.use('/api/', rateLimiter(
  config.security.rate.general.windowMs,
  config.security.rate.general.max,
  'api'
));

// Request logging in development
if (!config.isProd) {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const ms = Date.now() - start;
      if (req.path.startsWith('/api/')) {
        logger.debug(`${req.method} ${req.path} → ${res.statusCode} (${ms}ms)`);
      }
    });
    next();
  });
}

// ---------------------------------------------------------------------------
// API routes
// ---------------------------------------------------------------------------
app.use('/api/calculate', calculateRouter);
app.use('/api/admin', adminRouter);
app.use('/api/health', healthRouter);

// ---------------------------------------------------------------------------
// Static file serving (PWA frontend)
// ---------------------------------------------------------------------------
const publicDir = config.server.publicDir;
app.use(express.static(publicDir, {
  maxAge: config.isProd ? '1d' : 0,
  etag: true,
  lastModified: true
}));

// SPA fallback — serve index.html for any non-API route
app.get(/^\/(?!api\/).*/, (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// ---------------------------------------------------------------------------
// Error handler (must be last)
// ---------------------------------------------------------------------------
app.use(errorHandler);

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Love Meter running at http://localhost:${PORT}`);
  logger.info(`Mode: ${config.isProd ? 'production' : 'development'}`);
  logger.info(`Firestore: ${config.firebase.projectId ? 'configured' : 'preview (in-memory)'}`);
  if (!config.firebase.projectId) {
    logger.info('TIP: Set FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY in .env for live mode.');
  }
});

export default app;
