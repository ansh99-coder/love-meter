/**
 * Love Meter ❤️ — Data access layer.
 *
 * Primary: Cloud Firestore (via firebase-admin).
 * Fallback: in-memory store so the app is browsable before Firebase is configured.
 *
 * All public methods are async and return plain objects — controllers never
 * touch Firestore directly, keeping the codebase portable and testable.
 */

import { firestore, isFirebaseReady } from '../firebase.js';
import logger from '../utils/logger.js';

const CALC_COLLECTION = 'calculations';

// ---------------------------------------------------------------------------
// Preview (in-memory) store
// ---------------------------------------------------------------------------
let nextId = 1;
const memCalculations = [];
const memVisitors = new Map();

const memStore = {
  async addCalculation(record) {
    // String IDs match Firestore's auto-generated document IDs so the
    // admin routes (which treat IDs as opaque strings) work in both modes.
    const id = 'c' + (nextId++).toString(36);
    const doc = { id, createdAt: new Date().toISOString(), ...record };
    memCalculations.push(doc);
    return doc;
  },
  async upsertVisitor(visitor) {
    memVisitors.set(visitor.anonymousSessionId, { ...visitor, lastSeen: new Date().toISOString() });
    return memVisitors.get(visitor.anonymousSessionId);
  },
  async stats() {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const rows = memCalculations;
    const inRange = (ts, from) => new Date(ts).getTime() >= from.getTime();

    const scores = rows.map((r) => r.score);
    const nameCounts = new Map();
    rows.forEach((r) => {
      nameCounts.set(r.yourName, (nameCounts.get(r.yourName) || 0) + 1);
      nameCounts.set(r.crushName, (nameCounts.get(r.crushName) || 0) + 1);
    });

    const distribution = Array.from({ length: 11 }, (_, i) => ({ bucket: i, cnt: 0 }));
    rows.forEach((r) => {
      const b = Math.min(10, Math.max(0, Math.floor(r.score / 10)));
      distribution[b].cnt += 1;
    });

    const trend = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(startOfToday);
      d.setDate(startOfToday.getDate() - i);
      const next = new Date(d);
      next.setDate(d.getDate() + 1);
      trend.push({
        date: d.toISOString().slice(0, 10),
        count: rows.filter((r) => {
          const t = new Date(r.createdAt).getTime();
          return t >= d.getTime() && t < next.getTime();
        }).length
      });
    }

    const topScores = rows
      .slice()
      .sort((a, b) => b.score - a.score || new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10)
      .map((r) => ({ id: r.id, yourName: r.yourName, crushName: r.crushName, score: r.score, message: r.message, createdAt: r.createdAt, isFavorite: !!r.isFavorite }));

    return {
      total: rows.length,
      visitors: memVisitors.size,
      today: rows.filter((r) => inRange(r.createdAt, startOfToday)).length,
      week: rows.filter((r) => inRange(r.createdAt, startOfWeek)).length,
      month: rows.filter((r) => inRange(r.createdAt, startOfMonth)).length,
      avg: scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : 0,
      high: scores.length ? Math.max(...scores) : 0,
      low: scores.length ? Math.min(...scores) : 0,
      topNames: [...nameCounts.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 10)
        .map(([name, count]) => ({ name, count })),
      distribution,
      trend,
      recent: rows
        .slice()
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 8)
        .map((r) => ({ ...r, isFavorite: !!r.isFavorite })),
      topScores
    };
  },
  async listCalculations({ q, scoreMin, scoreMax, date, device, browser, sort, page, limit }) {
    let rows = memCalculations.slice();

    if (q) {
      const needle = q.toLowerCase();
      rows = rows.filter(
        (r) =>
          String(r.yourName).toLowerCase().includes(needle) ||
          String(r.crushName).toLowerCase().includes(needle) ||
          String(r.message).toLowerCase().includes(needle) ||
          String(r.score).includes(needle)
      );
    }
    rows = rows.filter((r) => r.score >= scoreMin && r.score <= scoreMax);
    if (date === 'today') {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      rows = rows.filter((r) => new Date(r.createdAt).getTime() >= d.getTime());
    } else if (date === 'week') {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - d.getDay());
      rows = rows.filter((r) => new Date(r.createdAt).getTime() >= d.getTime());
    } else if (date === 'month') {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(1);
      rows = rows.filter((r) => new Date(r.createdAt).getTime() >= d.getTime());
    }
    if (device) rows = rows.filter((r) => r.device === device);
    if (browser) rows = rows.filter((r) => r.browser === browser);

    const sorters = {
      newest: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      oldest: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
      score_high: (a, b) => b.score - a.score || new Date(b.createdAt) - new Date(a.createdAt),
      score_low: (a, b) => a.score - b.score || new Date(b.createdAt) - new Date(a.createdAt)
    };
    rows.sort(sorters[sort] || sorters.newest);

    const total = rows.length;
    const start = (page - 1) * limit;
    const pageRows = rows.slice(start, start + limit);

    const deviceSet = [...new Set(memCalculations.map((r) => r.device).filter(Boolean))].sort();
    const browserSet = [...new Set(memCalculations.map((r) => r.browser).filter(Boolean))].sort();

    return {
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      rows: pageRows,
      filters: { devices: deviceSet, browsers: browserSet }
    };
  },
  async getCalculation(id) {
    return memCalculations.find((r) => String(r.id) === String(id)) || null;
  },
  async toggleFavorite(id, favorite) {
    const row = memCalculations.find((r) => String(r.id) === String(id));
    if (!row) return null;
    row.isFavorite = favorite ? 1 : 0;
    return { isFavorite: row.isFavorite };
  },
  async deleteCalculation(id) {
    const idx = memCalculations.findIndex((r) => String(r.id) === String(id));
    if (idx === -1) return false;
    memCalculations.splice(idx, 1);
    return true;
  },
  async bulkDelete(ids) {
    const set = new Set(ids.map((v) => String(v)));
    let removed = 0;
    for (let i = memCalculations.length - 1; i >= 0; i--) {
      if (set.has(String(memCalculations[i].id))) {
        memCalculations.splice(i, 1);
        removed++;
      }
    }
    return removed;
  },
  async clearAll() {
    memCalculations.length = 0;
    memVisitors.clear();
    return { calculations: 0, visitors: 0 };
  },
  async exportRows({ q, scoreMin, scoreMax, date }) {
    let rows = memCalculations.slice();
    if (q) {
      const needle = q.toLowerCase();
      rows = rows.filter(
        (r) =>
          String(r.yourName).toLowerCase().includes(needle) ||
          String(r.crushName).toLowerCase().includes(needle)
      );
    }
    rows = rows.filter((r) => r.score >= scoreMin && r.score <= scoreMax);
    if (date === 'today') {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      rows = rows.filter((r) => new Date(r.createdAt).getTime() >= d.getTime());
    } else if (date === 'week') {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - d.getDay());
      rows = rows.filter((r) => new Date(r.createdAt).getTime() >= d.getTime());
    } else if (date === 'month') {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(1);
      rows = rows.filter((r) => new Date(r.createdAt).getTime() >= d.getTime());
    }
    rows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return rows;
  }
};

// ---------------------------------------------------------------------------
// Firestore helpers
// ---------------------------------------------------------------------------

function docToCalculation(snap) {
  const d = snap.data() || {};
  const ts = (() => {
    if (d.timestamp instanceof Date) return d.timestamp;
    if (d.timestamp && typeof d.timestamp.toDate === 'function') return d.timestamp.toDate();
    return new Date(d.timestamp || d.createdAt || Date.now());
  })();
  return {
    id: d.id || snap.id,
    yourName: d.yourName || '',
    crushName: d.crushName || '',
    score: Number(d.score) || 0,
    message: d.message || '',
    date: d.date || ts.toISOString().slice(0, 10),
    time: d.time || ts.toISOString().slice(11, 19),
    timestamp: ts.toISOString(),
    createdAt: ts.toISOString(),
    browser: d.browser || '',
    device: d.device || '',
    os: d.os || '',
    language: d.language || '',
    timezone: d.timezone || '',
    anonymousSessionId: d.anonymousSessionId || '',
    country: d.country || '',
    ipHash: d.ipHash || ''
  };
}

const firestoreStore = {
  async addCalculation(record) {
    const ts = new Date();
    const docRef = firestore.collection(CALC_COLLECTION).doc();
    const data = {
      id: docRef.id,
      yourName: record.yourName,
      crushName: record.crushName,
      score: record.score,
      message: record.message,
      date: record.date || ts.toISOString().slice(0, 10),
      time: record.time || ts.toISOString().slice(11, 19),
      timestamp: ts.toISOString(),
      browser: record.browser || '',
      device: record.device || '',
      os: record.os || '',
      language: record.language || '',
      timezone: record.timezone || '',
      anonymousSessionId: record.anonymousSessionId || '',
      country: record.country || '',
      ipHash: record.ipHash || ''
    };
    await docRef.set(data);
    return { ...data, id: docRef.id };
  },

  async upsertVisitor(visitor) {
    const ref = firestore.collection('visitors').doc(visitor.anonymousSessionId);
    const now = new Date().toISOString();
    await ref.set(
      {
        anonymousSessionId: visitor.anonymousSessionId,
        ipHash: visitor.ipHash,
        device: visitor.device,
        browser: visitor.browser,
        os: visitor.os,
        language: visitor.language,
        timezone: visitor.timezone,
        country: visitor.country,
        firstSeen: now,
        lastSeen: now
      },
      { merge: true }
    );
    return { ...visitor, lastSeen: now };
  },

  async stats() {
    const all = await firestore
      .collection(CALC_COLLECTION)
      .orderBy('timestamp', 'desc')
      .limit(5000)
      .get();
    const rows = all.docs.map(docToCalculation);

    const visitorSnap = await firestore.collection('visitors').count().get();
    const visitors = visitorSnap.data().count || 0;

    const startToday = new Date();
    startToday.setHours(0, 0, 0, 0);
    const startWeek = new Date(startToday);
    startWeek.setDate(startToday.getDate() - startToday.getDay());
    const startMonth = new Date(startToday.getFullYear(), startToday.getMonth(), 1);

    const today = rows.filter((r) => new Date(r.timestamp).getTime() >= startToday.getTime()).length;
    const week = rows.filter((r) => new Date(r.timestamp).getTime() >= startWeek.getTime()).length;
    const month = rows.filter((r) => new Date(r.timestamp).getTime() >= startMonth.getTime()).length;

    const scores = rows.map((r) => r.score);
    const nameCounts = new Map();
    rows.forEach((r) => {
      nameCounts.set(r.yourName, (nameCounts.get(r.yourName) || 0) + 1);
      nameCounts.set(r.crushName, (nameCounts.get(r.crushName) || 0) + 1);
    });

    const distribution = Array.from({ length: 11 }, (_, i) => ({ bucket: i, cnt: 0 }));
    rows.forEach((r) => {
      const b = Math.min(10, Math.max(0, Math.floor(r.score / 10)));
      distribution[b].cnt += 1;
    });

    const trend = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(startToday);
      d.setDate(startToday.getDate() - i);
      const next = new Date(d);
      next.setDate(d.getDate() + 1);
      const dayKey = d.toISOString().slice(0, 10);
      trend.push({
        date: dayKey,
        count: rows.filter((r) => {
          const t = new Date(r.timestamp).getTime();
          return t >= d.getTime() && t < next.getTime();
        }).length
      });
    }

    const topScores = rows
      .slice()
      .sort((a, b) => b.score - a.score || new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 10)
      .map((r) => ({ id: r.id, yourName: r.yourName, crushName: r.crushName, score: r.score, message: r.message, createdAt: r.createdAt, isFavorite: !!r.isFavorite }));

    return {
      total: rows.length,
      visitors,
      today,
      week,
      month,
      avg: scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : 0,
      high: scores.length ? Math.max(...scores) : 0,
      low: scores.length ? Math.min(...scores) : 0,
      topNames: [...nameCounts.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 10)
        .map(([name, count]) => ({ name, count })),
      distribution,
      trend,
      recent: rows.slice(0, 8).map((r) => ({ ...r, isFavorite: !!r.isFavorite })),
      topScores
    };
  },

  async listCalculations({ q, scoreMin, scoreMax, date, device, browser, sort, page, limit }) {
    const snap = await firestore
      .collection(CALC_COLLECTION)
      .orderBy('timestamp', 'desc')
      .limit(2000)
      .get();
    let rows = snap.docs.map(docToCalculation);

    if (q) {
      const needle = q.toLowerCase();
      rows = rows.filter(
        (r) =>
          String(r.yourName).toLowerCase().includes(needle) ||
          String(r.crushName).toLowerCase().includes(needle) ||
          String(r.message).toLowerCase().includes(needle) ||
          String(r.score).includes(needle)
      );
    }
    rows = rows.filter((r) => r.score >= scoreMin && r.score <= scoreMax);
    if (date === 'today') {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      rows = rows.filter((r) => new Date(r.timestamp).getTime() >= d.getTime());
    } else if (date === 'week') {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - d.getDay());
      rows = rows.filter((r) => new Date(r.timestamp).getTime() >= d.getTime());
    } else if (date === 'month') {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(1);
      rows = rows.filter((r) => new Date(r.timestamp).getTime() >= d.getTime());
    }
    if (device) rows = rows.filter((r) => r.device === device);
    if (browser) rows = rows.filter((r) => r.browser === browser);

    const sorters = {
      newest: (a, b) => new Date(b.timestamp) - new Date(a.timestamp),
      oldest: (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
      score_high: (a, b) => b.score - a.score || new Date(b.timestamp) - new Date(a.timestamp),
      score_low: (a, b) => a.score - b.score || new Date(b.timestamp) - new Date(a.timestamp)
    };
    rows.sort(sorters[sort] || sorters.newest);

    const total = rows.length;
    const start = (page - 1) * limit;
    const pageRows = rows.slice(start, start + limit);

    const deviceSet = [...new Set(rows.map((r) => r.device).filter(Boolean))].sort();
    const browserSet = [...new Set(rows.map((r) => r.browser).filter(Boolean))].sort();

    return {
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      rows: pageRows,
      filters: { devices: deviceSet, browsers: browserSet }
    };
  },

  async getCalculation(id) {
    const snap = await firestore.collection(CALC_COLLECTION).doc(String(id)).get();
    return snap.exists ? docToCalculation(snap) : null;
  },

  async toggleFavorite(id, favorite) {
    const snap = await firestore.collection(CALC_COLLECTION).doc(String(id)).get();
    if (!snap.exists) return null;
    const val = favorite ? 1 : 0;
    await firestore.collection(CALC_COLLECTION).doc(String(id)).update({ isFavorite: val });
    return { isFavorite: val };
  },

  async deleteCalculation(id) {
    await firestore.collection(CALC_COLLECTION).doc(String(id)).delete();
    return true;
  },

  async bulkDelete(ids) {
    const batch = firestore.batch();
    ids.forEach((id) => batch.delete(firestore.collection(CALC_COLLECTION).doc(String(id))));
    await batch.commit();
    return ids.length;
  },

  async clearAll() {
    const [calcSnap, visitorSnap] = await Promise.all([
      firestore.collection(CALC_COLLECTION).get(),
      firestore.collection('visitors').get()
    ]);
    const batch = firestore.batch();
    calcSnap.docs.forEach((d) => batch.delete(d.ref));
    visitorSnap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    return { calculations: calcSnap.size, visitors: visitorSnap.size };
  },

  async exportRows({ q, scoreMin, scoreMax, date }) {
    const snap = await firestore
      .collection(CALC_COLLECTION)
      .orderBy('timestamp', 'desc')
      .limit(2000)
      .get();
    let rows = snap.docs.map(docToCalculation);
    if (q) {
      const needle = q.toLowerCase();
      rows = rows.filter(
        (r) =>
          String(r.yourName).toLowerCase().includes(needle) ||
          String(r.crushName).toLowerCase().includes(needle)
      );
    }
    rows = rows.filter((r) => r.score >= scoreMin && r.score <= scoreMax);
    if (date === 'today') {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      rows = rows.filter((r) => new Date(r.timestamp).getTime() >= d.getTime());
    } else if (date === 'week') {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - d.getDay());
      rows = rows.filter((r) => new Date(r.timestamp).getTime() >= d.getTime());
    } else if (date === 'month') {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(1);
      rows = rows.filter((r) => new Date(r.timestamp).getTime() >= d.getTime());
    }
    return rows;
  }
};

// ---------------------------------------------------------------------------
// Public API: choose the right store
// ---------------------------------------------------------------------------

export function useStore() {
  if (isFirebaseReady() && firestore) {
    return { kind: 'firestore', store: firestoreStore };
  }
  return { kind: 'preview', store: memStore };
}

export default useStore;
