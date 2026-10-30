/* assets/js/dashboard.js — Executive dashboard page (index.html).
   Fills the stat cards, charts, KPI bars and outstanding work from
   the data layer (PHP API or demo). Decisions and alerts live on their
   own pages; unread alerts are shown on the topbar bell icon. */
(function () {
  'use strict';
  const H = window.HMS;
  const $ = (id) => document.getElementById(id);
  const PRESET_TITLES = {
    daily: 'Today', weekly: 'Last 7 days', monthly: 'This month',
    yearly: 'This year', custom: 'Selected period',
  };
  let range = null;

  async function load() {
    $('dash-error').innerHTML = '';
    try {
      const data = await H.store.getDashboard(range);
      render(data);
    } catch (e) {
      $('dash-loading').classList.add('hidden');
      $('dash-error').innerHTML = '<div class="error-box">Could not load the dashboard: ' + H.esc(e.message) + '</div>';
    }
  }

  function render(data) {
    const c = data.cards;
    $('dash-loading').classList.add('hidden');
    $('dash-content').classList.remove('hidden');
    $('trend-range').textContent = H.periodLabel(data.period);

    $('c-occupancy').textContent = H.pct(c.occupancy_rate);
    $('c-occupancy-sub').textContent = c.rooms_sold + ' room-nights sold · ' + c.total_rooms + ' rooms';
    $('c-revenue').textContent = H.peso(c.revenue);
    $('c-revenue-sub').textContent = 'ADR ' + H.peso(c.adr) + ' · RevPAR ' + H.peso(c.revpar);
    $('c-expenses').textContent = H.peso(c.expenses);
    $('c-expenses-sub').textContent = 'Net income ' + H.peso(c.net);
    $('c-reservations').textContent = c.reservations;
    $('c-reservations-sub').textContent = c.arrivals + ' arrivals · ' + c.departures + ' departures';
    $('c-tasks').textContent = c.open_tasks;
    $('c-tasks-sub').textContent = data.outstanding.maintenance_open + ' maintenance · '
      + data.outstanding.housekeeping_pending + ' housekeeping';

    H.renderChart('chart-trend', {
      kind: 'line',
      labels: data.trend.map((t) => t.date.slice(5)),
      series: [
        { label: 'Revenue', data: data.trend.map((t) => t.revenue) },
        { label: 'Expenses', data: data.trend.map((t) => t.expenses) },
      ],
    });
    H.renderChart('chart-dept', {
      kind: 'bar',
      labels: data.departments.map((d) => d.name),
      series: [
        { label: 'Revenue', data: data.departments.map((d) => d.revenue) },
        { label: 'Expenses', data: data.departments.map((d) => d.expenses) },
      ],
    });

    const outstanding = [
      ['Maintenance requests open', data.outstanding.maintenance_open, 'tool'],
      ['Housekeeping tasks pending', data.outstanding.housekeeping_pending, 'sparkles'],
      ['Complaints unresolved', data.outstanding.complaints_open, 'alert'],
      ['Decisions overdue', data.outstanding.decisions_overdue, 'decisions'],
      ['Items at/below reorder level', data.outstanding.low_stock, 'box'],
    ];
    $('outstanding-list').innerHTML = outstanding.map(([label, value, ic]) =>
      '<div class="list-row"><span class="mini-icon">' + H.icon(ic, 15) + '</span>'
      + '<span style="flex:1;color:rgba(71,48,42,.88)">' + label + '</span>'
      + '<strong' + (value > 0 ? '' : ' style="color:var(--muted)"') + '>' + value + '</strong></div>'
    ).join('');

    $('kpi-list').innerHTML = data.kpis.slice(0, 6).map((k) =>
      '<div class="kpi-row"><div class="kpi-head"><span class="kpi-name">' + H.esc(k.name) + '</span>'
      + '<span class="kpi-vals">' + (k.actual != null ? k.actual + ' / ' + k.target + ' ' + H.esc(k.unit) : 'target ' + k.target + ' ' + H.esc(k.unit)) + '</span></div>'
      + H.progressBar(k.attainment || 0) + '</div>'
    ).join('');
  }

  document.addEventListener('DOMContentLoaded', () => {
    H.initFilterBar({
      onChange: (r) => {
        range = r;
        $('dash-subtitle').textContent = (PRESET_TITLES[r.period] || 'Selected period') + ' · ' + H.periodLabel(r);
        load();
      },
    });
  });
})();
