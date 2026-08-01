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
 *  - FIREBASE_SERVICE_ACCOUNT_JSON (Render)
 *  - FIREBASE_SERVICE_ACCOUNT_PATH (Local)
 *  - Individual environment variables
 */
function resolveCredentials() {
  const {
    serviceAccountPath,
    projectId,
    clientEmail,
    privateKey,
    serviceAccountJson
  } = config.firebase;

  // 1. Service Account JSON from environment (Render)
  if (serviceAccountJson) {
    try {
      const serviceAccount = JSON.parse(serviceAccountJson);

      return {
        projectId: serviceAccount.project_id,
        credential: admin.credential.cert(serviceAccount)
      };
    } catch (err) {
      logger.error(
        'Invalid FIREBASE_SERVICE_ACCOUNT_JSON:',
        err.message
      );
    }
  }

  // 2. Local service account file (Development)
  if (serviceAccountPath) {
    const abs = path.isAbsolute(serviceAccountPath)
      ? serviceAccountPath
      : path.join(config.rootDir, serviceAccountPath);

    if (fs.existsSync(abs)) {
      const serviceAccount = JSON.parse(
        fs.readFileSync(abs, 'utf8')
      );

      return {
        projectId: serviceAccount.project_id,
        credential: admin.credential.cert(serviceAccount)
      };
    }

    logger.warn(`Service account file not found: ${abs}`);
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

function init() {
  if (app) return;

  const creds = resolveCredentials();

  if (!creds) {
    logger.warn(
      'Firebase is not configured — running in PREVIEW MODE. ' +
      'Calculations are stored in memory and will reset on restart. ' +
      'See .env.example for Firebase setup instructions.'
    );

    ready = false;
    return;
  }

  try {
    app = admin.initializeApp(
      {
        credential: creds.credential,
        projectId:
          creds.projectId || config.firebase.projectId,
        databaseURL: config.firebase.databaseURL
      },
      'love-meter'
    );

    db = app.firestore();
    auth = app.auth();
    ready = true;

    logger.info(
      `Firebase initialized (project: ${
        creds.projectId || config.firebase.projectId
      })`
    );
  } catch (err) {
    logger.error(
      'Failed to initialize Firebase:',
      err.message
    );

    ready = false;
  }
}

init();

export const firestore = db;
export const firebaseAuth = auth;
export const isFirebaseReady = () => ready;
export const getAdminApp = () => app;

export default {
  firestore,
  firebaseAuth,
  isFirebaseReady
};