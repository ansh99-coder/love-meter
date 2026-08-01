/**
 * Love Meter ❤️ — Firebase Client SDK.
 *
 * Initializes the Firebase Web SDK on the client for admin authentication.
 * The admin login uses Firebase Auth (Email/Password), and the ID token is
 * sent to the server for verification via the Admin SDK.
 *
 * Firebase is loaded lazily only when the admin login screen is shown.
 */

import { getAdminConfig } from './api.js';
import { showToast } from './animations.js';

let firebaseApp = null;
let firebaseAuth = null;
let initialized = false;

/**
 * Dynamically load the Firebase Web SDK and initialize.
 * Uses the config from the server (not hardcoded).
 * @returns {Promise<{app: object, auth: object}|null>}
 */
export async function initFirebaseClient() {
  if (initialized && firebaseApp) return { app: firebaseApp, auth: firebaseAuth };

  try {
    // Fetch Firebase config from our server
    const configData = await getAdminConfig();
    if (!configData.firebase) {
      console.warn('Firebase is not configured on the server. Admin login requires Firebase setup.');
      return null;
    }

    const { apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId } = configData.firebase;

    // Dynamically import the Firebase Web SDK
    const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js');
    const { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } = await import(
      'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js'
    );

    firebaseApp = initializeApp({
      apiKey,
      authDomain,
      projectId,
      storageBucket,
      messagingSenderId,
      appId
    }, 'love-meter-admin');

    firebaseAuth = getAuth(firebaseApp);
    initialized = true;

    // Store auth functions on the module for later use
    firebaseClient._signIn = signInWithEmailAndPassword;
    firebaseClient._onAuthStateChanged = onAuthStateChanged;
    firebaseClient._signOut = signOut;

    return { app: firebaseApp, auth: firebaseAuth };
  } catch (err) {
    console.error('Firebase client init failed:', err);
    showToast('Firebase setup incomplete. Check .env configuration.', 'error');
    return null;
  }
}

/**
 * Sign in with email and password.
 * @returns {Promise<{user: object, token: string}|null>}
 */
export async function signInAdmin(email, password) {
  const fb = await initFirebaseClient();
  if (!fb || !firebaseClient._signIn) {
    showToast('Firebase is not configured yet.', 'error');
    return null;
  }

  try {
    const result = await firebaseClient._signIn(fb.auth, email, password);
    const token = await result.user.getIdToken();
    return { user: result.user, token };
  } catch (err) {
    let message = 'Login failed';
    if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
      message = 'Invalid email or password';
    } else if (err.code === 'auth/too-many-requests') {
      message = 'Too many attempts. Please try again later.';
    } else if (err.code === 'auth/invalid-email') {
      message = 'Invalid email format';
    }
    throw new Error(message);
  }
}

/**
 * Listen for auth state changes.
 * @param {Function} callback - Called with user object or null.
 */
export function onAuthChanged(callback) {
  initFirebaseClient().then((fb) => {
    if (fb && firebaseClient._onAuthStateChanged) {
      firebaseClient._onAuthStateChanged(fb.auth, callback);
    }
  });
}

/**
 * Sign out the current admin user.
 */
export async function signOutAdmin() {
  const fb = await initFirebaseClient();
  if (fb && firebaseClient._signOut) {
    await firebaseClient._signOut(fb.auth);
  }
}

/**
 * Send a password reset email via Firebase Auth.
 * @param {string} email - The email address to send the reset link to.
 * @returns {Promise<void>}
 */
export async function sendPasswordReset(email) {
  const fb = await initFirebaseClient();
  if (!fb) {
    throw new Error('Firebase is not configured');
  }

  const { sendPasswordResetEmail } = await import(
    'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js'
  );

  await sendPasswordResetEmail(fb.auth, email);
}

// Internal module reference for the dynamically assigned functions
const firebaseClient = {
  _signIn: null,
  _onAuthStateChanged: null,
  _signOut: null
};

export default firebaseClient;
