/**
 * Love Meter ❤️ — Shared utilities.
 */

/** Escape HTML special characters to prevent XSS. */
export function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/** Production app URL used for all share links. */
export const APP_URL = 'https://love-meter-in02.onrender.com/';

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
 * Uses the production APP_URL — never the current window origin.
 * @param {object} result - { yourName, crushName, score, title }
 * @returns {{ message: string, url: string }}
 */
export function getShareData(result) {
  const name1 = result.yourName || result.name1 || '';
  const name2 = result.crushName || result.name2 || '';
  const score = result.score ?? 0;

  const message = buildShareMessage(result);

  // Encode names + score into a shareable URL query param
  const shareData = `${encodeURIComponent(name1)}|${encodeURIComponent(name2)}|${score}`;
  const url = `${APP_URL}?share=${btoa(shareData)}`;

  return { message, url };
}

/**
 * Build the clean, formatted share message.
 * Uses the first entered person's name dynamically.
 * @param {object} result - { yourName, crushName, score }
 * @returns {string}
 */
export function buildShareMessage(result) {
  const name1 = result.yourName || result.name1 || 'You';
  const score = result.score ?? 0;

  return `❤️ Love Meter Result ❤️

✨ ${name1}'s Love Meter Score ✨

💖 Compatibility Score: ${score}%

A beautiful match with amazing vibes and a heart full of love. 💕

Discover your own Love Meter score and see what your heart reveals! ❤️

🔗 Try it here:
${APP_URL}`;
}

/** Copy text to the clipboard with a fallback for non-secure contexts. */
export async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }
  } catch {
    // fall through to legacy fallback
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  ta.style.top = '0';
  ta.setAttribute('readonly', '');
  document.body.appendChild(ta);
  ta.select();
  ta.setSelectionRange(0, ta.value.length);
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  document.body.removeChild(ta);
  if (!ok) throw new Error('Clipboard copy failed');
}

