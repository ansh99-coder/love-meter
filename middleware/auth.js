/**
 * Love Meter ❤️ — Firebase Authentication middleware.
 *
 * Verifies the Bearer token in the Authorization header using Firebase Admin SDK.
 * On success, sets `req.admin = { uid, email, role: 'admin' }`.
 *
 * In preview mode (Firebase not configured), the middleware rejects all requests
 * with a clear error message.
 */

import { firebaseAuth, isFirebaseReady } from '../firebase.js';
import config from '../config/index.js';
import logger from '../utils/logger.js';

export async function authenticateAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  if (!isFirebaseReady() || !firebaseAuth) {
    return res.status(503).json({
      error: 'Firebase Authentication is not configured. See .env.example for setup instructions.'
    });
  }

  try {
    const decoded = await firebaseAuth.verifyIdToken(token);

    // Check if the user's email is in the admin allowlist.
    const email = (decoded.email || '').toLowerCase();
    const allowed = config.admin.allowedEmails;

    if (allowed.length > 0 && !allowed.includes(email)) {
      logger.warn(`Unauthorized admin access attempt by ${email}`);
      return res.status(403).json({ error: 'Access denied. Your account is not authorized.' });
    }

    // Enforce inactivity timeout
    const authTime = decoded.auth_time ? decoded.auth_time * 1000 : Date.now();
    const ageMs = Date.now() - authTime;
    if (ageMs > config.admin.idleTimeoutMs) {
      return res.status(403).json({ error: 'Session expired due to inactivity. Please log in again.' });
    }

    req.admin = {
      uid: decoded.uid,
      email: decoded.email || '',
      role: 'admin'
    };

    next();
  } catch (err) {
    logger.warn('Token verification failed:', err.message);
    return res.status(403).json({ error: 'Session expired or invalid token. Please log in again.' });
  }
}

export default authenticateAdmin;
