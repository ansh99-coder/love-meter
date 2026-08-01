/**
 * Love Meter ❤️ — Health check route.
 */

import { Router } from 'express';
import { isFirebaseReady } from '../firebase.js';

const router = Router();

router.get('/', (req, res) => {
  res.json({
    ok: true,
    name: 'Love Meter',
    version: '2.0.0',
    firestore: isFirebaseReady() ? 'connected' : 'preview-mode',
    time: new Date().toISOString()
  });
});

export default router;
