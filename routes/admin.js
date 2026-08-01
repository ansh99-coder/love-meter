/**
 * Love Meter ❤️ — Admin API routes.
 *
 * All routes are protected by Firebase ID token authentication.
 * Provides login verification, stats, calculations CRUD, search/filter,
 * pagination, favorites, top scores, export (CSV/JSON/Excel), and bulk operations.
 */

import { Router } from 'express';
import { authenticateAdmin } from '../middleware/auth.js';
import { rateLimiter } from '../middleware/rateLimit.js';
import { useStore } from '../data/store.js';
import { isFirebaseReady } from '../firebase.js';
import { sanitizeString, toInt } from '../utils/sanitize.js';
import { toCSV, toJSON, toXLS, contentTypeFor, extensionFor } from '../utils/export.js';
import config from '../config/index.js';
import logger from '../utils/logger.js';

const router = Router();

// ---------------------------------------------------------------------------
// POST /api/admin/verify-login — Validate Firebase ID token and return status
// ---------------------------------------------------------------------------
router.post('/verify-login', authenticateAdmin, (req, res) => {
  res.json({
    ok: true,
    admin: {
      email: req.admin.email,
      uid: req.admin.uid,
      role: req.admin.role
    }
  });
});

// ---------------------------------------------------------------------------
// GET /api/admin/config — Return Firebase web config for the client
// ---------------------------------------------------------------------------
router.get('/config', (req, res) => {
  const { web } = config.firebase;
  const hasFirebase = Boolean(web.apiKey && web.projectId);
  res.json({
    firebase: hasFirebase
      ? { apiKey: web.apiKey, authDomain: web.authDomain, projectId: web.projectId, storageBucket: web.storageBucket, messagingSenderId: web.messagingSenderId, appId: web.appId, measurementId: web.measurementId }
      : null,
    previewMode: !isFirebaseReady(),
    adminEmail: config.admin.email || (config.admin.allowedEmails[0] || '')
  });
});

// ---------------------------------------------------------------------------
// GET /api/admin/stats — Aggregated analytics
// ---------------------------------------------------------------------------
router.get('/stats', authenticateAdmin, async (req, res, next) => {
  try {
    const { store } = useStore();
    const stats = await store.stats();
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/admin/calculations — Paginated, filterable, searchable list
// ---------------------------------------------------------------------------
router.get('/calculations', authenticateAdmin, async (req, res, next) => {
  try {
    const { store } = useStore();
    const q = sanitizeString(req.query.q, 100);
    const scoreMin = toInt(req.query.scoreMin, 0, 0, 100);
    const scoreMax = toInt(req.query.scoreMax, 100, 0, 100);
    const date = ['today', 'week', 'month'].includes(req.query.date) ? req.query.date : 'all';
    const device = sanitizeString(req.query.device, 40);
    const browser = sanitizeString(req.query.browser, 40);
    const sort = ['newest', 'oldest', 'score_high', 'score_low'].includes(req.query.sort) ? req.query.sort : 'newest';
    const page = Math.max(1, toInt(req.query.page, 1, 1));
    const limit = Math.min(200, Math.max(1, toInt(req.query.limit, 20, 1)));

    const result = await store.listCalculations({ q, scoreMin, scoreMax, date, device, browser, sort, page, limit });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/admin/calculations/export — Export data as CSV / JSON / XLS
// ---------------------------------------------------------------------------
router.get('/calculations/export', authenticateAdmin, async (req, res, next) => {
  try {
    const { store } = useStore();
    const format = ['csv', 'json', 'xlsx', 'xls'].includes(req.query.format) ? req.query.format : 'csv';
    const q = sanitizeString(req.query.q, 100);
    const scoreMin = toInt(req.query.scoreMin, 0, 0, 100);
    const scoreMax = toInt(req.query.scoreMax, 100, 0, 100);
    const date = ['today', 'week', 'month'].includes(req.query.date) ? req.query.date : 'all';

    const rows = await store.exportRows({ q, scoreMin, scoreMax, date });

    let body;
    if (format === 'json') {
      body = toJSON(rows);
    } else if (format === 'xlsx' || format === 'xls') {
      body = toXLS(rows);
    } else {
      body = toCSV(rows);
    }

    const stamp = new Date().toISOString().slice(0, 10);
    const ext = extensionFor(format);

    res.setHeader('Content-Type', contentTypeFor(format));
    res.setHeader('Content-Disposition', `attachment; filename="lovemeter-${stamp}.${ext}"`);
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    }
    res.send(body);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/admin/calculations/:id/favorite — Toggle favorite
// ---------------------------------------------------------------------------
router.patch('/calculations/:id/favorite', authenticateAdmin, async (req, res, next) => {
  try {
    // Firestore document IDs are auto-generated strings (e.g. "aBcDeFg123");
    // the preview store uses string IDs too, so keep them as strings.
    const id = sanitizeString(req.params.id, 64);
    if (!id) return res.status(400).json({ error: 'Invalid ID' });

    const { store } = useStore();
    const calc = await store.getCalculation(id);
    if (!calc) return res.status(404).json({ error: 'Record not found' });

    const favorite = Boolean(req.body?.favorite);
    const updated = await store.toggleFavorite(id, favorite);
    res.json({ id, isFavorite: favorite, ...updated });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/admin/calculations/:id — Delete a single record
// ---------------------------------------------------------------------------
router.delete('/calculations/:id', authenticateAdmin, async (req, res, next) => {
  try {
    const id = sanitizeString(req.params.id, 64);
    if (!id) return res.status(400).json({ error: 'Invalid ID' });

    const { store } = useStore();
    const deleted = await store.deleteCalculation(id);
    if (!deleted) return res.status(404).json({ error: 'Record not found' });
    res.json({ message: 'Deleted', id });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/admin/calculations — Bulk delete
// ---------------------------------------------------------------------------
router.delete('/calculations', authenticateAdmin, async (req, res, next) => {
  try {
    const ids = (Array.isArray(req.body?.ids) ? req.body.ids : [])
      .map((v) => sanitizeString(v, 64))
      .filter(Boolean);
    if (!ids.length) return res.status(400).json({ error: 'No IDs provided' });

    const { store } = useStore();
    const deleted = await store.bulkDelete(ids);
    res.json({ message: 'Bulk deleted', deleted });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/admin/calculations/all — Clear ALL data
// ---------------------------------------------------------------------------
router.delete('/calculations/all', authenticateAdmin, async (req, res, next) => {
  try {
    const { store } = useStore();
    const result = await store.clearAll();
    logger.info(`Admin cleared all data: ${result.calculations} calculations, ${result.visitors} visitors`);
    res.json({ message: 'All data cleared', ...result });
  } catch (err) {
    next(err);
  }
});

export default router;

