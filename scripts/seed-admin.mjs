/**
 * Love Meter ❤️ — Seed admin user script.
 *
 * Creates a Firebase Authentication user for the admin dashboard.
 *
 * Usage:
 *   node scripts/seed-admin.mjs
 *
 * Requires:
 *   - FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 *     in .env (or process.env)
 *   - firebase-admin dependency installed
 */

import { readFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { stdin, stdout } from 'node:process';

const rl = createInterface({ input: stdin, output: stdout });

function ask(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function main() {
  console.log('\n❤️  Love Meter — Admin User Seed\n');

  // Load .env if present
  try {
    const envContent = readFileSync('.env', 'utf8');
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...rest] = trimmed.split('=');
        if (key && rest.length) {
          process.env[key.trim()] = rest.join('=').replace(/^["']|["']$/g, '');
        }
      }
    }
    console.log('✓ Loaded .env file');
  } catch {
    console.log('  No .env file found — using existing environment variables');
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    console.error('✗ Firebase Admin SDK credentials not found in environment.');
    console.error('  Make sure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL,');
    console.error('  and FIREBASE_PRIVATE_KEY are set in .env');
    process.exit(1);
  }

  try {
    const admin = await import('firebase-admin');
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n')
      }),
      projectId
    });

    const email = await ask('Enter admin email: ');
    const password = await ask('Enter admin password (min 6 chars): ');

    if (!email || !password || password.length < 6) {
      console.error('✗ Invalid input. Email required, password at least 6 characters.');
      process.exit(1);
    }

    try {
      const user = await admin.auth().createUser({
        email,
        password,
        displayName: 'Love Meter Admin',
        emailVerified: true
      });
      console.log(`\n✓ Admin user created: ${user.email} (${user.uid})`);
      console.log('  Add this email to ADMIN_EMAILS in .env to grant access.');
    } catch (err) {
      if (err.code === 'auth/email-already-exists') {
        console.log('  User already exists — no changes made.');
      } else {
        throw err;
      }
    }

    console.log('\nDone! ❤️\n');
  } catch (err) {
    console.error('✗ Error:', err.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

main();
