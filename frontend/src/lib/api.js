// src/lib/api.js — thin client for the PHP JSON API (backend/api/*.php).
// In dev, Vite proxies /api → php -S localhost:8000 -t backend.
// In prod (XAMPP), the built frontend is served next to backend/api/.

// API base that works at the domain root AND in a subfolder like
// /management/: derived from the page URL, so no rebuild per deploy.
export const API_BASE =
  (typeof window !== 'undefined' ? window.location.pathname.replace(/\/+$/, '') : '') + '/api';

const BASE = API_BASE;

async function req(path, opts = {}) {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

const qs = (params) => '?' + new URLSearchParams(
  Object.fromEntries(Object.entries(params).filter(([, v]) => v !== null && v !== undefined && v !== ''))
);

export const api = {
  dashboard: (params = {}) => req('/dashboard.php' + qs(params)),
  report: (params = {}) => req('/reports.php' + qs(params)),
  logReport: (data) => req('/reports.php', { method: 'POST', body: JSON.stringify(data) }),

  budgets: (month) => req('/budgets.php' + qs({ kind: 'budgets', month })),
  targets: (params = {}) => req('/budgets.php' + qs({ kind: 'targets', ...params })),
  saveBudget: (data) => req('/budgets.php', {
    method: data.id ? 'PUT' : 'POST', body: JSON.stringify({ kind: 'budget', ...data }),
  }),
  deleteBudget: (id) => req('/budgets.php' + qs({ kind: 'budget', id }), { method: 'DELETE' }),
  saveTarget: (data) => req('/budgets.php', {
    method: data.id ? 'PUT' : 'POST', body: JSON.stringify({ kind: 'target', ...data }),
  }),
  deleteTarget: (id) => req('/budgets.php' + qs({ kind: 'target', id }), { method: 'DELETE' }),

  decisions: (params = {}) => req('/decisions.php' + qs(params)),
  saveDecision: (data) => req('/decisions.php', {
    method: data.id ? 'PUT' : 'POST', body: JSON.stringify(data),
  }),
  deleteDecision: (id) => req('/decisions.php' + qs({ id }), { method: 'DELETE' }),

  alerts: (params = {}) => req('/alerts.php' + qs(params)),
  createAlert: (data) => req('/alerts.php', { method: 'POST', body: JSON.stringify(data) }),
  setAlertStatus: (id, status) => req('/alerts.php', {
    method: 'PUT', body: JSON.stringify({ id, status }),
  }),
  deleteAlert: (id) => req('/alerts.php' + qs({ id }), { method: 'DELETE' }),
};
