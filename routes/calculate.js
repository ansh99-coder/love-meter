/**
 * Love Meter ❤️ — Love calculation route.
 *
 * POST /api/calculate
 *   Body: { yourName, crushName, sessionId, language, timezone, country }
 *   Returns: { id, yourName, crushName, score, title, emoji, subtitle, createdAt }
 *
 * Every calculation is saved to Firestore (or the preview memory store).
 * Same name pair → always same score (deterministic).
 */

import { Router } from 'express';
import { computeLoveScore, messageForScore } from '../utils/loveAlgorithm.js';
import { sanitizeName, sanitizeSessionId, validateNames } from '../utils/sanitize.js';
import { parseUserAgent } from '../utils/userAgent.js';
import { rateLimiter } from '../middleware/rateLimit.js';
import { useStore } from '../data/store.js';
import config from '../config/index.js';
import crypto from 'node:crypto';

const router = Router();

function getClientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length) return fwd.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

function hashIp(ip) {
  return crypto.createHmac('sha256', config.ipHashSalt).update(String(ip)).digest('hex').slice(0, 32);
}

router.post('/', rateLimiter(
  config.security.rate.calculate.windowMs,
  config.security.rate.calculate.max,
  'calc'
), async (req, res, next) => {
  try {
    const yourName = sanitizeName(req.body?.yourName || req.body?.name1);
    const crushName = sanitizeName(req.body?.crushName || req.body?.name2);

    const validationError = validateNames(yourName, crushName);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const score = computeLoveScore(yourName, crushName);
    const msg = messageForScore(score);

    const ip = getClientIp(req);
    const { device, browser, os } = parseUserAgent(req.headers['user-agent']);
    const sessionId = sanitizeSessionId(req.body?.sessionId || req.body?.anonymousSessionId);
    const language = String(req.body?.language || req.headers['accept-language'] || '').slice(0, 20);
    const timezone = String(req.body?.timezone || '').slice(0, 40);
    const country = String(req.body?.country || '').slice(0, 40);

    const record = {
      yourName,
      crushName,
      score,
      message: msg.title,
      date: new Date().toISOString().slice(0, 10),
      time: new Date().toISOString().slice(11, 19),
      timestamp: new Date().toISOString(),
      browser,
      device,
      os,
      language,
      timezone,
      anonymousSessionId: sessionId,
      country,
      ipHash: hashIp(ip)
    };

    const { store } = useStore();
    const saved = await store.addCalculation(record);

    // Also upsert the visitor asynchronously (fire-and-forget)
    store.upsertVisitor({
      anonymousSessionId: sessionId,
      ipHash: hashIp(ip),
      device,
      browser,
      os,
      language,
      timezone,
      country
    }).catch(() => {});

    res.status(201).json({
      id: saved.id,
      yourName: saved.yourName,
      crushName: saved.crushName,
      score: saved.score,
      title: msg.title,
      emoji: msg.emoji,
      subtitle: msg.subtitle,
      createdAt: saved.createdAt
    });
  } catch (err) {
    next(err);
  }
});

export default router;
