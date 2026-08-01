/**
 * Love Meter ❤️ — API client.
 *
 * Thin wrapper around fetch for all backend communication.
 * Centralizes error handling, JSON parsing, and base URL.
 */

import { API_BASE } from './config.js';

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const config = {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options
  };

  const res = await fetch(url, config);
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(data?.error || `Request failed (${res.status})`, res.status);
  }

  return data;
}

/** Calculate love score. */
export function calculateLove({ yourName, crushName, sessionId, language, timezone, country }) {
  return request('/calculate', {
    method: 'POST',
    body: JSON.stringify({ yourName, crushName, sessionId, language, timezone, country })
  });
}

/** Health check. */
export function healthCheck() {
  return request('/health');
}

/** Get admin config (Firebase settings). */
export function getAdminConfig() {
  return request('/admin/config');
}

/** Verify Firebase ID token with the server. */
export function verifyLogin(token) {
  return request('/admin/verify-login', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
}

/** Get admin dashboard stats. */
export function getStats(token) {
  return request('/admin/stats', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

/** Get paginated calculations list. */
export function getCalculations(token, params = {}) {
  const qs = new URLSearchParams(params).toString();
  return request(`/admin/calculations${qs ? '?' + qs : ''}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

/** Export data. */
export function getExportUrl(token, params = {}) {
  const qs = new URLSearchParams({ ...params, format: params.format || 'csv' }).toString();
  return `${API_BASE}/admin/calculations/export?${qs}`;
}

/** Delete a single calculation. */
export function deleteCalculation(token, id) {
  return request(`/admin/calculations/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
}

/** Toggle favorite status for a calculation. */
export function toggleFavorite(token, id, favorite) {
  return request(`/admin/calculations/${id}/favorite`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ favorite })
  });
}

/** Bulk delete calculations. */
export function bulkDeleteCalculations(token, ids) {
  return request('/admin/calculations', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ ids })
  });
}

/** Clear all calculations and visitors. */
export function clearAllData(token) {
  return request('/admin/calculations/all', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
}

export { ApiError };

