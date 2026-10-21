// src/pages/Reports.jsx — the report hub. Select a report type, narrow
// it with period presets / a custom date range / the department filter,
// then export it as CSV or PDF. Covers the module's occupancy, revenue,
// department, KPI, ADR, RevPAR, satisfaction, complaint, inventory,
// maintenance, housekeeping, F&B, financial and comparison reports.

import { useEffect, useMemo, useState } from 'react';
import { store } from '../lib/store';
import { REPORT_GROUPS, reportMeta } from '../lib/data';
import { periodRange, periodLabel, addDays, todayISO, fmtDate } from '../lib/format';
import { exportCSV, exportPDF } from '../lib/export';
import { Card, ChartView, FilterBar, DataTable, SummaryChips } from '../components/widgets';
import { Icon } from '../components/icons';

export function Reports() {
  const [type, setType] = useState('occupancy');
  const [preset, setPreset] = useState('weekly');
  const [custom, setCustom] = useState({ from: addDays(todayISO(), -29), to: todayISO() });
  const [department, setDepartment] = useState(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const meta = reportMeta(type);
  const range = useMemo(() => periodRange(preset, custom), [preset, custom]);
  const deptParam = meta?.dept ? department : null;

  useEffect(() => {
    let live = true;
    setError(null);
    store.getReport({ type, ...range, department: deptParam })
      .then((r) => { if (live) setData(r); })
      .catch((e) => { if (live) setError(e.message); });
    return () => { live = false; };
  }, [type, range, deptParam]);

  const doExport = (kind) => {
    if (!data) return;
    const subtitle = `${periodLabel(range)}${deptParam ? ' · filtered by department' : ''}`;
    if (kind === 'csv') exportCSV(data.title, data.columns, data.rows);
    else exportPDF(data.title, subtitle, data.columns, data.rows);
    store.logReport({
      title: data.title, type, generated_by: 'Management Department',
      parameters: { ...range, department: deptParam, export: kind },
    }).catch(() => {});
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-5">
        <h1 className="font-display text-2xl font-semibold text-ink">Reports</h1>
        <p className="text-sm text-muted mt-1">
          Generate management reports from the shared hotel database, filter by period and department, and export them.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4 items-start">
        {/* Report type selector */}
        <Card className="p-3 lg:sticky lg:top-6">
          {REPORT_GROUPS.map((g) => (
            <div key={g.group} className="mb-2">
              <div className="px-2 pt-2 pb-1.5 text-[10px] tracking-[0.14em] text-muted font-semibold">
                {g.group.toUpperCase()}
              </div>
              <div className="space-y-0.5">
                {g.reports.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setType(r.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      type === r.id ? 'bg-pill text-ink' : 'text-muted hover:bg-cream hover:text-ink'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </Card>

        {/* Report body */}
        <div className="min-w-0">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="font-display text-lg font-semibold text-ink">{data?.title || meta?.label}</h2>
                <p className="text-xs text-muted mt-0.5">{periodLabel(range)}</p>
              </div>
            </div>
            <FilterBar
              preset={preset} setPreset={setPreset} custom={custom} setCustom={setCustom}
              department={department} setDepartment={setDepartment} showDepartment={!!meta?.dept}
              onExportCSV={() => doExport('csv')} onExportPDF={() => doExport('pdf')}
            />

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mt-4">
                Could not load this report: {error}
              </div>
            )}
            {!data && !error && <div className="text-sm text-muted py-14 text-center">Loading report…</div>}

            {data && (
              <div className="mt-5 space-y-5">
                <SummaryChips summary={data.summary} />
                {data.chart && <ChartView chart={data.chart} height={250} />}
                <DataTable columns={data.columns} rows={data.rows} />
              </div>
            )}
          </Card>

          {/* Report-specific extras */}
          {data?.extra?.comments?.length > 0 && (
            <Card className="mt-4">
              <h3 className="font-display font-semibold text-ink mb-3">Latest guest comments</h3>
              <div className="space-y-3">
                {data.extra.comments.map((cm, i) => (
                  <div key={i} className="flex gap-3 text-sm">
                    <span className="flex text-gold shrink-0 pt-0.5" aria-label={`${cm.rating} stars`}>
                      {Array.from({ length: 5 }).map((_, s) => (
                        <Icon key={s} name="star" size={13} className={s < cm.rating ? '' : 'opacity-25'} />
                      ))}
                    </span>
                    <div className="min-w-0">
                      <span className="font-medium text-ink">{cm.guest_name}</span>
                      <span className="text-muted"> · {cm.category} · {fmtDate(cm.day)}</span>
                      <div className="text-ink/85">{cm.comment}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {data?.extra?.by_source?.length > 0 && (
            <Card className="mt-4">
              <h3 className="font-display font-semibold text-ink mb-3">Reservations by source</h3>
              <div className="flex flex-wrap gap-2">
                {data.extra.by_source.map((s) => (
                  <div key={s.source} className="bg-cream border border-hairline rounded-xl px-3.5 py-2 text-sm">
                    <span className="text-muted mr-2">{s.source}</span>
                    <span className="font-semibold text-ink">{s.c}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
