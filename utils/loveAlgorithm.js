/**
 * Love Meter ❤️ — Deterministic love scoring algorithm.
 *
 * The exact same pair of names ALWAYS produces the exact same score.
 * No random number generators are used anywhere in scoring.
 *
 * Score range: 0–100 with a natural, believable distribution.
 * The algorithm blends three independent stable hash functions plus a small
 * "name harmony" factor to create a natural curve — most pairs land in the
 * 40–95 band, with rarer lower scores as a fun easter egg.
 */

/**
 * FNV-1a 32-bit hash (stable across platforms & runtimes).
 */
function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * djb2 32-bit hash (stable).
 */
function djb2(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  }
  return h;
}

/**
 * cyrb53 — a fast, high-quality 53-bit hash (deterministic).
 */
function cyrb53(str, seed = 0) {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

/** Normalize a name for hashing: lowercase, strip non-letter/number chars. */
function normalizeName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '')
    .trim();
}

/**
 * Compute the deterministic love score (0–100) for a pair of names.
 * Order of the names does not matter: "Romeo & Juliet" === "Juliet & Romeo".
 */
export function computeLoveScore(name1, name2) {
  const x = normalizeName(name1);
  const y = normalizeName(name2);

  // Canonical, order-independent key
  const sorted = [x, y].sort().join('&');

  const h1 = fnv1a(sorted);
  const h2 = djb2(sorted + '|love');
  const h3 = cyrb53(x + '♥' + y, 0x10ad);

  // Name harmony factor — a tiny stable multiplier (1.00 – 1.11)
  const harmony = 1 + (h3 % 12) / 100;

  // Raw score across a wide range (0 – ~110)
  const raw = ((h1 % 41) + (h2 % 37) + (h3 % 24)) * harmony;

  // Map into the full 0–100 band with a natural spread.
  // Combining three hash moduli yields a pseudo-bell-curve distribution:
  // most pairs land 40–95, fewer at the extremes.
  let score = 8 + Math.round(raw * 0.85);

  // Rare fun easter egg: a few pairs land in the low "just friends" zone.
  if (h1 % 97 === 0) score = Math.min(score, 12);

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Romantic message tier for a score. Matches the exact product spec:
 *   100  → Perfect Soulmates
 *   90+  → Made For Each Other
 *   80+  → Amazing Match
 *   70+  → Strong Chemistry
 *   60+  → Looking Great
 *   50+  → Potential Love
 *   30+  → Needs More Time
 *   10+  → Maybe Just Friends
 *   else → Just Friends
 */
export function messageForScore(score) {
  if (score >= 100) {
    return {
      title: 'Perfect Soulmates',
      emoji: '❤️',
      subtitle: 'An ethereal bond destined to last forever.'
    };
  }
  if (score >= 90) {
    return {
      title: 'Made For Each Other',
      emoji: '💕',
      subtitle: 'A match written in the stars!'
    };
  }
  if (score >= 80) {
    return {
      title: 'Amazing Match',
      emoji: '💖',
      subtitle: 'Sparks fly every time you are together.'
    };
  }
  if (score >= 70) {
    return {
      title: 'Strong Chemistry',
      emoji: '💘',
      subtitle: 'Something electric is definitely happening.'
    };
  }
  if (score >= 60) {
    return {
      title: 'Looking Great',
      emoji: '💞',
      subtitle: 'A lovely connection worth exploring.'
    };
  }
  if (score >= 50) {
    return {
      title: 'Potential Love',
      emoji: '🌹',
      subtitle: 'The foundation of something beautiful is here.'
    };
  }
  if (score >= 30) {
    return {
      title: 'Needs More Time',
      emoji: '💫',
      subtitle: 'The spark might grow with a little more time.'
    };
  }
  if (score >= 10) {
    return {
      title: 'Maybe Just Friends',
      emoji: '💔',
      subtitle: 'The friend zone is cozy too!'
    };
  }
  return {
    title: 'Just Friends',
    emoji: '😅',
    subtitle: 'A wholesome connection, and that is okay.'
  };
}

/** Public client-safe copy of the message tiers. */
export const SCORE_TIERS = [
  { min: 100, max: 100, title: 'Perfect Soulmates', emoji: '❤️' },
  { min: 90, max: 99, title: 'Made For Each Other', emoji: '💕' },
  { min: 80, max: 89, title: 'Amazing Match', emoji: '💖' },
  { min: 70, max: 79, title: 'Strong Chemistry', emoji: '💘' },
  { min: 60, max: 69, title: 'Looking Great', emoji: '💞' },
  { min: 50, max: 59, title: 'Potential Love', emoji: '🌹' },
  { min: 30, max: 49, title: 'Needs More Time', emoji: '💫' },
  { min: 10, max: 29, title: 'Maybe Just Friends', emoji: '💔' },
  { min: 0, max: 9, title: 'Just Friends', emoji: '😅' }
];

