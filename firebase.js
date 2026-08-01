/**
 * Love Meter ❤️ — Firebase Admin initialization.
 *
 * Uses firebase-admin (server-side) for:
 *  - Firestore persistence of every love calculation + visitor
 *  - Verifying Firebase ID tokens for the hidden admin dashboard
 *
 * If Firebase credentials are not configured yet the module exports `null`
 * handles so the app runs in preview mode (in-memory store).
 */

import admin from 'firebase-admin';
import fs from 'node:fs';
import path from 'node:path';
import config from './config/index.js';
import logger from './utils/logger.js';

let app = null;
let db = null;
let auth = null;
let ready = false;

/**
 * Build the firebase-admin credential from either:
 *  - a service account JSON file path (FIREBASE_SERVICE_ACCOUNT_PATH), or
 *  - inline env vars (FIREBASE_PROJECT_ID / CLIENT_EMAIL / PRIVATE_KEY)
 */
function resolveCredentials() {
  const {
    serviceAccountPath,
    projectId,
    clientEmail,
    privateKey,
    serviceAccountJson
  } = config.firebase;

  // 1. JSON from environment (Render)
  if (serviceAccountJson) {
    const serviceAccount = JSON.parse(serviceAccountJson);
    return {
      projectId: serviceAccount.project_id,
      credential: admin.credential.cert(serviceAccount)
    };
  }

  // 2. Local JSON file (Development)
  if (serviceAccountPath) {
    const abs = path.isAbsolute(serviceAccountPath)
      ? serviceAccountPath
      : path.join(config.rootDir, serviceAccountPath);

    if (fs.existsSync(abs)) {
      const serviceAccount = JSON.parse(fs.readFileSync(abs, "utf8"));
      return {
        projectId: serviceAccount.project_id,
        credential: admin.credential.cert(serviceAccount)
      };
    }
  }

  // 3. Individual environment variables
  if (projectId && clientEmail && privateKey) {
    return {
      projectId,
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey
      })
    };
  }

  return null;
}