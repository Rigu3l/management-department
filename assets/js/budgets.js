/* assets/js/budgets.js — Budgets & Targets page (budgets.html).
   Read-only: budgets and KPI targets are maintained by the Finance
   Department module. This page only views them — monthly budgets per
   department/category vs actual spending, and KPI targets vs measured
   actuals. */
(function () {
  'use strict';
  const H = window.HMS;
  const $ = (id) => document.getElementById(id);
  const thisMonth = () => H.todayISO().slice(0, 7);

  let targetRange = null;

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
      + '<span class="pct-text">' + Number(r.used_pct).toFixed(1) + '%</span></div></td></tr>'
    ).join('') : '<tr><td colspan="6" class="empty-cell">No budgets set for this month yet.</td></tr>';
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
          : '<span style="color:var(--muted)">—</span>') + '</td></tr>'
    ).join('') : '<tr><td colspan="5" class="empty-cell">No KPI targets set yet.</td></tr>';
  }

  // --------------------------------------------------------------- init
  document.addEventListener('DOMContentLoaded', () => {
    $('bud-month').value = thisMonth();

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

    loadBudgets();
    H.initFilterBar({
      onChange: (r) => { targetRange = r; loadTargets(); },
    });
  });
})();
