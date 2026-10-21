// src/pages/Budgets.jsx — Budget and target management: monthly budgets
// per department/category tracked against actual spending, and KPI
// targets tracked against measured actuals.

import { useEffect, useMemo, useState } from 'react';
import { store } from '../lib/store';
import { DEPARTMENTS, BUDGET_CATEGORIES } from '../lib/data';
import { periodRange, monthRange, periodLabel, peso, peso2, todayISO, addDays } from '../lib/format';
import { Card, FilterBar, Modal, Field, inputCls, Pill, ProgressBar } from '../components/widgets';
import { Icon } from '../components/icons';

const thisMonth = () => todayISO().slice(0, 7);

export function Budgets() {
  const [tab, setTab] = useState('budgets');
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-5">
        <h1 className="font-display text-2xl font-semibold text-ink">Budgets & Targets</h1>
        <p className="text-sm text-muted mt-1">
          Set monthly budgets and KPI targets, and track them against what the hotel actually spends and achieves.
        </p>
      </div>
      <div className="flex bg-white border border-hairline rounded-xl p-1 gap-1 w-fit mb-4">
        {[['budgets', 'Budgets'], ['targets', 'KPI Targets']].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold ${tab === id ? 'bg-pill text-accent-dark' : 'text-muted hover:text-ink'}`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'budgets' ? <BudgetsTab /> : <TargetsTab />}
    </div>
  );
}

function BudgetsTab() {
  const [month, setMonth] = useState(thisMonth());
  const [rows, setRows] = useState([]);
  const [editing, setEditing] = useState(null); // null | {} new | row
  const [deleting, setDeleting] = useState(null);
  const [error, setError] = useState(null);

  const load = () => {
    setError(null);
    store.getBudgets(month).then((r) => setRows(r.data)).catch((e) => setError(e.message));
  };
  useEffect(load, [month]);

  const totalBudget = rows.reduce((a, r) => a + Number(r.amount), 0);
  const totalSpent = rows.reduce((a, r) => a + Number(r.spent), 0);

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <label className="flex items-center gap-2 text-sm text-muted">
          Month
          <input
            type="month" value={month} onChange={(e) => setMonth(e.target.value || thisMonth())}
            className="bg-white border border-hairline rounded-xl px-3 py-2 text-sm text-ink"
          />
        </label>
        <div className="text-sm text-muted">
          Budget <span className="font-semibold text-ink">{peso(totalBudget)}</span>
          {' · '}Spent <span className="font-semibold text-ink">{peso(totalSpent)}</span>
          {' · '}Remaining <span className={`font-semibold ${totalBudget - totalSpent < 0 ? 'text-red-500' : 'text-emerald-600'}`}>{peso(totalBudget - totalSpent)}</span>
        </div>
        <button
          onClick={() => setEditing({})}
          className="ml-auto flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent-dark"
        >
          <Icon name="plus" size={15} /> Add budget
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-3">{error}</div>}

      <div className="overflow-x-auto nice-scroll -mx-5 px-5">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] tracking-[0.1em] uppercase text-muted border-b border-hairline">
              <th className="py-2.5 pr-4 font-semibold">Department</th>
              <th className="py-2.5 pr-4 font-semibold">Category</th>
              <th className="py-2.5 pr-4 font-semibold">Budget</th>
              <th className="py-2.5 pr-4 font-semibold">Spent</th>
              <th className="py-2.5 pr-4 font-semibold">Remaining</th>
              <th className="py-2.5 pr-4 font-semibold w-44">Used</th>
              <th className="py-2.5 font-semibold w-20"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} className={`border-b border-hairline/60 ${i % 2 ? 'bg-cream/60' : ''}`}>
                <td className="py-2.5 pr-4 text-ink/85">{r.department || 'Hotel-wide'}</td>
                <td className="py-2.5 pr-4 text-ink/85">{r.category}</td>
                <td className="py-2.5 pr-4">{peso2(r.amount)}</td>
                <td className="py-2.5 pr-4">{peso2(r.spent)}</td>
                <td className={`py-2.5 pr-4 font-medium ${Number(r.remaining) < 0 ? 'text-red-500' : 'text-emerald-600'}`}>{peso2(r.remaining)}</td>
                <td className="py-2.5 pr-4">
                  <div className="flex items-center gap-2">
                    <div className="flex-1"><ProgressBar value={r.used_pct} /></div>
                    <span className="text-xs text-muted w-12">{Number(r.used_pct).toFixed(1)}%</span>
                  </div>
                </td>
                <td className="py-2.5">
                  <div className="flex gap-1">
                    <button onClick={() => setEditing(r)} className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-cream" title="Edit">
                      <Icon name="edit" size={15} />
                    </button>
                    <button onClick={() => setDeleting(r)} className="p-1.5 rounded-lg text-muted hover:text-red-600 hover:bg-red-50" title="Delete">
                      <Icon name="trash" size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr><td colSpan={7} className="py-10 text-center text-muted">No budgets set for this month yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <BudgetForm
          initial={editing}
          month={month}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
      {deleting && (
        <ConfirmModal
          title="Delete this budget?"
          body={`${deleting.department || 'Hotel-wide'} · ${deleting.category} · ${peso(deleting.amount)}`}
          onCancel={() => setDeleting(null)}
          onConfirm={async () => { await store.deleteBudget(deleting.id); setDeleting(null); load(); }}
        />
      )}
    </Card>
  );
}

function BudgetForm({ initial, month, onClose, onSaved }) {
  const [form, setForm] = useState({
    department_id: initial.department_id ?? '',
    category: initial.category ?? 'Supplies',
    period_month: initial.period_month ? String(initial.period_month).slice(0, 7) : month,
    amount: initial.amount ?? '',
    notes: initial.notes ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = async () => {
    setSaving(true); setError(null);
    try {
      await store.saveBudget({
        ...(initial.id ? { id: initial.id } : {}),
        department_id: form.department_id ? Number(form.department_id) : null,
        category: form.category,
        period_month: form.period_month,
        amount: Number(form.amount) || 0,
        notes: form.notes || null,
      });
      onSaved();
    } catch (e) { setError(e.message); setSaving(false); }
  };

  return (
    <Modal title={initial.id ? 'Edit budget' : 'Add budget'} onClose={onClose}>
      <div className="space-y-4">
        <Field label="Department">
          <select value={form.department_id} onChange={set('department_id')} className={inputCls}>
            <option value="">Hotel-wide</option>
            {DEPARTMENTS.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </Field>
        <Field label="Category">
          <select value={form.category} onChange={set('category')} className={inputCls}>
            {BUDGET_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Month">
            <input type="month" value={form.period_month} onChange={set('period_month')} className={inputCls} />
          </Field>
          <Field label="Amount (₱)">
            <input type="number" min="0" step="0.01" value={form.amount} onChange={set('amount')} className={inputCls} placeholder="0.00" />
          </Field>
        </div>
        <Field label="Notes (optional)">
          <input value={form.notes} onChange={set('notes')} className={inputCls} placeholder="e.g. Monthly utilities budget" />
        </Field>
        {error && <div className="text-sm text-red-600">{error}</div>}
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 text-sm font-semibold px-4 py-2.5 rounded-xl border border-hairline text-ink hover:border-accent">Cancel</button>
          <button onClick={save} disabled={saving} className="flex-1 text-sm font-semibold px-4 py-2.5 rounded-xl bg-accent text-white hover:bg-accent-dark disabled:opacity-60">
            {saving ? 'Saving…' : 'Save budget'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function TargetsTab() {
  const [preset, setPreset] = useState('monthly');
  const [custom, setCustom] = useState({ from: addDays(todayISO(), -29), to: todayISO() });
  const [rows, setRows] = useState([]);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [error, setError] = useState(null);

  const range = useMemo(() => periodRange(preset, custom), [preset, custom]);
  const load = () => {
    setError(null);
    store.getTargets(range).then((r) => setRows(r.data)).catch((e) => setError(e.message));
  };
  useEffect(load, [range]);

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-3 mb-2">
        <div className="text-sm text-muted">Actuals measured for <span className="font-medium text-ink">{periodLabel(range)}</span></div>
        <button
          onClick={() => setEditing({})}
          className="ml-auto flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent-dark"
        >
          <Icon name="plus" size={15} /> Add KPI target
        </button>
      </div>
      <FilterBar preset={preset} setPreset={setPreset} custom={custom} setCustom={setCustom} />
      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mt-3">{error}</div>}

      <div className="overflow-x-auto nice-scroll -mx-5 px-5 mt-2">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] tracking-[0.1em] uppercase text-muted border-b border-hairline">
              <th className="py-2.5 pr-4 font-semibold">KPI</th>
              <th className="py-2.5 pr-4 font-semibold">Department</th>
              <th className="py-2.5 pr-4 font-semibold">Actual</th>
              <th className="py-2.5 pr-4 font-semibold">Target</th>
              <th className="py-2.5 pr-4 font-semibold w-48">Attainment</th>
              <th className="py-2.5 font-semibold w-20"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} className={`border-b border-hairline/60 ${i % 2 ? 'bg-cream/60' : ''}`}>
                <td className="py-2.5 pr-4 font-medium text-ink">{r.name}</td>
                <td className="py-2.5 pr-4 text-ink/85">{r.department || 'Hotel-wide'}</td>
                <td className="py-2.5 pr-4">{r.actual != null ? `${r.actual} ${r.unit}` : <span className="text-muted">not measured</span>}</td>
                <td className="py-2.5 pr-4">{r.target_value ?? r.target} {r.unit}</td>
                <td className="py-2.5 pr-4">
                  {r.attainment != null ? (
                    <div className="flex items-center gap-2">
                      <div className="flex-1"><ProgressBar value={r.attainment} /></div>
                      <span className="text-xs text-muted w-12">{Number(r.attainment).toFixed(1)}%</span>
                    </div>
                  ) : <span className="text-muted">—</span>}
                </td>
                <td className="py-2.5">
                  <div className="flex gap-1">
                    <button onClick={() => setEditing(r)} className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-cream" title="Edit">
                      <Icon name="edit" size={15} />
                    </button>
                    <button onClick={() => setDeleting(r)} className="p-1.5 rounded-lg text-muted hover:text-red-600 hover:bg-red-50" title="Delete">
                      <Icon name="trash" size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr><td colSpan={6} className="py-10 text-center text-muted">No KPI targets set yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <TargetForm initial={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />
      )}
      {deleting && (
        <ConfirmModal
          title="Delete this KPI target?"
          body={deleting.name}
          onCancel={() => setDeleting(null)}
          onConfirm={async () => { await store.deleteTarget(deleting.id); setDeleting(null); load(); }}
        />
      )}
    </Card>
  );
}

function TargetForm({ initial, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: initial.name ?? '',
    department_id: initial.department_id ?? '',
    target_value: initial.target_value ?? initial.target ?? '',
    unit: initial.unit ?? '%',
    period: initial.period ?? 'monthly',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = async () => {
    setSaving(true); setError(null);
    try {
      await store.saveTarget({
        ...(initial.id ? { id: initial.id } : {}),
        name: form.name,
        department_id: form.department_id ? Number(form.department_id) : null,
        target_value: Number(form.target_value) || 0,
        unit: form.unit, period: form.period,
      });
      onSaved();
    } catch (e) { setError(e.message); setSaving(false); }
  };

  return (
    <Modal title={initial.id ? 'Edit KPI target' : 'Add KPI target'} onClose={onClose}>
      <div className="space-y-4">
        <Field label="KPI name">
          <input value={form.name} onChange={set('name')} className={inputCls} placeholder="e.g. Occupancy rate" />
        </Field>
        <Field label="Department">
          <select value={form.department_id} onChange={set('department_id')} className={inputCls}>
            <option value="">Hotel-wide</option>
            {DEPARTMENTS.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Target value">
            <input type="number" min="0" step="0.01" value={form.target_value} onChange={set('target_value')} className={inputCls} />
          </Field>
          <Field label="Unit">
            <select value={form.unit} onChange={set('unit')} className={inputCls}>
              {['%', 'rating', 'hours', 'PHP', 'count'].map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </Field>
          <Field label="Period">
            <select value={form.period} onChange={set('period')} className={inputCls}>
              {['daily', 'weekly', 'monthly', 'yearly'].map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
        </div>
        <p className="text-xs text-muted">
          KPIs named Occupancy rate, Guest satisfaction, ADR, RevPAR, Housekeeping completion,
          Maintenance response time or Complaint resolution are measured automatically.
        </p>
        {error && <div className="text-sm text-red-600">{error}</div>}
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 text-sm font-semibold px-4 py-2.5 rounded-xl border border-hairline text-ink hover:border-accent">Cancel</button>
          <button onClick={save} disabled={saving} className="flex-1 text-sm font-semibold px-4 py-2.5 rounded-xl bg-accent text-white hover:bg-accent-dark disabled:opacity-60">
            {saving ? 'Saving…' : 'Save target'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function ConfirmModal({ title, body, onCancel, onConfirm }) {
  const [busy, setBusy] = useState(false);
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="text-sm text-muted">{body}</p>
      <p className="text-sm text-muted mt-1">This cannot be undone.</p>
      <div className="flex gap-2 mt-5">
        <button onClick={onCancel} className="flex-1 text-sm font-semibold px-4 py-2.5 rounded-xl border border-hairline text-ink hover:border-accent">Cancel</button>
        <button
          onClick={async () => { setBusy(true); await onConfirm(); }}
          disabled={busy}
          className="flex-1 text-sm font-semibold px-4 py-2.5 rounded-xl bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
        >
          {busy ? 'Deleting…' : 'Delete'}
        </button>
      </div>
    </Modal>
  );
}
