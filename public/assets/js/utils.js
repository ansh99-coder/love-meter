/**
 * Love Meter ❤️ — Shared utilities.
 */

/** Escape HTML special characters to prevent XSS. */
export function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/** Sanitize a string: remove angle brackets, trim, cap length. */
export function sanitize(str, maxLen = 40) {
  return String(str || '')
    .replace(/[<>]/g, '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .slice(0, maxLen);
}

/** Get or create an anonymous session ID. */
export function getOrCreateSessionId() {
  let sid = localStorage.getItem('lm_session_id');
  if (!sid) {
    sid = 'sess_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
    localStorage.setItem('lm_session_id', sid);
  }
  return sid;
}

/** Get the user's timezone. */
export function getTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return '';
  }
}

/** Get the user's language. */
export function getLanguage() {
  return navigator.language || navigator.userLanguage || '';
}

/** Debounce a function. */
export function debounce(fn, delay = 300) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

/** Throttle a function. */
export function throttle(fn, limit = 200) {
  let inThrottle = false;
  return function (...args) {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => { inThrottle = false; }, limit);
    }
  };
}

/** Sleep for N ms. */
export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Format a number with commas. */
export function formatNumber(n) {
  return Number(n).toLocaleString();
}

/**
 * Build a shareable message + URL for a love result.
 * @param {object} result - { yourName, crushName, score, title }
 * @returns {{ message: string, url: string }}
 */
export function getShareData(result) {
  const name1 = result.yourName || result.name1 || '';
  const name2 = result.crushName || result.name2 || '';
  const score = result.score ?? 0;
  const title = result.title || result.message || 'Love Connection';

  const message = `${name1} ❤️ ${name2} have a Love Score of ${score}%! ${title} 💕\n\nTry yours at:`;

  // Encode names + score into a shareable URL query param
  const shareData = `${encodeURIComponent(name1)}|${encodeURIComponent(name2)}|${score}`;
  const baseUrl = window.location.origin + window.location.pathname;
  const url = `${baseUrl}?share=${btoa(shareData)}`;

  return { message, url };
}
