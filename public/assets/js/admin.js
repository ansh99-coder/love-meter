/**
 * Love Meter ❤️ — Admin Dashboard Module.
 *
 * Firebase Auth-based admin login, full dashboard with stats, charts,
 * top 10 scores, recent activity with timestamps, favorites, search,
 * filter, pagination, delete, export, and auto-refresh.
 * Includes forgot-password flow via Firebase Auth.
 */

import { getStats, getCalculations, deleteCalculation, clearAllData, getExportUrl, verifyLogin } from './api.js';
import { showToast } from './animations.js';
import { signInAdmin, signOutAdmin, sendPasswordReset, initFirebaseClient } from './firebaseClient.js';
import { escapeHtml, debounce, formatNumber } from './utils.js';

let adminToken = localStorage.getItem('lm_admin_token') || null;
let currentPage = 1;
const PAGE_SIZE = 15;
let autoRefreshInterval = null;

// ============================================================
// Screen navigation (shared with main)
// ============================================================
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) {
    el.classList.add('active');
    void el.offsetHeight;
    el.style.animation = 'fadeIn 0.4s ease';
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================================
// Password toggle
// ============================================================
document.getElementById('toggle-pass')?.addEventListener('click', () => {
  const passInput = document.getElementById('admin-pass');
  const toggle = document.getElementById('toggle-pass');
  if (passInput.type === 'password') {
    passInput.type = 'text';
    toggle.textContent = '🙈';
  } else {
    passInput.type = 'password';
    toggle.textContent = '👁️';
  }
});

// ============================================================
// Forgot Password
// ============================================================
document.getElementById('forgot-pass')?.addEventListener('click', async () => {
  const email = document.getElementById('admin-email')?.value?.trim();
  if (!email) {
    showToast('Please enter your email address first.', 'error');
    return;
  }

  const forgotBtn = document.getElementById('forgot-pass');
  forgotBtn.textContent = 'Sending...';
  forgotBtn.style.pointerEvents = 'none';

  try {
    await sendPasswordReset(email);
    showToast('Password reset email sent successfully. Please check your inbox.', 'success');
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      showToast('No account found with this email address.', 'error');
    } else if (err.code === 'auth/invalid-email') {
      showToast('Invalid email format.', 'error');
    } else if (err.code === 'auth/too-many-requests') {
      showToast('Too many requests. Please try again later.', 'error');
    } else {
      showToast('Could not send reset email. Try again later.', 'error');
    }
  } finally {
    forgotBtn.textContent = 'Forgot Password?';
    forgotBtn.style.pointerEvents = 'auto';
  }
});

// ============================================================
// Admin Login
// ============================================================
document.getElementById('admin-login-btn')?.addEventListener('click', async () => {
  const email = document.getElementById('admin-email')?.value?.trim();
  const password = document.getElementById('admin-pass')?.value;
  const errEl = document.getElementById('admin-err');
  const loginBtn = document.getElementById('admin-login-btn');
  const btnLabel = loginBtn?.querySelector('.btn-label');
  const btnSpinner = loginBtn?.querySelector('.btn-spinner');

  if (!email || !password) {
    if (errEl) { errEl.textContent = 'Please enter email and password'; errEl.classList.add('show'); }
    return;
  }

  // Show loading spinner
  if (btnLabel) btnLabel.style.display = 'none';
  if (btnSpinner) btnSpinner.style.display = 'inline-block';
  loginBtn.disabled = true;

  try {
    const result = await signInAdmin(email, password);
    if (!result) {
      if (errEl) { errEl.textContent = 'Firebase is not configured. Admin login unavailable.'; errEl.classList.add('show'); }
      return;
    }

    adminToken = result.token;
    localStorage.setItem('lm_admin_token', adminToken);

    // Verify token with server
    await verifyLogin(adminToken);

    if (errEl) errEl.classList.remove('show');
    document.getElementById('admin-pass').value = '';

    showScreen('screen-admin');
    await refreshAdmin();
    startAutoRefresh();
  } catch (err) {
    if (errEl) { errEl.textContent = err.message; errEl.classList.add('show'); }
  } finally {
    if (btnLabel) btnLabel.style.display = 'inline';
    if (btnSpinner) btnSpinner.style.display = 'none';
    loginBtn.disabled = false;
  }
});

// Enter key for admin login
document.getElementById('admin-pass')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('admin-login-btn').click();
});
document.getElementById('admin-email')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('admin-login-btn').click();
});

// Admin back button
document.getElementById('admin-back-btn')?.addEventListener('click', () => {
  showScreen('screen-home');
});

// Admin logout
document.getElementById('admin-logout-btn')?.addEventListener('click', async () => {
  adminToken = null;
  localStorage.removeItem('lm_admin_token');
  localStorage.removeItem('lm_admin_session');
  stopAutoRefresh();
  await signOutAdmin().catch(() => {});
  showScreen('screen-home');
  showToast('Logged out', 'info');
});

// Try to restore session on page load
async function restoreSession() {
  if (!adminToken) return;
  try {
    await verifyLogin(adminToken);
    showScreen('screen-admin');
    await refreshAdmin();
    startAutoRefresh();
  } catch {
    adminToken = null;
    localStorage.removeItem('lm_admin_token');
  }
}

// ============================================================
// Dashboard refresh
// ============================================================
async function refreshAdmin() {
  if (!adminToken) return;
  await Promise.all([loadStats(), loadCalculations()]);
}

// ============================================================
// Stats
// ============================================================
async function loadStats() {
  try {
    const data = await getStats(adminToken);
    renderStats(data);
    renderTopScores(data.topScores || []);
    renderRecentActivity(data.recent || []);
    renderTrendChart(data.trend || []);
    renderDistributionChart(data.distribution || []);
  } catch (err) {
    console.error('Stats error:', err);
  }
}

function renderStats(data) {
  const grid = document.getElementById('stats-grid');
  if (!grid) return;

  const stats = [
    { val: formatNumber(data.total), lbl: 'Total Calculations' },
    { val: formatNumber(data.visitors), lbl: 'Unique Visitors' },
    { val: data.avg + '%', lbl: 'Average Score' },
    { val: data.high + '%', lbl: 'Highest Score' },
    { val: data.low + '%', lbl: 'Lowest Score' },
    { val: formatNumber(data.today), lbl: 'Today' },
    { val: formatNumber(data.week), lbl: 'This Week' },
    { val: formatNumber(data.month), lbl: 'This Month' },
  ];

  grid.innerHTML = stats.map(s => `
    <div class="stat-card">
      <div class="val count-up" data-target="${s.val}">0</div>
      <div class="lbl">${s.lbl}</div>
    </div>
  `).join('');

  // Animate the stat numbers
  document.querySelectorAll('.count-up').forEach(el => {
    const target = el.dataset.target;
    const numTarget = parseInt(target.replace(/[^0-9]/g, ''));
    if (!isNaN(numTarget)) {
      let current = 0;
      const step = Math.max(1, Math.floor(numTarget / 30));
      const interval = setInterval(() => {
        current += step;
        if (current >= numTarget) {
          current = numTarget;
          clearInterval(interval);
        }
        el.textContent = target.includes('%') ? current + '%' : formatNumber(current);
      }, 30);
    } else {
      el.textContent = target;
    }
  });
}

function renderTopScores(topScores) {
  const el = document.getElementById('top-scores');
  if (!el) return;
  if (!topScores || !topScores.length) {
    el.innerHTML = '<div class="recent-item" style="justify-content:center;color:var(--text-muted)">No scores yet</div>';
    return;
  }
  el.innerHTML = topScores.map((r, i) => `
    <div class="recent-item">
      <span class="rank">#${i + 1}</span>
      <span class="names">${escapeHtml(r.yourName)} ❤️ ${escapeHtml(r.crushName)}</span>
      <span class="score" style="color:${r.score >= 90 ? '#ffd700' : r.score >= 80 ? '#ff7fb0' : '#29ffc6'}">${r.score}%</span>
    </div>
  `).join('');
}

function renderRecentActivity(recent) {
  const el = document.getElementById('recent-activity');
  if (!el) return;
  if (!recent.length) {
    el.innerHTML = '<div class="recent-item" style="justify-content:center;color:var(--text-muted)">No recent calculations</div>';
    return;
  }
  el.innerHTML = recent.slice(0, 6).map(r => {
    const ts = new Date(r.createdAt || r.timestamp || Date.now());
    const timeStr = ts.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    return `
    <div class="recent-item">
      <span class="names">${escapeHtml(r.yourName)} ❤️ ${escapeHtml(r.crushName)}</span>
      <span class="meta">
        <span class="score">${r.score}%</span>
        <span class="time">${timeStr}</span>
      </span>
    </div>
  `}).join('');
}

// ============================================================
// Charts
// ============================================================
function renderTrendChart(trend) {
  const canvas = document.getElementById('trend-chart');
  if (!canvas || !trend.length) return;
  const ctx = canvas.getContext('2d');
  canvas.width = canvas.offsetWidth * 2;
  canvas.height = 180 * 2;
  ctx.scale(2, 2);
  const cw = canvas.offsetWidth;
  const ch = 180;

  ctx.clearRect(0, 0, cw, ch);

  const max = Math.max(...trend.map(t => t.count), 1);
  const pad = { top: 15, bottom: 20, left: 5, right: 5 };
  const chartW = cw - pad.left - pad.right;
  const chartH = ch - pad.top - pad.bottom;
  const barW = Math.max(4, chartW / trend.length * 0.6);

  const gradient = ctx.createLinearGradient(0, 0, 0, ch);
  gradient.addColorStop(0, 'rgba(255, 47, 135, 0.6)');
  gradient.addColorStop(1, 'rgba(124, 58, 255, 0.1)');

  trend.forEach((t, i) => {
    const x = pad.left + (i / trend.length) * chartW + (chartW / trend.length - barW) / 2;
    const barH = (t.count / max) * chartH;
    const y = pad.top + chartH - barH;

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(x, y, barW, barH, [4, 4, 0, 0]);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(t.date.slice(5), x + barW / 2, ch - 5);
  });
}

function renderDistributionChart(distribution) {
  const canvas = document.getElementById('distribution-chart');
  if (!canvas || !distribution.length) return;
  const ctx = canvas.getContext('2d');
  canvas.width = canvas.offsetWidth * 2;
  canvas.height = 120 * 2;
  ctx.scale(2, 2);
  const cw = canvas.offsetWidth;
  const ch = 120;

  ctx.clearRect(0, 0, cw, ch);

  const max = Math.max(...distribution.map(d => d.cnt), 1);
  const pad = { top: 5, bottom: 18, left: 5, right: 5 };
  const chartW = cw - pad.left - pad.right;
  const chartH = ch - pad.top - pad.bottom;
  const barW = Math.max(4, chartW / distribution.length * 0.7);

  const colors = ['#ff2f87', '#7c3aff', '#29ffc6', '#ffd700', '#ff5d8f', '#c0a0ff', '#ff6b9d'];

  distribution.forEach((d, i) => {
    const x = pad.left + (i / distribution.length) * chartW + (chartW / distribution.length - barW) / 2;
    const barH = (d.cnt / max) * chartH;
    const y = pad.top + chartH - barH;

    ctx.fillStyle = colors[i % colors.length];
    ctx.beginPath();
    ctx.roundRect(x, y, barW, barH, [3, 3, 0, 0]);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '7px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${d.bucket * 10}`, x + barW / 2, ch - 3);
  });
}

// ============================================================
// Calculations list with search/filter/pagination
// ============================================================
async function loadCalculations() {
  const q = document.getElementById('search-input')?.value?.trim() || '';
  const scoreFilter = document.getElementById('filter-score')?.value || 'all';
  const dateFilter = document.getElementById('filter-date')?.value || 'all';
  const sortOrder = document.getElementById('sort-order')?.value || 'newest';

  const minScore = scoreFilter === 'all' ? 0 : parseInt(scoreFilter.split('-')[0]);
  const maxScore = scoreFilter === 'all' ? 100 : parseInt(scoreFilter.split('-')[1]);

  try {
    const params = new URLSearchParams({
      q, page: currentPage, limit: PAGE_SIZE,
      scoreMin: minScore, scoreMax: maxScore,
      date: dateFilter, sort: sortOrder
    });
    const data = await getCalculations(adminToken, params);
    renderTable(data);
  } catch (err) {
    console.error('Load error:', err);
  }
}

function renderTable(data) {
  const tbody = document.getElementById('results-tbody');
  const emptyState = document.getElementById('empty-state');
  const pagination = document.getElementById('pagination');

  if (!tbody) return;

  const rows = data.rows || [];
  const totalPages = data.totalPages || 1;

  if (!rows.length) {
    tbody.innerHTML = '';
    if (emptyState) emptyState.style.display = 'block';
    if (pagination) pagination.innerHTML = '';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';

  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>${escapeHtml(r.yourName)}</td>
      <td>${escapeHtml(r.crushName)}</td>
      <td><span class="score-pill" style="${scoreColor(r.score)}">${r.score}%</span></td>
      <td>${escapeHtml(r.message)}</td>
      <td>${new Date(r.createdAt || r.timestamp).toLocaleString()}</td>
      <td>${r.device || '—'}</td>
      <td>${r.browser || '—'}</td>
      <td>
        <button class="del-btn" data-id="${r.id}">Delete</button>
      </td>
    </tr>
  `).join('');

  // Pagination
  if (pagination) {
    pagination.innerHTML = `
      <button id="prev-page" ${currentPage <= 1 ? 'disabled' : ''}>‹ Prev</button>
      <span>Page ${currentPage} of ${totalPages}</span>
      <button id="next-page" ${currentPage >= totalPages ? 'disabled' : ''}>Next ›</button>
    `;
    document.getElementById('prev-page')?.addEventListener('click', () => { currentPage--; loadCalculations(); });
    document.getElementById('next-page')?.addEventListener('click', () => { currentPage++; loadCalculations(); });
  }

  // Delete handlers
  tbody.querySelectorAll('.del-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      if (!confirm('Delete this record?')) return;
      try {
        await deleteCalculation(adminToken, id);
        showToast('Record deleted', 'success');
        await refreshAdmin();
      } catch { showToast('Failed to delete', 'error'); }
    });
  });
}

function scoreColor(score) {
  if (score >= 80) return 'background:rgba(255,47,135,0.15);color:#ff7fb0;';
  if (score >= 60) return 'background:rgba(41,255,198,0.15);color:#29ffc6;';
  if (score >= 40) return 'background:rgba(255,180,93,0.15);color:#ffb45d;';
  return 'background:rgba(255,93,108,0.15);color:#ff5d6c;';
}

// Filter change handlers
const debouncedSearch = debounce(() => { currentPage = 1; loadCalculations(); }, 400);
['search-input', 'filter-score', 'filter-date', 'sort-order'].forEach(id => {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener('input', debouncedSearch);
    el.addEventListener('change', () => { currentPage = 1; loadCalculations(); });
  }
});

// ============================================================
// Export buttons
// ============================================================
document.getElementById('export-csv-btn')?.addEventListener('click', () => exportData('csv'));
document.getElementById('export-json-btn')?.addEventListener('click', () => exportData('json'));
document.getElementById('export-xlsx-btn')?.addEventListener('click', () => exportData('xlsx'));

async function exportData(format) {
  if (!adminToken) return;
  const q = document.getElementById('search-input')?.value?.trim() || '';
  const scoreFilter = document.getElementById('filter-score')?.value || 'all';
  const dateFilter = document.getElementById('filter-date')?.value || 'all';
  const minScore = scoreFilter === 'all' ? 0 : parseInt(scoreFilter.split('-')[0]);
  const maxScore = scoreFilter === 'all' ? 100 : parseInt(scoreFilter.split('-')[1]);

  try {
    const url = getExportUrl(adminToken, { format, q, scoreMin: minScore, scoreMax: maxScore, date: dateFilter });
    const res = await fetch(url, { headers: { Authorization: `Bearer ${adminToken}` } });
    if (!res.ok) throw new Error('Export failed');
    const blob = await res.blob();
    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    const ext = { csv: 'csv', json: 'json', xlsx: 'xls' }[format] || 'csv';
    a.download = `lovemeter-export-${new Date().toISOString().slice(0, 10)}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(downloadUrl);
    showToast(`Exported as ${format.toUpperCase()}`, 'success');
  } catch (err) {
    showToast('Export failed', 'error');
  }
}

// ============================================================
// Clear all data
// ============================================================
document.getElementById('clear-all-btn')?.addEventListener('click', async () => {
  if (!confirm('Delete ALL records? This cannot be undone!')) return;
  try {
    await clearAllData(adminToken);
    showToast('All data cleared', 'success');
    await refreshAdmin();
  } catch { showToast('Failed to clear data', 'error'); }
});

// ============================================================
// Auto-refresh
// ============================================================
function startAutoRefresh() {
  stopAutoRefresh();
  autoRefreshInterval = setInterval(refreshAdmin, 15000);
}

function stopAutoRefresh() {
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
    autoRefreshInterval = null;
  }
}

// ============================================================
// Init
// ============================================================
restoreSession();
