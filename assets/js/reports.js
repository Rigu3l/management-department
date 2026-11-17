/* assets/js/reports.js — Reports page (reports.html). One hub for all
   report types: select a type, narrow it with the period presets, a
   custom date range and the department filter, then export CSV/PDF. */
(function () {
  'use strict';
  const H = window.HMS;
  const $ = (id) => document.getElementById(id);
  const PILL_KEYS = new Set(['status', 'severity', 'priority']);
  const MONEY_ROW_KEYS = new Set(['current', 'previous', 'change']);

  let type = 'occupancy';
  let range = null;
  let department = null;
  let lastData = null;

  function renderMenu() {
    $('report-menu').innerHTML = H.REPORT_GROUPS.map((g) =>
      '<div class="menu-group-label">' + g.group.toUpperCase() + '</div>'
      + g.reports.map((r) =>
        '<button data-type="' + r.id + '"' + (r.id === type ? ' class="active"' : '') + '>' + r.label + '</button>'
      ).join('')
    ).join('');
    $('report-menu').querySelectorAll('[data-type]').forEach((b) => {
      b.addEventListener('click', () => {
        type = b.dataset.type;
        renderMenu();
        syncDeptVisibility();
        load();
      });
    });
  }

  function syncDeptVisibility() {
    const meta = H.reportMeta(type);
    $('dept-wrap').classList.toggle('hidden', !(meta && meta.dept));
  }

  async function load() {
    if (!range) return;
    const meta = H.reportMeta(type);
    $('report-error').innerHTML = '';
    try {
      const data = await H.store.getReport({
        type, from: range.from, to: range.to,
        department: meta && meta.dept ? department : null,
      });
      lastData = data;
      render(data);
    } catch (e) {
      $('report-loading').classList.add('hidden');
      $('report-error').innerHTML = '<div class="error-box">Could not load this report: ' + H.esc(e.message) + '</div>';
    }
  }

  function cellHtml(row, col) {
    const raw = row[col.key];
    if (PILL_KEYS.has(col.key) && raw != null) return H.pill(raw);
    const format = col.format || (MONEY_ROW_KEYS.has(col.key) ? row.format : undefined);
    const text = H.fmtVal(raw, format);
    if (col.key === 'change_pct' && raw != null) {
      return '<span class="' + (Number(raw) >= 0 ? 'change-up' : 'change-down') + '">' + text + '</span>';
    }
    return H.esc(text);
  }

  function render(data) {
    $('report-loading').classList.add('hidden');
    $('report-body').classList.remove('hidden');
    $('report-title').textContent = data.title;
    $('report-period').textContent = H.periodLabel(data.period);
    $('report-summary').innerHTML = (data.summary || []).map((s) =>
      '<div class="chip"><span class="chip-label">' + H.esc(s.label) + '</span>'
      + '<span class="chip-value">' + H.esc(H.fmtVal(s.value, s.format)) + '</span></div>'
    ).join('');

    if (data.chart) {
      $('chart-wrap').classList.remove('hidden');
      H.renderChart('chart-report', data.chart);
    } else {
      $('chart-wrap').classList.add('hidden');
    }

    if (!data.rows || !data.rows.length) {
      $('report-table').innerHTML = '<div class="loading">No records for this period.</div>';
    } else {
      $('report-table').innerHTML = '<table class="tbl"><thead><tr>'
        + data.columns.map((c) => '<th>' + H.esc(c.label) + '</th>').join('')
        + '</tr></thead><tbody>'
        + data.rows.map((r) => '<tr>' + data.columns.map((c) => '<td>' + cellHtml(r, c) + '</td>').join('') + '</tr>').join('')
        + '</tbody></table>';
    }

    // Extras: guest comments (satisfaction) / by-source (reservations)
    const comments = data.extra && data.extra.comments;
    if (comments && comments.length) {
      $('extra-comments').classList.remove('hidden');
      $('comments-list').innerHTML = comments.map((cm) =>
        '<div class="comment-row"><span class="stars">'
        + [0, 1, 2, 3, 4].map((s) => '<span class="' + (s < cm.rating ? '' : 'off') + '">' + H.icon('star', 13) + '</span>').join('')
        + '</span><div style="min-width:0"><span class="who">' + H.esc(cm.guest_name) + '</span> '
        + '<span class="meta">· ' + H.esc(cm.category) + ' · ' + H.fmtDate(cm.day) + '</span>'
        + '<div>' + H.esc(cm.comment) + '</div></div></div>'
      ).join('');
    } else {
      $('extra-comments').classList.add('hidden');
    }
    const bySource = data.extra && data.extra.by_source;
    if (bySource && bySource.length) {
      $('extra-source').classList.remove('hidden');
      $('source-list').innerHTML = bySource.map((s) =>
        '<div class="chip"><span class="chip-label">' + H.esc(s.source) + '</span>'
        + '<span class="chip-value">' + s.c + '</span></div>'
      ).join('');
    } else {
      $('extra-source').classList.add('hidden');
    }
  }

  function doExport(kind) {
    if (!lastData) return;
    const meta = H.reportMeta(type);
    const subtitle = H.periodLabel(range) + (meta && meta.dept && department ? ' · filtered by department' : '');
    if (kind === 'csv') H.exportCSV(lastData.title, lastData.columns, lastData.rows);
    else H.exportPDF(lastData.title, subtitle, lastData.columns, lastData.rows);
    H.store.logReport({
      title: lastData.title, type, generated_by: 'Management Department',
      parameters: { from: range.from, to: range.to, department, export: kind },
    }).catch(() => {});
  }

  function initExportMenu() {
    const btn = $('btn-export');
    const list = $('export-menu-list');
    if (!btn || !list) return;
    const close = () => { list.classList.add('hidden'); btn.setAttribute('aria-expanded', 'false'); };
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const nowHidden = list.classList.toggle('hidden');
      btn.setAttribute('aria-expanded', nowHidden ? 'false' : 'true');
    });
    list.querySelectorAll('[data-export]').forEach((item) =>
      item.addEventListener('click', () => { doExport(item.dataset.export); close(); }));
    document.addEventListener('click', (e) => {
      if (!list.classList.contains('hidden') && !e.target.closest('.export-menu')) close();
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  }

  document.addEventListener('DOMContentLoaded', () => {
    renderMenu();
    syncDeptVisibility();
    initExportMenu();
    H.initFilterBar({
      onChange: (r, dept) => { range = r; department = dept; load(); },
    });
  });
})();
