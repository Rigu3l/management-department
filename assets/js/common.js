/* assets/js/common.js — shared code for every page of the Management
   Department module: reference data, formatting, the API client with
   demo-data fallback, charts, exports, the sidebar, and the topbar
   (sidebar toggle, date/time, unread-alert bell).
   Plain JavaScript — no framework, no build step. */
(function () {
  'use strict';

  // ------------------------------------------------------------- icons
  const PATHS = {
    dashboard: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/>',
    chart: '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
    reports: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
    wallet: '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
    decisions: '<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
    bell: '<path d="M18 8A6 6 0 0 0 12 2a6 6 0 0 0-6 6c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
    bed: '<path d="M3 18v-8"/><path d="M3 13h18v5"/><path d="M3 16h18"/><circle cx="7.5" cy="10.5" r="1.8"/><path d="M11 10.5h7a3 3 0 0 1 3 3"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
    alert: '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    box: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>',
    tool: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
    sparkles: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    edit: '<path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
    trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>',
    x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    menu: '<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>',
    trend: '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
    eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
  };

  function icon(name, size) {
    size = size || 18;
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
      + (PATHS[name] || PATHS.dashboard) + '</svg>';
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');
  }

  // ------------------------------------------------------- reference data
  const DEPARTMENTS = [
    { id: 1, name: 'Management', code: 'MGT' },
    { id: 2, name: 'Front Office', code: 'FO' },
    { id: 3, name: 'Housekeeping', code: 'HK' },
    { id: 4, name: 'Food & Beverage', code: 'FB' },
    { id: 5, name: 'Kitchen & Food Production', code: 'KIT' },
    { id: 6, name: 'Accounts & Finance', code: 'FIN' },
    { id: 7, name: 'Maintenance', code: 'MNT' },
    { id: 8, name: 'Security', code: 'SEC' },
  ];
  const departmentName = (id) => {
    const d = DEPARTMENTS.find((x) => x.id === Number(id));
    return d ? d.name : 'Hotel-wide';
  };

  const REPORT_GROUPS = [
    { group: 'Overview', reports: [
      { id: 'occupancy', label: 'Occupancy Monitoring' },
      { id: 'rooms', label: 'Room Availability' },
      { id: 'historical', label: 'Historical Comparison' } ] },
    { group: 'Finance', reports: [
      { id: 'revenue', label: 'Revenue Performance', dept: true },
      { id: 'expenses', label: 'Expense Monitoring', dept: true },
      { id: 'financial', label: 'Financial Summary' },
      { id: 'adr', label: 'ADR Report' },
      { id: 'revpar', label: 'RevPAR Report' },
      { id: 'fnb', label: 'F&B Sales' } ] },
    { group: 'Analytics', reports: [
      { id: 'reservations', label: 'Reservation Analytics' },
      { id: 'departments', label: 'Department Performance' },
      { id: 'employees', label: 'Employee Performance', dept: true },
      { id: 'kpis', label: 'KPIs' },
      { id: 'satisfaction', label: 'Guest Satisfaction' },
      { id: 'complaints', label: 'Complaints & Incidents', dept: true } ] },
    { group: 'Operations', reports: [
      { id: 'inventory', label: 'Inventory & Stock', dept: true },
      { id: 'maintenance', label: 'Maintenance Performance', dept: true },
      { id: 'housekeeping', label: 'Housekeeping Performance' } ] },
  ];
  const REPORT_TYPES = REPORT_GROUPS.flatMap((g) => g.reports);
  const reportMeta = (id) => REPORT_TYPES.find((r) => r.id === id);
  const PERIODS = [
    { id: 'daily', label: 'Daily' }, { id: 'weekly', label: 'Weekly' },
    { id: 'monthly', label: 'Monthly' }, { id: 'yearly', label: 'Yearly' },
    { id: 'custom', label: 'Custom range' },
  ];
  const BUDGET_CATEGORIES = ['Salaries', 'Utilities', 'Supplies', 'Maintenance',
    'Marketing', 'Rooms', 'Food & Beverage', 'Events', 'Laundry', 'Other'];

  // ------------------------------------------------------------ formatting
  const pesoFmt = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 });
  const peso2Fmt = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const numFmt = new Intl.NumberFormat('en-PH');
  const peso = (v) => (v == null || isNaN(v) ? '—' : pesoFmt.format(Number(v)));
  const peso2 = (v) => (v == null || isNaN(v) ? '—' : peso2Fmt.format(Number(v)));
  const num = (v) => (v == null || isNaN(v) ? '—' : numFmt.format(Number(v)));
  const pct = (v) => (v == null || isNaN(v) ? '—' : Number(v).toFixed(1) + '%');
  const rating = (v) => (v == null || isNaN(v) ? '—' : Number(v).toFixed(2) + ' / 5');

  function fmtVal(value, format) {
    if (value == null) return '—';
    switch (format) {
      case 'money': return peso2(value);
      case 'pct': return pct(value);
      case 'rating': return rating(value);
      case 'num': return num(value);
      default:
        if (typeof value === 'number') return Number.isInteger(value) ? num(value) : value.toFixed(2);
        return String(value).replaceAll('_', ' ');
    }
  }

  const toISO = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const todayISO = () => toISO(new Date());
  function addDays(iso, n) {
    const d = new Date(iso + 'T00:00:00');
    d.setDate(d.getDate() + n);
    return toISO(d);
  }
  // Same rules as the PHP presets (config/bootstrap.php period_range()).
  function periodRange(preset, custom) {
    const today = todayISO();
    if (preset === 'custom' && custom && custom.from && custom.to) {
      return { from: custom.from, to: custom.to, period: 'custom' };
    }
    switch (preset) {
      case 'daily': return { from: today, to: today, period: 'daily' };
      case 'yearly': return { from: today.slice(0, 4) + '-01-01', to: today, period: 'yearly' };
      case 'monthly': return { from: today.slice(0, 7) + '-01', to: today, period: 'monthly' };
      case 'weekly':
      default: return { from: addDays(today, -6), to: today, period: 'weekly' };
    }
  }
  function monthRange(month) {
    const from = month + '-01';
    const d = new Date(from + 'T00:00:00');
    d.setMonth(d.getMonth() + 1); d.setDate(0);
    return { from, to: toISO(d) };
  }
  function fmtDate(iso) {
    if (!iso) return '—';
    const d = new Date(String(iso).slice(0, 10) + 'T00:00:00');
    return isNaN(d) ? String(iso) : d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  function fmtDateTime(iso) {
    if (!iso) return '—';
    const d = new Date(String(iso).replace(' ', 'T'));
    return isNaN(d) ? String(iso) : d.toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }
  const periodLabel = (r) => (r.from === r.to ? fmtDate(r.from) : fmtDate(r.from) + ' – ' + fmtDate(r.to));

  // ---------------------------------------------------------------- pills
  function statusTone(value) {
    const v = String(value || '').toLowerCase();
    if (['completed', 'resolved', 'checked_out', 'ok', 'active', 'read'].includes(v)) return 'green';
    if (['occupied', 'confirmed', 'checked_in', 'unread', 'info'].includes(v)) return 'pink';
    if (['pending', 'in_progress', 'warning', 'reserved', 'cleaning', 'low stock', 'medium'].includes(v)) return 'amber';
    if (['critical', 'urgent', 'high', 'cancelled', 'no_show', 'out of stock', 'maintenance', 'overdue'].includes(v)) return 'red';
    return 'gray';
  }
  const pill = (value) => '<span class="pill tone-' + statusTone(value) + '">' + esc(String(value).replaceAll('_', ' ')) + '</span>';
  const progressBar = (value) => {
    const v = Math.max(0, Math.min(100, Number(value) || 0));
    return '<div class="progress"><i class="' + (Number(value) > 100 ? 'over' : '') + '" style="width:' + v + '%"></i></div>';
  };

  // ------------------------------------------------------------------ api
  // The PHP API sits in api/ beside the pages, so a relative path works
  // from any subfolder (e.g. http://localhost/management/).
  const API_BASE = 'api';
  async function req(path, opts) {
    const res = await fetch(API_BASE + path, Object.assign({
      headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
    }, opts || {}));
    const data = await res.json().catch(() => ({}));
    // Every endpoint answers with { success: true, ... }. Anything else —
    // an HTTP error, a PHP error page, or a static server returning the
    // .php source — counts as "API unreachable" and triggers demo mode.
    if (!res.ok || data.success !== true) {
      const err = new Error(data.error || 'Request failed (' + res.status + ')');
      err.status = res.status;
      throw err;
    }
    return data;
  }
  const qs = (params) => {
    const clean = {};
    Object.entries(params || {}).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== '') clean[k] = v;
    });
    const s = new URLSearchParams(clean).toString();
    return s ? '?' + s : '';
  };
  const api = {
    dashboard: (p) => req('/dashboard.php' + qs(p)),
    report: (p) => req('/reports.php' + qs(p)),
    logReport: (d) => req('/reports.php', { method: 'POST', body: JSON.stringify(d) }),
    budgets: (month) => req('/budgets.php' + qs({ kind: 'budgets', month })),
    targets: (p) => req('/budgets.php' + qs(Object.assign({ kind: 'targets' }, p))),
    saveBudget: (d) => req('/budgets.php', { method: d.id ? 'PUT' : 'POST', body: JSON.stringify(Object.assign({ kind: 'budget' }, d)) }),
    deleteBudget: (id) => req('/budgets.php' + qs({ kind: 'budget', id }), { method: 'DELETE' }),
    saveTarget: (d) => req('/budgets.php', { method: d.id ? 'PUT' : 'POST', body: JSON.stringify(Object.assign({ kind: 'target' }, d)) }),
    deleteTarget: (id) => req('/budgets.php' + qs({ kind: 'target', id }), { method: 'DELETE' }),
    decisions: (p) => req('/decisions.php' + qs(p)),
    saveDecision: (d) => req('/decisions.php', { method: d.id ? 'PUT' : 'POST', body: JSON.stringify(d) }),
    deleteDecision: (id) => req('/decisions.php' + qs({ id }), { method: 'DELETE' }),
    alerts: (p) => req('/alerts.php' + qs(p)),
    createAlert: (d) => req('/alerts.php', { method: 'POST', body: JSON.stringify(d) }),
    setAlertStatus: (id, status) => req('/alerts.php', { method: 'PUT', body: JSON.stringify({ id, status }) }),
    deleteAlert: (id) => req('/alerts.php' + qs({ id }), { method: 'DELETE' }),
  };

  // Data layer: PHP API first, demo data (assets/js/mock.js) when the API
  // is unreachable, so the module can be previewed without XAMPP running.
  let usingMock = false;
  async function withFallback(fn, fallback) {
    try { return await fn(); } catch (e) {
      if (!usingMock) { usingMock = true; console.warn('[management] API unreachable, using demo data:', e.message); }
      return fallback();
    }
  }
  const store = {
    getDashboard: (p) => withFallback(() => api.dashboard(p), () => window.Mock.mockDashboard(p)),
    getReport: (p) => withFallback(() => api.report(p), () => window.Mock.mockReport(p)),
    logReport: (d) => withFallback(() => api.logReport(d), async () => ({ success: true })),
    getBudgets: (m) => withFallback(() => api.budgets(m), () => window.Mock.mockBudgetsList(m)),
    getTargets: (p) => withFallback(() => api.targets(p), () => window.Mock.mockTargetsList(p)),
    saveBudget: (d) => withFallback(() => api.saveBudget(d), () => window.Mock.mockSaveBudget(d)),
    deleteBudget: (id) => withFallback(() => api.deleteBudget(id), () => window.Mock.mockDeleteBudget(id)),
    saveTarget: (d) => withFallback(() => api.saveTarget(d), () => window.Mock.mockSaveTarget(d)),
    deleteTarget: (id) => withFallback(() => api.deleteTarget(id), () => window.Mock.mockDeleteTarget(id)),
    getDecisions: (p) => withFallback(() => api.decisions(p), () => window.Mock.mockDecisionsList(p)),
    saveDecision: (d) => withFallback(() => api.saveDecision(d), () => window.Mock.mockSaveDecision(d)),
    deleteDecision: (id) => withFallback(() => api.deleteDecision(id), () => window.Mock.mockDeleteDecision(id)),
    getAlerts: (p) => withFallback(() => api.alerts(p), () => window.Mock.mockAlertsList(p)),
    createAlert: (d) => withFallback(() => api.createAlert(d), () => window.Mock.mockCreateAlert(d)),
    setAlertStatus: (id, s) => withFallback(() => api.setAlertStatus(id, s), () => window.Mock.mockSetAlertStatus(id, s)),
    deleteAlert: (id) => withFallback(() => api.deleteAlert(id), () => window.Mock.mockDeleteAlert(id)),
  };

  // --------------------------------------------------------------- charts
  const PALETTE = ['#e483a8', '#c75b87', '#d9a441', '#9dbe9c', '#b39ddb', '#f2a65a', '#7fb3d5', '#e8b4c4'];
  const chartRegistry = {};
  function renderChart(canvasId, chart) {
    const el = document.getElementById(canvasId);
    if (!el || !chart || typeof Chart === 'undefined') return;
    if (chartRegistry[canvasId]) chartRegistry[canvasId].destroy();
    const isDoughnut = chart.kind === 'doughnut';
    const datasets = chart.series.map((s, i) => isDoughnut
      ? { label: s.label, data: s.data, backgroundColor: PALETTE, borderColor: '#fff', borderWidth: 2 }
      : {
          label: s.label, data: s.data,
          borderColor: PALETTE[i % PALETTE.length],
          backgroundColor: chart.kind === 'line' ? PALETTE[i % PALETTE.length] + '33' : PALETTE[i % PALETTE.length],
          fill: chart.kind === 'line', tension: 0.35, borderWidth: 2, pointRadius: 2.5,
          borderRadius: chart.kind === 'bar' ? 6 : 0,
        });
    chartRegistry[canvasId] = new Chart(el, {
      type: chart.kind,
      data: { labels: chart.labels, datasets },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: {
            display: isDoughnut || chart.series.length > 1,
            position: isDoughnut ? 'right' : 'top',
            labels: { boxWidth: 10, font: { size: 11 }, color: '#47302a' },
          },
          tooltip: { intersect: false, mode: isDoughnut ? 'nearest' : 'index' },
        },
        scales: isDoughnut ? {} : {
          x: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#9c7b72', maxTicksLimit: 12 } },
          y: { grid: { color: '#f1e3d0' }, ticks: { font: { size: 10 }, color: '#9c7b72' }, beginAtZero: true },
        },
      },
    });
  }

  // -------------------------------------------------------------- exports
  const cellText = (row, col) => fmtVal(row[col.key], col.format || (['current', 'previous', 'change'].includes(col.key) ? row.format : undefined));
  function exportCSV(title, columns, rows) {
    const escCsv = (v) => '"' + String(v == null ? '' : v).replaceAll('"', '""') + '"';
    const lines = [
      columns.map((c) => escCsv(c.label)).join(','),
      ...rows.map((r) => columns.map((c) => escCsv(cellText(r, c))).join(',')),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = title.replaceAll(/\s+/g, '-').toLowerCase() + '.csv';
    a.click();
    URL.revokeObjectURL(url);
  }
  function exportPDF(title, subtitle, columns, rows) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: columns.length > 5 ? 'landscape' : 'portrait' });
    doc.setFontSize(15);
    doc.text(title, 14, 16);
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(subtitle || '', 14, 23);
    doc.text('Hotel Management System — Management Department', 14, 29);
    doc.autoTable({
      startY: 34,
      head: [columns.map((c) => c.label)],
      body: rows.map((r) => columns.map((c) => cellText(r, c))),
      styles: { fontSize: 8.5 },
      headStyles: { fillColor: [199, 91, 135] },
      alternateRowStyles: { fillColor: [250, 244, 234] },
    });
    doc.save(title.replaceAll(/\s+/g, '-').toLowerCase() + '.pdf');
  }

  // -------------------------------------------------------------- sidebar
  const NAV = [
    { section: 'MAIN' },
    { id: 'dashboard', label: 'Executive Dashboard', icon: 'dashboard', href: 'index.html' },
    { id: 'reports', label: 'Reports', icon: 'reports', href: 'reports.html' },
    { section: 'MANAGEMENT' },
    { id: 'budgets', label: 'Budgets & Targets', icon: 'wallet', href: 'budgets.html' },
    { id: 'decisions', label: 'Decision Tracking', icon: 'decisions', href: 'decisions.html' },
    { id: 'alerts', label: 'Operational Alerts', icon: 'bell', href: 'alerts.html', badge: true },
  ];
  function renderSidebar() {
    const mount = document.getElementById('sidebar');
    if (!mount) return;
    const page = document.body.dataset.page || 'dashboard';
    let navHtml = '';
    for (const item of NAV) {
      if (item.section) { navHtml += '<div class="nav-section">' + item.section + '</div>'; continue; }
      navHtml += '<a class="nav-item' + (page === item.id ? ' active' : '') + '" href="' + item.href + '">'
        + icon(item.icon, 18) + '<span class="label">' + item.label + '</span>'
        + (item.badge ? '<span class="nav-badge hidden" id="nav-alert-badge">0</span>' : '')
        + '</a>';
    }
    mount.innerHTML =
      '<div class="scrim" id="scrim"></div>'
      + '<aside class="sidebar" id="sidebar-panel">'
      +   '<div class="brand"><img src="assets/img/logo.png" alt="Hotel Management System logo">'
      +   '<div><div class="brand-name">Management Dept.</div>'
      +   '<div class="brand-sub">HOTEL MANAGEMENT SYSTEM</div></div></div>'
      +   '<nav class="nav nice-scroll">' + navHtml + '</nav>'
      +   '<div class="sidebar-spacer"></div>'
      +   '<div class="sys-status"><div class="row"><span class="dot-live"></span>All systems online</div>'
      +   '<div class="sub">Shared hotel database connected</div></div>'
      +   '<div class="sidebar-foot"><div class="foot-card">'
      +   '<div class="foot-avatar">' + icon('users', 18) + '</div>'
      +   '<div style="min-width:0"><div class="foot-name">Management Department</div>'
      +   '<div class="foot-role">General Manager · Dept. Heads</div></div>'
      +   '</div></div>'
      + '</aside>';

    const panel = document.getElementById('sidebar-panel');
    const scrim = document.getElementById('scrim');
    const close = () => { panel.classList.remove('open'); scrim.classList.remove('show'); };
    scrim.addEventListener('click', close);
    const menuBtn = document.getElementById('btn-menu');
    if (menuBtn) menuBtn.addEventListener('click', () => {
      panel.classList.add('open'); scrim.classList.add('show');
    });
    panel.querySelectorAll('.nav-item').forEach((a) => a.addEventListener('click', close));

    // Unread-alert badge (sidebar item and topbar bell share the count)
    store.getAlerts({ status: 'unread' }).then((r) => {
      const n = r.unread != null ? r.unread : (r.data || []).length;
      if (n > 0) {
        ['nav-alert-badge', 'topbar-alert-badge'].forEach((id) => {
          const badge = document.getElementById(id);
          if (badge) { badge.textContent = n; badge.classList.remove('hidden'); }
        });
      }
    }).catch(() => {});
  }

  // -------------------------------------------------------------- topbar
  // Desktop bar above every page: sidebar toggle on the left, live date
  // and time plus a notification bell (unread-alert count) on the right.
  // On small screens the bar hides and the per-page mobile topbar takes
  // over, so the toggle button here only needs the desktop collapse.
  const SIDEBAR_KEY = 'mgmt-sidebar-collapsed';
  function initTopbar() {
    const wrap = document.querySelector('.main-wrap');
    const main = wrap && wrap.querySelector('main');
    if (!wrap || !main) return;
    const bar = document.createElement('div');
    bar.className = 'topbar';
    bar.innerHTML =
      '<button class="icon-btn" id="btn-sidebar-toggle" aria-label="Toggle sidebar" title="Toggle sidebar">'
      + icon('menu', 20) + '</button>'
      + '<span class="topbar-spacer"></span>'
      + '<div class="topbar-datetime"><div class="topbar-date" id="topbar-date"></div>'
      + '<div class="topbar-time" id="topbar-time"></div></div>'
      + '<a class="topbar-bell" href="alerts.html" aria-label="Operational alerts" title="Operational alerts">'
      + icon('bell', 20) + '<span class="topbar-bell-badge hidden" id="topbar-alert-badge">0</span></a>';
    wrap.insertBefore(bar, main);

    if (window.localStorage && localStorage.getItem(SIDEBAR_KEY) === '1') {
      document.body.classList.add('sidebar-collapsed');
    }
    document.getElementById('btn-sidebar-toggle').addEventListener('click', () => {
      const collapsed = document.body.classList.toggle('sidebar-collapsed');
      if (window.localStorage) localStorage.setItem(SIDEBAR_KEY, collapsed ? '1' : '0');
    });

    const tick = () => {
      const now = new Date();
      const dateEl = document.getElementById('topbar-date');
      const timeEl = document.getElementById('topbar-time');
      if (dateEl) dateEl.textContent = now.toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
      if (timeEl) timeEl.textContent = now.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });
    };
    tick();
    setInterval(tick, 30000);
  }

  // --------------------------------------------------------- filter bar
  // Wires the period presets / custom dates / department select / export
  // buttons found in the page's .filter-bar. Calls handlers.onChange(range,
  // department) whenever a filter changes, and once at startup.
  function initFilterBar(handlers) {
    const bar = document.querySelector('.filter-bar');
    if (!bar) { handlers.onChange(periodRange('weekly'), null); return null; }
    const state = {
      preset: 'weekly',
      custom: { from: addDays(todayISO(), -29), to: todayISO() },
      department: null,
    };
    const fromInput = bar.querySelector('#f-from');
    const toInput = bar.querySelector('#f-to');
    if (fromInput) fromInput.value = state.custom.from;
    if (toInput) toInput.value = state.custom.to;
    const dateRange = bar.querySelector('.date-range');
    const deptSelect = bar.querySelector('#f-dept');
    if (deptSelect) {
      deptSelect.innerHTML = '<option value="">All departments</option>'
        + DEPARTMENTS.map((d) => '<option value="' + d.id + '">' + d.name + '</option>').join('');
      deptSelect.addEventListener('change', () => {
        state.department = deptSelect.value ? Number(deptSelect.value) : null;
        emit();
      });
    }
    function emit() { handlers.onChange(periodRange(state.preset, state.custom), state.department); }
    bar.querySelectorAll('[data-period]').forEach((btn) => {
      btn.addEventListener('click', () => {
        bar.querySelectorAll('[data-period]').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        state.preset = btn.dataset.period;
        if (dateRange) dateRange.classList.toggle('show', state.preset === 'custom');
        emit();
      });
    });
    if (fromInput) fromInput.addEventListener('change', () => { state.custom.from = fromInput.value; emit(); });
    if (toInput) toInput.addEventListener('change', () => { state.custom.to = toInput.value; emit(); });
    const csvBtn = bar.querySelector('#btn-export-csv');
    const pdfBtn = bar.querySelector('#btn-export-pdf');
    if (csvBtn && handlers.onExportCSV) csvBtn.addEventListener('click', handlers.onExportCSV);
    if (pdfBtn && handlers.onExportPDF) pdfBtn.addEventListener('click', handlers.onExportPDF);
    emit();
    return state;
  }

  // --------------------------------------------------------------- modals
  function openModal(id) { document.getElementById(id)?.classList.remove('hidden'); }
  function closeModal(id) { document.getElementById(id)?.classList.add('hidden'); }
  function initModals() {
    document.querySelectorAll('.modal-backdrop').forEach((bd) => {
      bd.addEventListener('click', (e) => { if (e.target === bd || e.target.classList.contains('scrim2')) bd.classList.add('hidden'); });
      bd.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => bd.classList.add('hidden')));
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') document.querySelectorAll('.modal-backdrop').forEach((bd) => bd.classList.add('hidden'));
    });
    // hydrate static icon placeholders
    document.querySelectorAll('[data-icon]').forEach((el) => {
      el.innerHTML = icon(el.dataset.icon, Number(el.dataset.iconSize || 18));
      el.style.display = 'inline-flex';
    });
  }

  // Promise-based delete confirmation (builds its own modal).
  function confirmDialog(title, body) {
    return new Promise((resolve) => {
      const bd = document.createElement('div');
      bd.className = 'modal-backdrop';
      bd.innerHTML = '<div class="scrim2"></div><div class="modal">'
        + '<div class="modal-head"><h2>' + esc(title) + '</h2></div>'
        + '<div class="modal-body"><p style="font-size:14px;color:var(--muted);margin:0">' + esc(body) + '</p>'
        + '<p style="font-size:14px;color:var(--muted);margin:4px 0 0">This cannot be undone.</p>'
        + '<div class="modal-actions" style="margin-top:20px">'
        + '<button class="btn" data-cancel>Cancel</button>'
        + '<button class="btn btn-danger" data-ok>Delete</button>'
        + '</div></div></div>';
      document.body.appendChild(bd);
      const done = (v) => { bd.remove(); resolve(v); };
      bd.querySelector('[data-cancel]').addEventListener('click', () => done(false));
      bd.querySelector('[data-ok]').addEventListener('click', () => done(true));
      bd.addEventListener('click', (e) => {
        if (e.target === bd || e.target.classList.contains('scrim2')) done(false);
      });
    });
  }

  window.HMS = {
    icon, esc, DEPARTMENTS, departmentName, REPORT_GROUPS, REPORT_TYPES, reportMeta,
    PERIODS, BUDGET_CATEGORIES, peso, peso2, num, pct, rating, fmtVal, toISO, todayISO,
    addDays, periodRange, monthRange, fmtDate, fmtDateTime, periodLabel,
    statusTone, pill, progressBar, api, store, isDemo: () => usingMock,
    PALETTE, renderChart, exportCSV, exportPDF, renderSidebar, initFilterBar,
    openModal, closeModal, initModals, confirmDialog,
  };

  document.addEventListener('DOMContentLoaded', () => {
    renderSidebar();
    initTopbar();
    initModals();
  });
})();
