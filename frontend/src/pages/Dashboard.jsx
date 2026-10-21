// src/pages/Dashboard.jsx — Executive dashboard: the hotel's live state
// in one view (occupancy, reservations, revenue, expenses, outstanding
// operational tasks), with period comparison via the filter bar.

import { useEffect, useMemo, useState } from 'react';
import { store } from '../lib/store';
import { periodRange, periodLabel, peso, pct, rating, fmtDate, addDays, todayISO } from '../lib/format';
import { Card, StatCard, ChartView, FilterBar, Pill, ProgressBar, statusTone } from '../components/widgets';
import { Icon } from '../components/icons';

const PRESET_TITLES = {
  daily: 'Today', weekly: 'Last 7 days', monthly: 'This month', yearly: 'This year', custom: 'Selected period',
};

export function Dashboard({ go }) {
  const [preset, setPreset] = useState('weekly');
  const [custom, setCustom] = useState({ from: addDays(todayISO(), -29), to: todayISO() });
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const range = useMemo(() => periodRange(preset, custom), [preset, custom]);

  useEffect(() => {
    let live = true;
    setError(null);
    store.getDashboard(range)
      .then((r) => { if (live) setData(r); })
      .catch((e) => { if (live) setError(e.message); });
    return () => { live = false; };
  }, [range]);

  const c = data?.cards;
  const trendChart = data && {
    kind: 'line',
    labels: data.trend.map((t) => t.date.slice(5)),
    series: [
      { label: 'Revenue', data: data.trend.map((t) => t.revenue) },
      { label: 'Expenses', data: data.trend.map((t) => t.expenses) },
    ],
  };
  const deptChart = data && {
    kind: 'bar',
    labels: data.departments.map((d) => d.name),
    series: [
      { label: 'Revenue', data: data.departments.map((d) => d.revenue) },
      { label: 'Expenses', data: data.departments.map((d) => d.expenses) },
    ],
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Executive Dashboard</h1>
          <p className="text-sm text-muted mt-1">
            {PRESET_TITLES[preset]} · {periodLabel(range)}
          </p>
        </div>
        <FilterBar preset={preset} setPreset={setPreset} custom={custom} setCustom={setCustom} />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">
          Could not load the dashboard: {error}
        </div>
      )}
      {!data && !error && <div className="text-sm text-muted py-16 text-center">Loading dashboard…</div>}

      {data && c && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard label="Occupancy rate" value={pct(c.occupancy_rate)} icon="bed" accent
              sub={`${c.rooms_sold} room-nights sold · ${c.total_rooms} rooms`} />
            <StatCard label="Total revenue" value={peso(c.revenue)} icon="trend"
              sub={`ADR ${peso(c.adr)} · RevPAR ${peso(c.revpar)}`} />
            <StatCard label="Total expenses" value={peso(c.expenses)} icon="wallet"
              sub={`Net income ${peso(c.net)}`} />
            <StatCard label="Reservations" value={c.reservations} icon="calendar"
              sub={`${c.arrivals} arrivals · ${c.departures} departures`} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
            <StatCard label="Guest satisfaction" value={c.satisfaction != null ? rating(c.satisfaction) : '—'} icon="star"
              sub={`${c.satisfaction_responses} responses in period`} />
            <StatCard label="Open operational tasks" value={c.open_tasks} icon="tool"
              sub={`${data.outstanding.maintenance_open} maintenance · ${data.outstanding.housekeeping_pending} housekeeping`} />
            <StatCard label="Unread alerts" value={c.unread_alerts} icon="bell"
              sub={`${data.outstanding.complaints_open} open complaints · ${data.outstanding.low_stock} low-stock items`} />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mt-4">
            <Card className="xl:col-span-2">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display font-semibold text-ink">Revenue vs expenses</h3>
                <span className="text-xs text-muted">{periodLabel(range)}</span>
              </div>
              <ChartView chart={trendChart} height={250} />
            </Card>
            <Card>
              <h3 className="font-display font-semibold text-ink mb-3">Outstanding work</h3>
              <div className="space-y-3 text-sm">
                {[
                  ['Maintenance requests open', data.outstanding.maintenance_open, 'tool'],
                  ['Housekeeping tasks pending', data.outstanding.housekeeping_pending, 'sparkles'],
                  ['Complaints unresolved', data.outstanding.complaints_open, 'alert'],
                  ['Decisions overdue', data.outstanding.decisions_overdue, 'decisions'],
                  ['Items at/below reorder level', data.outstanding.low_stock, 'box'],
                ].map(([label, value, icon]) => (
                  <div key={label} className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-pill text-accent-dark grid place-items-center shrink-0">
                      <Icon name={icon} size={15} />
                    </span>
                    <span className="flex-1 text-ink/85">{label}</span>
                    <span className={`font-semibold ${value > 0 ? 'text-ink' : 'text-muted'}`}>{value}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => go('alerts')}
                className="mt-4 w-full text-sm font-semibold px-4 py-2.5 rounded-xl bg-accent text-white hover:bg-accent-dark"
              >
                View operational alerts
              </button>
            </Card>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mt-4">
            <Card className="xl:col-span-2">
              <h3 className="font-display font-semibold text-ink mb-3">Department performance</h3>
              <ChartView chart={deptChart} height={240} />
            </Card>
            <Card>
              <h3 className="font-display font-semibold text-ink mb-3">KPI attainment</h3>
              <div className="space-y-3.5">
                {data.kpis.slice(0, 6).map((k) => (
                  <div key={k.id}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-ink/85 font-medium truncate mr-2">{k.name}</span>
                      <span className="text-muted whitespace-nowrap">
                        {k.actual != null ? `${k.actual} / ${k.target} ${k.unit}` : `target ${k.target} ${k.unit}`}
                      </span>
                    </div>
                    <ProgressBar value={k.attainment ?? 0} />
                  </div>
                ))}
              </div>
              <button
                onClick={() => go('budgets')}
                className="mt-4 text-sm font-semibold text-accent-dark hover:underline"
              >
                Manage budgets & targets →
              </button>
            </Card>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-4">
            <Card>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display font-semibold text-ink">Recent decisions</h3>
                <button onClick={() => go('decisions')} className="text-xs font-semibold text-accent-dark hover:underline">
                  Open decision tracking
                </button>
              </div>
              <div className="space-y-2.5">
                {data.recent_decisions.map((d) => (
                  <div key={d.id} className="flex items-center gap-3 text-sm">
                    <div className="flex-1 min-w-0">
                      <div className="text-ink font-medium truncate">{d.title}</div>
                      <div className="text-xs text-muted">
                        {d.assigned_to || 'Unassigned'} · due {d.deadline ? fmtDate(d.deadline) : '—'}
                      </div>
                    </div>
                    <Pill tone={statusTone(d.status)}>{String(d.status).replaceAll('_', ' ')}</Pill>
                  </div>
                ))}
                {!data.recent_decisions.length && <div className="text-sm text-muted">No decisions recorded yet.</div>}
              </div>
            </Card>
            <Card>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display font-semibold text-ink">Latest alerts</h3>
                <button onClick={() => go('alerts')} className="text-xs font-semibold text-accent-dark hover:underline">
                  View all alerts
                </button>
              </div>
              <div className="space-y-2.5">
                {data.latest_alerts.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 text-sm">
                    <span className={`w-8 h-8 rounded-lg grid place-items-center shrink-0 ${
                      a.severity === 'critical' ? 'bg-red-100 text-red-600'
                        : a.severity === 'warning' ? 'bg-amber-100 text-amber-600' : 'bg-pill text-accent-dark'}`}>
                      <Icon name="bell" size={15} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-ink font-medium truncate">{a.title}</div>
                      <div className="text-xs text-muted">{a.source} · {String(a.status)}</div>
                    </div>
                    {a.status === 'unread' && <span className="w-2 h-2 rounded-full bg-accent shrink-0" />}
                  </div>
                ))}
                {!data.latest_alerts.length && <div className="text-sm text-muted">No alerts.</div>}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
