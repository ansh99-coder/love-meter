/**
 * Love Meter ❤️ — Client-side deterministic love scoring.
 *
 * Mirrors the server-side algorithm exactly so the UI can preview scores
 * immediately if needed. The server's result is always authoritative.
 * Same names → always same score. Range: 0–100.
 */

function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function djb2(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  }
  return h;
}

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

function normalizeName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '')
    .trim();
}

/**
 * Compute the deterministic love score (0–100) for a pair of names.
 * Order does not matter.
 */
export function computeLoveScore(name1, name2) {
  const x = normalizeName(name1);
  const y = normalizeName(name2);
  const sorted = [x, y].sort().join('&');

  const h1 = fnv1a(sorted);
  const h2 = djb2(sorted + '|love');
  const h3 = cyrb53(x + '♥' + y, 0x10ad);

  const harmony = 1 + (h3 % 12) / 100;
  const raw = ((h1 % 41) + (h2 % 37) + (h3 % 24)) * harmony;

  let score = 8 + Math.round(raw * 0.85);
  if (h1 % 97 === 0) score = Math.min(score, 12);

  return Math.max(0, Math.min(100, Math.round(score)));
}

