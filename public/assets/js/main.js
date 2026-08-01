/**
 * Love Meter ❤️ — Main Application Logic.
 *
 * Handles: home screen, calculation flow, loading screen, result display,
 * premium share popup with encoded URL, favorites, themes, sound toggle,
 * daily quote, secret lock triple-click, legal modals, keyboard shortcuts,
 * and accessibility.
 */

import { API_BASE, getDailyQuote, getMessageForScore, getRandomLoadingMessage } from './config.js';
import { launchConfetti, animateCountUp, animateMeterFill, heartbeatEffect, showToast, rippleEffect } from './animations.js';
import { playClick, playSuccess, playHeartbeat, isSoundEnabled, toggleSound, toggleMusic, isMusicEnabled, preloadAudio, playMusic } from './audio.js';
import { sanitize, getOrCreateSessionId, getTimezone, getLanguage, escapeHtml, getShareData } from './utils.js';
import { calculateLove } from './api.js';
import { initParticles, initHeartTrail, initCustomCursor, injectParticleStyles } from './particles.js';

// State
let lastResult = null;
let sessionId = getOrCreateSessionId();
let clickCount = 0;
let clickTimer = null;

// DOM refs
const p1Input = document.getElementById('p1');
const p2Input = document.getElementById('p2');
const p1Err = document.getElementById('p1-err');
const p2Err = document.getElementById('p2-err');
const calcBtn = document.getElementById('calc-btn');
const retryBtn = document.getElementById('retry-btn');
const shareBtn = document.getElementById('share-btn');
const favoriteBtn = document.getElementById('favorite-btn');
const lockIcon = document.getElementById('secret-lock');
const soundToggleEl = document.getElementById('sound-toggle');
const musicToggleEl = document.getElementById('music-toggle');
const shareModal = document.getElementById('share-modal');
const shareClose = document.getElementById('share-close');
const shareMessage = document.getElementById('share-message');
const shareNote = document.getElementById('share-note');

// ============================================================
// Screen navigation
// ============================================================
export function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) {
    el.classList.add('active');
    el.style.animation = 'none';
    void el.offsetHeight;
    el.style.animation = 'fadeIn 0.4s ease';
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================================
// Validation
// ============================================================
function validate() {
  let ok = true;
  const v1 = sanitize(p1Input.value);
  const v2 = sanitize(p2Input.value);
  if (!v1) { p1Input.classList.add('error'); p1Err.classList.add('show'); ok = false; }
  else { p1Input.classList.remove('error'); p1Err.classList.remove('show'); }
  if (!v2) { p2Input.classList.add('error'); p2Err.classList.add('show'); ok = false; }
  else { p2Input.classList.remove('error'); p2Err.classList.remove('show'); }
  if (!ok) return false;
  if (v1.toLowerCase() === v2.toLowerCase()) {
    p2Err.textContent = 'Enter two different names — your crush needs a name too!';
    p2Err.classList.add('show');
    p2Input.classList.add('error');
    return false;
  }
  p2Err.textContent = 'Please enter your crush\'s name';
  return true;
}

// ============================================================
// Calculate love
// ============================================================
calcBtn.addEventListener('click', async () => {
  if (!validate()) return;
  calcBtn.disabled = true;
  playClick();

  const name1 = sanitize(p1Input.value);
  const name2 = sanitize(p2Input.value);

  showScreen('screen-loading');
  const loadingText = document.querySelector('.loading-text');
  const loadingBar = document.querySelector('.loading-progress-bar');

  // Animate loading messages
  let msgIndex = 0;
  const msgInterval = setInterval(() => {
    msgIndex = (msgIndex + 1) % 10;
    if (loadingText) {
      loadingText.innerHTML = getRandomLoadingMessage() + ' <span class="loading-dots"><span>.</span><span>.</span><span>.</span></span>';
    }
  }, 900);

  // Animate progress bar
  let progress = 0;
  const progInterval = setInterval(() => {
    progress += Math.random() * 15 + 5;
    if (progress > 95) progress = 95;
    if (loadingBar) loadingBar.style.width = progress + '%';
  }, 200);

  try {
    const data = await calculateLove({
      yourName: name1,
      crushName: name2,
      sessionId,
      language: getLanguage(),
      timezone: getTimezone(),
      country: ''
    });

    clearInterval(msgInterval);
    clearInterval(progInterval);
    if (loadingBar) loadingBar.style.width = '100%';

    // Dramatic pause
    await new Promise(r => setTimeout(r, 400));

    lastResult = data;
    renderResult(data);
    showScreen('screen-result');
    playSuccess();

    if (data.score >= 80) {
      launchConfetti(data.score);
    }
    if (data.score >= 90) {
      heartbeatEffect(document.querySelector('.result-emoji'));
    }
  } catch (err) {
    clearInterval(msgInterval);
    clearInterval(progInterval);
    showToast(err.message || 'Something went wrong. Please try again.', 'error');
    showScreen('screen-home');
  } finally {
    calcBtn.disabled = false;
  }
});

// Enter key support
[p1Input, p2Input].forEach(inp => {
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') calcBtn.click(); });
});

// ============================================================
// Result rendering
// ============================================================
const CIRCUMFERENCE = 2 * Math.PI * 100;
const meterFill = document.getElementById('meter-fill');
if (meterFill) {
  meterFill.style.strokeDasharray = CIRCUMFERENCE;
  meterFill.style.strokeDashoffset = CIRCUMFERENCE;
}

function renderResult(r) {
  document.getElementById('result-names').innerHTML =
    escapeHtml(r.yourName || r.name1) + '<span class="amp">❤️</span>' + escapeHtml(r.crushName || r.name2);

  const msgEl = document.getElementById('result-msg');
  const msg = getMessageForScore(r.score);
  if (msg) {
    msgEl.textContent = msg.title;
  } else {
    msgEl.textContent = r.title || 'Love Connection';
  }

  const emojiEl = document.getElementById('result-emoji');
  if (emojiEl) {
    emojiEl.textContent = msg ? msg.emoji : (r.emoji || '❤️');
  }

  const scoreEl = document.getElementById('meter-score');
  animateMeterFill(meterFill, r.score);
  animateCountUp(scoreEl, r.score);
}

// ============================================================
// Retry
// ============================================================
retryBtn.addEventListener('click', () => {
  p1Input.value = '';
  p2Input.value = '';
  p1Input.classList.remove('error');
  p2Input.classList.remove('error');
  p1Err.classList.remove('show');
  p2Err.classList.remove('show');
  showScreen('screen-home');
});

// ============================================================
// Premium Share Popup
// ============================================================
function buildShareText(result) {
  const name1 = result.yourName || result.name1;
  const name2 = result.crushName || result.name2;
  const msg = getMessageForScore(result.score);
  return {
    full: `${name1} ❤️ ${name2} have a Love Score of ${result.score}%! ${msg ? msg.title : 'Love Connection'} 💕\n\nTry yours at:`,
    short: `${name1} ❤️ ${name2} = ${result.score}% Love Compatibility!`
  };
}

function buildShareUrl(result) {
  // Create a shareable URL with encoded data (names + score)
  const { url } = getShareData(result);
  return url;
}

// Handle incoming share URL on page load
function handleShareUrl() {
  const params = new URLSearchParams(window.location.search);
  const shareParam = params.get('share');
  if (!shareParam) return;
  try {
    const decoded = atob(shareParam);
    const parts = decoded.split('|');
    if (parts.length >= 3) {
      const name1 = decodeURIComponent(parts[0]);
      const name2 = decodeURIComponent(parts[1]);
      const score = parseInt(parts[2]);
      if (name1 && name2 && !isNaN(score)) {
        document.getElementById('p1').value = name1;
        document.getElementById('p2').value = name2;
        // Show the result directly
        const data = { yourName: name1, crushName: name2, score, title: getMessageForScore(score)?.title || 'Love Connection', emoji: getMessageForScore(score)?.emoji || '❤️' };
        lastResult = data;
        renderResult(data);
        showScreen('screen-result');
        document.getElementById('p1').value = '';
        document.getElementById('p2').value = '';
      }
    }
  } catch {}
}

// Share button click — opens the premium share popup
shareBtn.addEventListener('click', () => {
  if (!lastResult) return;
  playClick();

  const texts = buildShareText(lastResult);
  const shareUrl = buildShareUrl(lastResult);

  if (shareMessage) {
    shareMessage.textContent = texts.full;
  }
  if (shareNote) {
    shareNote.style.display = 'none';
  }

  shareModal.classList.add('active');
});

// Close share popup
shareClose?.addEventListener('click', () => shareModal.classList.remove('active'));
shareModal?.addEventListener('click', e => {
  if (e.target === shareModal) shareModal.classList.remove('active');
});

// Share network handlers
document.querySelectorAll('.share-option').forEach(btn => {
  btn.addEventListener('click', async (e) => {
    if (!lastResult) return;
    const network = btn.dataset.network;
    const texts = buildShareText(lastResult);
    const shareUrl = buildShareUrl(lastResult);
    const fullText = `${texts.full} ${shareUrl}`;
    const shortText = texts.short;

    switch (network) {
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(fullText)}`, '_blank', 'noopener,noreferrer');
        break;
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shortText)}`, '_blank', 'noopener,noreferrer');
        break;
      case 'instagram': {
        // Instagram doesn't support direct URL sharing - copy to clipboard
        await navigator.clipboard.writeText(fullText);
        if (shareNote) {
          shareNote.textContent = '📸 Copied! Paste this on Instagram.';
          shareNote.style.display = 'block';
        }
        showToast('Copied for Instagram!', 'success');
        break;
      }
      case 'telegram':
        window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shortText)}`, '_blank', 'noopener,noreferrer');
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shortText)}&url=${encodeURIComponent(shareUrl)}`, '_blank', 'noopener,noreferrer');
        break;
      case 'copy':
        await navigator.clipboard.writeText(fullText);
        if (shareNote) {
          shareNote.textContent = '🔗 Link copied to clipboard!';
          shareNote.style.display = 'block';
        }
        showToast('Copied to clipboard!', 'success');
        break;
      case 'native':
        if (navigator.share) {
          try {
            await navigator.share({ title: 'Love Meter', text: shortText, url: shareUrl });
          } catch {}
        } else {
          await navigator.clipboard.writeText(fullText);
          showToast('Copied to clipboard!', 'success');
        }
        break;
    }
  });
});

// ============================================================
// Favorite button
// ============================================================
let isFavorited = false;

favoriteBtn?.addEventListener('click', async () => {
  if (!lastResult) return;
  isFavorited = !isFavorited;
  favoriteBtn.classList.toggle('active', isFavorited);
  favoriteBtn.innerHTML = isFavorited ? '💖 Saved' : '❤️ Save';
  showToast(isFavorited ? 'Added to favorites! 💕' : 'Removed from favorites', 'info');
  if (isFavorited) {
    playHeartbeat();
  }
});

// ============================================================
// Daily quote
// ============================================================
function loadDailyQuote() {
  const el = document.getElementById('daily-quote');
  if (!el) return;
  const quote = getDailyQuote();
  if (quote) {
    el.innerHTML = `"${quote.quote}"<span class="author">— ${quote.author}</span>`;
  }
}

// ============================================================
// Theme management
// ============================================================
function loadTheme() {
  const saved = localStorage.getItem('lm_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeButtons(saved);
}

function updateThemeButtons(active) {
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === active);
  });
}

document.querySelectorAll('.theme-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const theme = btn.dataset.theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('lm_theme', theme);
    updateThemeButtons(theme);
    showToast(`Theme changed to ${theme}`, 'info');
  });
});

// ============================================================
// Sound toggle
// ============================================================
if (soundToggleEl) {
  soundToggleEl.addEventListener('click', () => {
    const enabled = toggleSound();
    soundToggleEl.textContent = enabled ? '🔊' : '🔇';
    showToast(enabled ? 'Sound enabled' : 'Sound muted', 'info');
  });
  soundToggleEl.textContent = isSoundEnabled() ? '🔊' : '🔇';
}

// ============================================================
// Music toggle
// ============================================================
if (musicToggleEl) {
  musicToggleEl.addEventListener('click', () => {
    const enabled = toggleMusic();
    musicToggleEl.classList.toggle('muted', !enabled);
    showToast(enabled ? 'Music enabled 🎶' : 'Music muted', 'info');
  });
  musicToggleEl.classList.toggle('muted', !isMusicEnabled());
}

// ============================================================
// Triple-click handler for hidden admin
// ============================================================
if (lockIcon) {
  lockIcon.addEventListener('click', () => {
    clickCount++;
    if (clickTimer) clearTimeout(clickTimer);
    if (clickCount >= 3) {
      clickCount = 0;
      showScreen('screen-admin-login');
      playClick();
    } else {
      clickTimer = setTimeout(() => { clickCount = 0; }, 2000);
    }
  });
}

// ============================================================
// Legal modals
// ============================================================
const legalModal = document.getElementById('legal-modal');
const legalTitle = document.getElementById('legal-title');
const legalBody = document.getElementById('legal-body');

const PRIVACY_TEXT = 'We store the names you enter and the love score generated, along with a timestamp and an anonymous session identifier, solely to operate and improve Love Meter. We do not collect passwords, phone numbers, addresses, or other sensitive personal data. Please avoid entering real sensitive information. Data may be viewed in aggregate by the site operator via the admin dashboard.';
const TERMS_TEXT = 'Love Meter is provided purely for entertainment purposes. The love score is generated by a fun, deterministic algorithm and does not reflect any real measurement of compatibility, closeness, or the quality of a relationship. Use the results for fun and sharing only. By using this site you agree not to submit sensitive personal information.';

document.getElementById('link-privacy')?.addEventListener('click', () => {
  legalTitle.textContent = 'Privacy Policy';
  legalBody.textContent = PRIVACY_TEXT;
  legalModal.classList.add('active');
});
document.getElementById('link-terms')?.addEventListener('click', () => {
  legalTitle.textContent = 'Terms of Use';
  legalBody.textContent = TERMS_TEXT;
  legalModal.classList.add('active');
});
document.getElementById('legal-close')?.addEventListener('click', () => legalModal.classList.remove('active'));
legalModal?.addEventListener('click', e => { if (e.target === legalModal) legalModal.classList.remove('active'); });

// ============================================================
// Ripple effect on buttons
// ============================================================
document.querySelectorAll('.btn').forEach(btn => {
  btn.addEventListener('click', rippleEffect);
});

// ============================================================
// Keyboard shortcuts
// ============================================================
document.addEventListener('keydown', (e) => {
  // Escape closes modals
  if (e.key === 'Escape') {
    legalModal?.classList.remove('active');
    shareModal?.classList.remove('active');
  }
  // Ctrl+Enter to calculate
  if (e.ctrlKey && e.key === 'Enter') {
    calcBtn?.click();
  }
});

// ============================================================
// Initialize
// ============================================================
export function init() {
  injectParticleStyles();
  initParticles();
  initHeartTrail();
  initCustomCursor();
  loadDailyQuote();
  loadTheme();
  handleShareUrl();
  preloadAudio();
  // Auto-start ambient music if previously enabled (requires user gesture on
  // most browsers, so this is best-effort).
  if (isMusicEnabled()) {
    document.addEventListener('click', function startMusic() {
      playMusic().catch(() => {});
      document.removeEventListener('click', startMusic);
    }, { once: true });
  }
  showScreen('screen-home');
}

// Auto-init
document.addEventListener('DOMContentLoaded', init);
