/* assets/js/budgets.js — Budgets & Targets page (budgets.html).
   Budgets tab: monthly budgets per department/category vs actual
   spending. Targets tab: KPI targets vs measured actuals. Both CRUD. */
(function () {
  'use strict';
  const H = window.HMS;
  const $ = (id) => document.getElementById(id);
  const thisMonth = () => H.todayISO().slice(0, 7);

  let editingBudget = null;
  let editingTarget = null;
  let targetRange = null;

  function deptOptions(el, includeHotelWide) {
    el.innerHTML = (includeHotelWide ? '<option value="">Hotel-wide</option>' : '')
      + H.DEPARTMENTS.map((d) => '<option value="' + d.id + '">' + d.name + '</option>').join('');
  }

  // ------------------------------------------------------------ budgets
  async function loadBudgets() {
    $('bud-error').innerHTML = '';
    try {
      const r = await H.store.getBudgets($('bud-month').value || thisMonth());
      renderBudgets(r.data);
    } catch (e) {
      $('bud-error').innerHTML = '<div class="error-box">' + H.esc(e.message) + '</div>';
    }
  }

  function renderBudgets(rows) {
    const totalBudget = rows.reduce((a, r) => a + Number(r.amount), 0);
    const totalSpent = rows.reduce((a, r) => a + Number(r.spent), 0);
    const remaining = totalBudget - totalSpent;
    $('bud-totals').innerHTML = 'Budget <strong style="color:var(--ink)">' + H.peso(totalBudget) + '</strong>'
      + ' · Spent <strong style="color:var(--ink)">' + H.peso(totalSpent) + '</strong>'
      + ' · Remaining <strong style="color:' + (remaining < 0 ? 'var(--red)' : 'var(--green)') + '">' + H.peso(remaining) + '</strong>';

    $('bud-rows').innerHTML = rows.length ? rows.map((r) =>
      '<tr><td>' + H.esc(r.department || 'Hotel-wide') + '</td>'
      + '<td>' + H.esc(r.category) + '</td>'
      + '<td>' + H.peso2(r.amount) + '</td>'
      + '<td>' + H.peso2(r.spent) + '</td>'
      + '<td style="font-weight:500;color:' + (Number(r.remaining) < 0 ? 'var(--red)' : 'var(--green)') + '">' + H.peso2(r.remaining) + '</td>'
      + '<td><div class="progress-cell">' + H.progressBar(r.used_pct)
      + '<span class="pct-text">' + Number(r.used_pct).toFixed(1) + '%</span></div></td>'
      + '<td><div class="row-actions">'
      + '<button data-edit-budget="' + r.id + '" title="Edit">' + H.icon('edit', 15) + '</button>'
      + '<button class="danger" data-del-budget="' + r.id + '" title="Delete">' + H.icon('trash', 15) + '</button>'
      + '</div></td></tr>'
    ).join('') : '<tr><td colspan="7" class="empty-cell">No budgets set for this month yet.</td></tr>';

    $('bud-rows').querySelectorAll('[data-edit-budget]').forEach((b) =>
      b.addEventListener('click', () => openBudgetForm(rows.find((r) => r.id === Number(b.dataset.editBudget)))));
    $('bud-rows').querySelectorAll('[data-del-budget]').forEach((b) =>
      b.addEventListener('click', async () => {
        const r = rows.find((x) => x.id === Number(b.dataset.delBudget));
        if (await H.confirmDialog('Delete this budget?', (r.department || 'Hotel-wide') + ' · ' + r.category + ' · ' + H.peso(r.amount))) {
          await H.store.deleteBudget(r.id);
          loadBudgets();
        }
      }));
  }

  function openBudgetForm(row) {
    editingBudget = row || {};
    $('bf-title').textContent = row ? 'Edit budget' : 'Add budget';
    $('bf-error').textContent = '';
    $('bf-dept').value = row && row.department_id != null ? String(row.department_id) : '';
    $('bf-category').value = row ? row.category : 'Supplies';
    $('bf-month').value = row ? String(row.period_month).slice(0, 7) : ($('bud-month').value || thisMonth());
    $('bf-amount').value = row ? row.amount : '';
    $('bf-notes').value = row ? (row.notes || '') : '';
    H.openModal('modal-budget');
  }

  async function saveBudget() {
    const btn = $('bf-save');
    btn.disabled = true;
    $('bf-error').textContent = '';
    try {
      await H.store.saveBudget({
        ...(editingBudget && editingBudget.id ? { id: editingBudget.id } : {}),
        department_id: $('bf-dept').value ? Number($('bf-dept').value) : null,
        category: $('bf-category').value,
        period_month: $('bf-month').value,
        amount: Number($('bf-amount').value) || 0,
        notes: $('bf-notes').value || null,
      });
      H.closeModal('modal-budget');
      // If the saved budget belongs to another month, jump to it.
      if ($('bf-month').value && $('bf-month').value !== $('bud-month').value) {
        $('bud-month').value = $('bf-month').value;
      }
      loadBudgets();
    } catch (e) {
      $('bf-error').textContent = e.message;
    }
    btn.disabled = false;
  }

  // ------------------------------------------------------------ targets
  async function loadTargets() {
    if (!targetRange) return;
    $('tgt-error').innerHTML = '';
    $('tgt-range-label').textContent = H.periodLabel(targetRange);
    try {
      const r = await H.store.getTargets(targetRange);
      renderTargets(r.data);
    } catch (e) {
      $('tgt-error').innerHTML = '<div class="error-box">' + H.esc(e.message) + '</div>';
    }
  }

  function renderTargets(rows) {
    $('tgt-rows').innerHTML = rows.length ? rows.map((r) =>
      '<tr><td class="strong">' + H.esc(r.name) + '</td>'
      + '<td>' + H.esc(r.department || 'Hotel-wide') + '</td>'
      + '<td>' + (r.actual != null ? r.actual + ' ' + H.esc(r.unit) : '<span style="color:var(--muted)">not measured</span>') + '</td>'
      + '<td>' + (r.target_value != null ? r.target_value : r.target) + ' ' + H.esc(r.unit) + '</td>'
      + '<td>' + (r.attainment != null
          ? '<div class="progress-cell">' + H.progressBar(r.attainment) + '<span class="pct-text">' + Number(r.attainment).toFixed(1) + '%</span></div>'
          : '<span style="color:var(--muted)">—</span>') + '</td>'
      + '<td><div class="row-actions">'
      + '<button data-edit-target="' + r.id + '" title="Edit">' + H.icon('edit', 15) + '</button>'
      + '<button class="danger" data-del-target="' + r.id + '" title="Delete">' + H.icon('trash', 15) + '</button>'
      + '</div></td></tr>'
    ).join('') : '<tr><td colspan="6" class="empty-cell">No KPI targets set yet.</td></tr>';

    $('tgt-rows').querySelectorAll('[data-edit-target]').forEach((b) =>
      b.addEventListener('click', () => openTargetForm(rows.find((r) => r.id === Number(b.dataset.editTarget)))));
    $('tgt-rows').querySelectorAll('[data-del-target]').forEach((b) =>
      b.addEventListener('click', async () => {
        const r = rows.find((x) => x.id === Number(b.dataset.delTarget));
        if (await H.confirmDialog('Delete this KPI target?', r.name)) {
          await H.store.deleteTarget(r.id);
          loadTargets();
        }
      }));
  }

  function openTargetForm(row) {
    editingTarget = row || {};
    $('tf-title').textContent = row ? 'Edit KPI target' : 'Add KPI target';
    $('tf-error').textContent = '';
    $('tf-name').value = row ? row.name : '';
    $('tf-dept').value = row && row.department_id != null ? String(row.department_id) : '';
    $('tf-value').value = row ? (row.target_value != null ? row.target_value : row.target) : '';
    $('tf-unit').value = row ? row.unit : '%';
    $('tf-period').value = row ? (row.period || 'monthly') : 'monthly';
    H.openModal('modal-target');
  }

  async function saveTarget() {
    const btn = $('tf-save');
    btn.disabled = true;
    $('tf-error').textContent = '';
    try {
      await H.store.saveTarget({
        ...(editingTarget && editingTarget.id ? { id: editingTarget.id } : {}),
        name: $('tf-name').value,
        department_id: $('tf-dept').value ? Number($('tf-dept').value) : null,
        target_value: Number($('tf-value').value) || 0,
        unit: $('tf-unit').value,
        period: $('tf-period').value,
      });
      H.closeModal('modal-target');
      loadTargets();
    } catch (e) {
      $('tf-error').textContent = e.message;
    }
    btn.disabled = false;
  }

  // --------------------------------------------------------------- init
  document.addEventListener('DOMContentLoaded', () => {
    $('bud-month').value = thisMonth();
    deptOptions($('bf-dept'), true);
    deptOptions($('tf-dept'), true);
    $('bf-category').innerHTML = H.BUDGET_CATEGORIES.map((c) => '<option>' + c + '</option>').join('');

    $('tab-budgets').addEventListener('click', () => {
      $('tab-budgets').classList.add('active');
      $('tab-targets').classList.remove('active');
      $('section-budgets').classList.remove('hidden');
      $('section-targets').classList.add('hidden');
    });
    $('tab-targets').addEventListener('click', () => {
      $('tab-targets').classList.add('active');
      $('tab-budgets').classList.remove('active');
      $('section-targets').classList.remove('hidden');
      $('section-budgets').classList.add('hidden');
    });

    $('bud-month').addEventListener('change', loadBudgets);
    $('btn-add-budget').addEventListener('click', () => openBudgetForm(null));
    $('bf-save').addEventListener('click', saveBudget);
    $('btn-add-target').addEventListener('click', () => openTargetForm(null));
    $('tf-save').addEventListener('click', saveTarget);

    loadBudgets();
    H.initFilterBar({
      onChange: (r) => { targetRange = r; loadTargets(); },
    });
  });
})();
