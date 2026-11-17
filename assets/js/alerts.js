/* assets/js/alerts.js — Operational Alerts page (alerts.html).
   Alerts and notifications from across the hotel (occupancy, inventory,
   maintenance, housekeeping, finance, guest feedback), plus manual
   announcements from Management. */
(function () {
  'use strict';
  const H = window.HMS;
  const $ = (id) => document.getElementById(id);
  let statusFilter = '';
  let severityFilter = '';

  async function load() {
    $('alerts-error').innerHTML = '';
    try {
      const r = await H.store.getAlerts({
        status: statusFilter || undefined,
        severity: severityFilter || undefined,
      });
      $('alerts-subtitle').textContent = (r.unread != null ? r.unread : 0)
        + ' unread · alerts raised by hotel operations and by the management team.';
      render(r.data);
    } catch (e) {
      $('alerts-error').innerHTML = '<div class="error-box">' + H.esc(e.message) + '</div>';
    }
  }

  function render(rows) {
    if (!rows.length) {
      $('alert-list').innerHTML = '<div class="card" style="text-align:center;color:var(--muted);font-size:14px;padding:48px 20px">No alerts match these filters.</div>';
      return;
    }
    $('alert-list').innerHTML = rows.map((a) =>
      '<div class="card alert-card' + (a.status === 'resolved' ? ' resolved' : '') + '">'
      + '<span class="sev-icon sev-' + H.esc(a.severity) + '">' + H.icon('bell', 18) + '</span>'
      + '<div class="alert-body"><div class="alert-title">' + H.esc(a.title)
      + (a.status === 'unread' ? '<span class="unread-dot"></span>' : '')
      + '<span class="pill tone-' + (a.severity === 'critical' ? 'red' : a.severity === 'warning' ? 'amber' : 'pink') + '">' + H.esc(a.severity) + '</span>'
      + '<span class="pill">' + H.esc(a.status) + '</span></div>'
      + (a.message ? '<p class="alert-msg">' + H.esc(a.message) + '</p>' : '')
      + '<div class="alert-meta">' + H.esc(a.source) + ' · ' + H.fmtDateTime(a.created_at) + '</div></div>'
      + '<div class="alert-actions">'
      + (a.status === 'unread'
          ? '<button class="btn btn-sm" data-read="' + a.id + '">' + H.icon('eye', 13) + ' Mark read</button>' : '')
      + (a.status !== 'resolved'
          ? '<button class="btn btn-sm" data-resolve="' + a.id + '" style="background:var(--pill);color:var(--accent-dark);border-color:transparent">' + H.icon('check', 13) + ' Resolve</button>' : '')
      + '<button class="icon-btn" data-del="' + a.id + '" title="Delete" style="margin:0;color:var(--muted)">' + H.icon('trash', 15) + '</button>'
      + '</div></div>'
    ).join('');

    $('alert-list').querySelectorAll('[data-read]').forEach((b) =>
      b.addEventListener('click', async () => { await H.store.setAlertStatus(Number(b.dataset.read), 'read'); load(); }));
    $('alert-list').querySelectorAll('[data-resolve]').forEach((b) =>
      b.addEventListener('click', async () => { await H.store.setAlertStatus(Number(b.dataset.resolve), 'resolved'); load(); }));
    $('alert-list').querySelectorAll('[data-del]').forEach((b) =>
      b.addEventListener('click', async () => {
        const a = rows.find((x) => x.id === Number(b.dataset.del));
        if (await H.confirmDialog('Delete this alert?', a.title)) {
          await H.store.deleteAlert(a.id);
          load();
        }
      }));
  }

  async function save() {
    const btn = $('af-save');
    btn.disabled = true;
    $('af-error').textContent = '';
    try {
      await H.store.createAlert({
        title: $('af-title').value,
        message: $('af-message').value || null,
        severity: $('af-severity').value,
        source: $('af-source').value,
      });
      H.closeModal('modal-alert');
      $('af-title').value = '';
      $('af-message').value = '';
      load();
    } catch (e) {
      $('af-error').textContent = e.message;
    }
    btn.disabled = false;
  }

  document.addEventListener('DOMContentLoaded', () => {
    $('status-group').querySelectorAll('[data-status]').forEach((b) =>
      b.addEventListener('click', () => {
        $('status-group').querySelectorAll('[data-status]').forEach((x) => x.classList.remove('active'));
        b.classList.add('active');
        statusFilter = b.dataset.status;
        load();
      }));
    $('a-severity').addEventListener('change', () => { severityFilter = $('a-severity').value; load(); });
    $('btn-add-alert').addEventListener('click', () => H.openModal('modal-alert'));
    $('af-save').addEventListener('click', save);
    load();
  });
})();
