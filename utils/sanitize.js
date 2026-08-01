/**
 * Love Meter ❤️ — Input sanitization & validation.
 *
 * Defense-in-depth: every string entering the system is stripped of
 * markup/control characters, trimmed, and length-limited before use.
 */

/**
 * Remove angle brackets (XSS/HTML injection), control characters, trim, and
 * cap length. Keeps unicode letters/numbers/spaces intact.
 */
export function sanitizeString(value, maxLen = 40) {
  return String(value ?? '')
    .replace(/[<>]/g, '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

/** Keep only safe characters for a name: letters, numbers, spaces, apostrophes, hyphens, dots. */
export function sanitizeName(value, maxLen = 40) {
  return sanitizeString(value, maxLen)
    .replace(/[^\p{L}\p{N}\s'.\-]/gu, '')
    .trim();
}

/** A name must contain at least one letter (unicode-aware). */
export function hasLetter(value) {
  return /[\p{L}]/u.test(String(value || ''));
}

/**
 * Validate a pair of names. Returns an error string or null when valid.
 */
export function validateNames(name1, name2) {
  if (!name1 || !name2) return 'Please enter both names.';
  if (name1.toLowerCase() === name2.toLowerCase()) {
    return 'Enter two different names — your crush needs a name too!';
  }
  if (!hasLetter(name1)) return 'Please enter a valid name for you.';
  if (!hasLetter(name2)) return 'Please enter a valid name for your crush.';
  return null;
}

/** Escape a value for safe insertion into HTML (defense-in-depth on server-rendered bits). */
export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#39;');
}

/** Normalize an anonymous session id or generate a fresh one. */
export function sanitizeSessionId(value, maxLen = 64) {
  const cleaned = sanitizeString(value, maxLen).replace(/[^\w\-]/g, '');
  if (cleaned) return cleaned;
  return 'sess_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

/** Coerce an arbitrary value to a finite integer within [min, max]. */
export function toInt(value, fallback = 0, min = -Infinity, max = Infinity) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

