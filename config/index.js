/**
 * Love Meter ❤️ — Central configuration loader.
 *
 * Loads environment variables, validates the critical ones, and exposes a
 * single `config` object used across the whole backend.
 *
 * The app supports two operating modes:
 *  - PREVIEW MODE  : Firebase credentials are missing. The server still starts,
 *                    the UI is fully browsable, calculations are processed and
 *                    kept in an in-memory store (cleared on restart).
 *  - LIVE MODE     : Firebase credentials are present. Everything is persisted
 *                    to Cloud Firestore and admin login uses Firebase Auth.
 */

import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

function bool(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function int(value, fallback) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

const config = {
  env: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  rootDir,

  server: {
    port: int(process.env.PORT, 4000),
    publicDir: path.join(rootDir, 'public'),
    trustProxy: bool(process.env.TRUST_PROXY, false),
    corsOrigin: process.env.CORS_ORIGIN || '*'
  },

  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
    privateKey: process.env.FIREBASE_PRIVATE_KEY
      ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      : '',
    databaseURL: process.env.FIREBASE_DATABASE_URL || undefined,
    serviceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH || '',
    // These are for the *web* Firebase SDK used on the client for admin auth.
    web: {
      apiKey: process.env.FIREBASE_API_KEY || '',
      authDomain: process.env.FIREBASE_AUTH_DOMAIN || '',
      projectId: process.env.FIREBASE_PROJECT_ID || '',
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || '',
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
      appId: process.env.FIREBASE_APP_ID || '',
      measurementId: process.env.FIREBASE_MEASUREMENT_ID || ''
    }
  },

  admin: {
    email: process.env.ADMIN_EMAIL || '',
    // The admin's email is compared against this allowlist on login.
    allowedEmails: String(process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
    idleTimeoutMs: int(process.env.ADMIN_IDLE_TIMEOUT_MS, 10 * 60 * 1000)
  },

  security: {
    rate: {
      calculate: { windowMs: 60_000, max: 12 },
      login: { windowMs: 5 * 60_000, max: 10 },
      general: { windowMs: 60_000, max: 120 }
    },
    maxNameLength: 40,
    bodyLimit: '32kb'
  },

  ipHashSalt: process.env.IP_HASH_SALT || 'lovemeter_default_salt'
};

export default config;

