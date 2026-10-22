/* assets/js/decisions.js — Decision Tracking page (decisions.html).
   Record management decisions with a responsible person and a
   follow-up deadline; monitor status to completion. */
(function () {
  'use strict';
  const H = window.HMS;
  const $ = (id) => document.getElementById(id);
  const STATUSES = ['pending', 'in_progress', 'completed'];
  let editing = null;
  let debounce = null;

  async function load() {
    $('dec-error').innerHTML = '';
    try {
      const r = await H.store.getDecisions({
        q: $('d-q').value || undefined,
        status: $('d-status').value || undefined,
        department: $('d-dept').value || undefined,
      });
      renderSummary(r.summary);
      renderRows(r.data);
    } catch (e) {
      $('dec-error').innerHTML = '<div class="error-box">' + H.esc(e.message) + '</div>';
    }
  }

  function renderSummary(s) {
    if (!s) { $('dec-summary').innerHTML = ''; return; }
    const items = [
      ['Total decisions', s.total, 'gray'],
      ['Pending', s.pending, 'amber'],
      ['In progress', s.in_progress, 'amber'],
      ['Completed', s.completed, 'green'],
      ['Overdue', s.overdue, 'red'],
    ];
    $('dec-summary').innerHTML = items.map(([label, value, tone]) =>
      '<div class="chip"><span class="chip-label" style="margin:0">' + label + '</span>'
      + '<span class="pill tone-' + tone + '">' + value + '</span></div>'
    ).join('');
  }

  function renderRows(rows) {
    $('dec-rows').innerHTML = rows.length ? rows.map((r) =>
      '<tr><td style="max-width:420px"><div style="font-weight:500;color:var(--ink)">' + H.esc(r.title) + '</div>'
      + (r.description ? '<div class="cell-sub" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">' + H.esc(r.description) + '</div>' : '')
      + (r.decided_by ? '<div class="cell-sub">Decided by ' + H.esc(r.decided_by) + '</div>' : '')
      + '</td>'
      + '<td style="white-space:nowrap">' + H.esc(r.assigned_to || '—') + '</td>'
      + '<td style="white-space:nowrap">' + H.esc(r.department || 'Hotel-wide') + '</td>'
      + '<td style="white-space:nowrap"><span' + (r.overdue ? ' style="color:var(--red);font-weight:600"' : '') + '>'
      + (r.deadline ? H.fmtDate(r.deadline) : '—') + '</span>'
      + (r.overdue ? ' <span class="pill tone-red">overdue</span>' : '')
      + '</td>'
      + '<td><select class="status-select" data-status-for="' + r.id + '" aria-label="Change status">'
      + STATUSES.map((s) => '<option value="' + s + '"' + (r.status === s ? ' selected' : '') + '>' + s.replace('_', ' ') + '</option>').join('')
      + '</select></td>'
      + '<td><div class="row-actions">'
      + '<button data-edit="' + r.id + '" title="Edit">' + H.icon('edit', 15) + '</button>'
      + '<button class="danger" data-del="' + r.id + '" title="Delete">' + H.icon('trash', 15) + '</button>'
      + '</div></td></tr>'
    ).join('') : '<tr><td colspan="6" class="empty-cell">No decisions match these filters.</td></tr>';

    $('dec-rows').querySelectorAll('[data-status-for]').forEach((sel) =>
      sel.addEventListener('change', async () => {
        const row = rows.find((r) => r.id === Number(sel.dataset.statusFor));
        await H.store.saveDecision({ ...row, status: sel.value });
        load();
      }));
    $('dec-rows').querySelectorAll('[data-edit]').forEach((b) =>
      b.addEventListener('click', () => openForm(rows.find((r) => r.id === Number(b.dataset.edit)))));
    $('dec-rows').querySelectorAll('[data-del]').forEach((b) =>
      b.addEventListener('click', async () => {
        const row = rows.find((r) => r.id === Number(b.dataset.del));
        if (await H.confirmDialog('Delete this decision?', row.title)) {
          await H.store.deleteDecision(row.id);
          load();
        }
      }));
  }

  function openForm(row) {
    editing = row || {};
    $('df-title').textContent = row ? 'Edit decision' : 'Record decision';
    $('df-error').textContent = '';
    $('df-name').value = row ? row.title : '';
    $('df-desc').value = row ? (row.description || '') : '';
    $('df-by').value = row ? (row.decided_by || '') : '';
    $('df-to').value = row ? (row.assigned_to || '') : '';
    $('df-dept').value = row && row.department_id != null ? String(row.department_id) : '';
    $('df-deadline').value = row && row.deadline ? String(row.deadline).slice(0, 10) : '';
    $('df-status').value = row ? row.status : 'pending';
    H.openModal('modal-decision');
  }

  async function save() {
    const btn = $('df-save');
    btn.disabled = true;
    $('df-error').textContent = '';
    try {
      await H.store.saveDecision({
        ...(editing && editing.id ? { id: editing.id } : {}),
        title: $('df-name').value,
        description: $('df-desc').value || null,
        decided_by: $('df-by').value || null,
        assigned_to: $('df-to').value || null,
        department_id: $('df-dept').value ? Number($('df-dept').value) : null,
        deadline: $('df-deadline').value || null,
        status: $('df-status').value,
      });
      H.closeModal('modal-decision');
      load();
    } catch (e) {
      $('df-error').textContent = e.message;
    }
    btn.disabled = false;
  }

  document.addEventListener('DOMContentLoaded', () => {
    $('d-dept').innerHTML = '<option value="">All departments</option>'
      + H.DEPARTMENTS.map((d) => '<option value="' + d.id + '">' + d.name + '</option>').join('');
    $('df-dept').innerHTML = '<option value="">Hotel-wide</option>'
      + H.DEPARTMENTS.map((d) => '<option value="' + d.id + '">' + d.name + '</option>').join('');
    $('d-q').addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(load, 250);
    });
    $('d-status').addEventListener('change', load);
    $('d-dept').addEventListener('change', load);
    $('btn-add-decision').addEventListener('click', () => openForm(null));
    $('df-save').addEventListener('click', save);
    load();
  });
})();
