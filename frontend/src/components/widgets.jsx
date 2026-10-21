// src/components/widgets.jsx — shared UI pieces: cards, pills, charts,
// tables, modals and the report filter bar (CelCheck-style layout).

import { useEffect, useRef } from 'react';
import {
  Chart, LineController, BarController, DoughnutController, ArcElement,
  LineElement, BarElement, PointElement, CategoryScale, LinearScale,
  Tooltip, Legend,
} from 'chart.js';
import { Icon } from './icons';
import { DEPARTMENTS, PERIODS } from '../lib/data';
import { fmtVal } from '../lib/format';

Chart.register(
  LineController, BarController, DoughnutController, ArcElement,
  LineElement, BarElement, PointElement, CategoryScale, LinearScale,
  Tooltip, Legend,
);

export const PALETTE = ['#e483a8', '#c75b87', '#d9a441', '#9dbe9c', '#b39ddb', '#f2a65a', '#7fb3d5', '#e8b4c4'];

export function Card({ children, className = '' }) {
  return (
    <div className={`bg-card rounded-2xl border border-hairline p-5 ${className}`}>{children}</div>
  );
}

export function StatCard({ label, value, sub, icon, accent = false }) {
  return (
    <Card className="flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl grid place-items-center shrink-0 ${accent ? 'bg-accent text-white' : 'bg-pill text-accent-dark'}`}>
        <Icon name={icon} size={20} />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] tracking-[0.12em] text-muted font-semibold uppercase">{label}</div>
        <div className="font-display text-2xl font-semibold text-ink leading-tight truncate">{value}</div>
        {sub && <div className="text-xs text-muted mt-0.5">{sub}</div>}
      </div>
    </Card>
  );
}

const PILL_TONES = {
  pink: 'bg-pill text-accent-dark',
  green: 'bg-emerald-100 text-emerald-700',
  amber: 'bg-amber-100 text-amber-700',
  red: 'bg-red-100 text-red-700',
  gray: 'bg-sand text-ink/70',
  blue: 'bg-sky-100 text-sky-700',
};

export function Pill({ children, tone = 'gray' }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${PILL_TONES[tone] || PILL_TONES.gray}`}>
      {children}
    </span>
  );
}

export function statusTone(value) {
  const v = String(value || '').toLowerCase();
  if (['completed', 'resolved', 'checked_out', 'ok', 'active', 'read'].includes(v)) return 'green';
  if (['occupied', 'confirmed', 'checked_in', 'unread', 'info'].includes(v)) return 'pink';
  if (['pending', 'in_progress', 'warning', 'reserved', 'cleaning', 'low stock', 'medium'].includes(v)) return 'amber';
  if (['critical', 'urgent', 'high', 'cancelled', 'no_show', 'out of stock', 'maintenance', 'overdue'].includes(v)) return 'red';
  return 'gray';
}

export function ProgressBar({ value, tone = 'pink' }) {
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  const over = Number(value) > 100;
  return (
    <div className="h-2 rounded-full bg-sand overflow-hidden">
      <div
        className={`h-full rounded-full ${over ? 'bg-red-400' : tone === 'pink' ? 'bg-accent' : 'bg-emerald-400'}`}
        style={{ width: `${v}%` }}
      />
    </div>
  );
}

// Chart.js wrapper driven by the API chart shape:
// { kind: 'line'|'bar'|'doughnut', labels, series: [{label, data}] }
export function ChartView({ chart, height = 260 }) {
  const ref = useRef(null);
  const inst = useRef(null);

  useEffect(() => {
    if (!ref.current || !chart) return;
    if (inst.current) inst.current.destroy();
    const isDoughnut = chart.kind === 'doughnut';
    const datasets = chart.series.map((s, i) => isDoughnut
      ? { label: s.label, data: s.data, backgroundColor: PALETTE, borderColor: '#fff', borderWidth: 2 }
      : {
          label: s.label,
          data: s.data,
          borderColor: PALETTE[i % PALETTE.length],
          backgroundColor: chart.kind === 'line' ? `${PALETTE[i % PALETTE.length]}33` : PALETTE[i % PALETTE.length],
          fill: chart.kind === 'line',
          tension: 0.35,
          borderWidth: 2,
          pointRadius: 2.5,
          borderRadius: chart.kind === 'bar' ? 6 : 0,
        });
    inst.current = new Chart(ref.current, {
      type: chart.kind,
      data: { labels: chart.labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
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
    return () => { if (inst.current) { inst.current.destroy(); inst.current = null; } };
  }, [chart]);

  if (!chart) return null;
  return (
    <div style={{ height }}>
      <canvas ref={ref} />
    </div>
  );
}

const PILL_KEYS = new Set(['status', 'severity', 'priority']);
const MONEY_ROW_KEYS = new Set(['current', 'previous', 'change']);

export function DataTable({ columns, rows, emptyText = 'No records for this period.' }) {
  if (!rows?.length) {
    return <div className="text-sm text-muted py-10 text-center">{emptyText}</div>;
  }
  return (
    <div className="overflow-x-auto nice-scroll -mx-5 px-5">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] tracking-[0.1em] uppercase text-muted border-b border-hairline">
            {columns.map((c) => (
              <th key={c.key} className="py-2.5 pr-4 font-semibold whitespace-nowrap">{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className={`border-b border-hairline/60 ${i % 2 ? 'bg-cream/60' : ''}`}>
              {columns.map((c) => {
                const raw = r[c.key];
                if (PILL_KEYS.has(c.key) && raw != null) {
                  return (
                    <td key={c.key} className="py-2.5 pr-4">
                      <Pill tone={statusTone(raw)}>{String(raw).replaceAll('_', ' ')}</Pill>
                    </td>
                  );
                }
                const format = c.format || (MONEY_ROW_KEYS.has(c.key) ? r.format : undefined);
                const isChange = c.key === 'change_pct' && raw != null;
                return (
                  <td
                    key={c.key}
                    className={`py-2.5 pr-4 whitespace-nowrap ${i === -1 ? '' : ''} ${
                      isChange ? (Number(raw) >= 0 ? 'text-emerald-600 font-semibold' : 'text-red-500 font-semibold') : 'text-ink/85'
                    }`}
                  >
                    {fmtVal(raw, format)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SummaryChips({ summary }) {
  if (!summary?.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {summary.map((s, i) => (
        <div key={i} className="bg-cream border border-hairline rounded-xl px-3.5 py-2">
          <span className="text-xs text-muted mr-2">{s.label}</span>
          <span className="text-sm font-semibold text-ink">{fmtVal(s.value, s.format)}</span>
        </div>
      ))}
    </div>
  );
}

// Period presets + custom range + (optional) department filter + exports.
// This one bar powers features 19/20/21 (period reports, date & department
// filters, PDF/CSV export) across the dashboard and report pages.
export function FilterBar({
  preset, setPreset, custom, setCustom,
  department, setDepartment, showDepartment = false,
  onExportCSV, onExportPDF,
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex bg-white border border-hairline rounded-xl p-1 gap-1">
        {PERIODS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPreset(p.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              preset === p.id ? 'bg-pill text-accent-dark' : 'text-muted hover:text-ink'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      {preset === 'custom' && (
        <div className="flex items-center gap-2 text-xs text-muted">
          <input
            type="date" value={custom.from}
            onChange={(e) => setCustom({ ...custom, from: e.target.value })}
            className="bg-white border border-hairline rounded-lg px-2 py-1.5 text-ink"
          />
          <span>to</span>
          <input
            type="date" value={custom.to}
            onChange={(e) => setCustom({ ...custom, to: e.target.value })}
            className="bg-white border border-hairline rounded-lg px-2 py-1.5 text-ink"
          />
        </div>
      )}
      {showDepartment && (
        <select
          value={department || ''}
          onChange={(e) => setDepartment(e.target.value ? Number(e.target.value) : null)}
          className="bg-white border border-hairline rounded-xl px-3 py-2 text-xs font-medium text-ink"
        >
          <option value="">All departments</option>
          {DEPARTMENTS.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      )}
      {(onExportCSV || onExportPDF) && (
        <div className="flex gap-2 ml-auto">
          {onExportCSV && (
            <button
              onClick={onExportCSV}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-hairline bg-white text-xs font-semibold text-ink hover:border-accent"
            >
              <Icon name="download" size={14} /> CSV
            </button>
          )}
          {onExportPDF && (
            <button
              onClick={onExportPDF}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-accent text-white text-xs font-semibold hover:bg-accent-dark"
            >
              <Icon name="download" size={14} /> PDF
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function Modal({ title, onClose, children, wide = false }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <div className={`relative bg-card rounded-2xl border border-hairline w-full ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-[90vh] overflow-y-auto nice-scroll`}>
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-cream" aria-label="Close">
            <Icon name="x" size={18} />
          </button>
        </div>
        <div className="px-6 pb-6">{children}</div>
      </div>
    </div>
  );
}

export const inputCls =
  'w-full bg-white border border-hairline rounded-xl px-3 py-2.5 text-sm text-ink outline-none focus:border-accent';
export const labelCls = 'block text-xs font-semibold text-muted mb-1.5 uppercase tracking-wide';

export function Field({ label, children }) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      {children}
    </label>
  );
}
