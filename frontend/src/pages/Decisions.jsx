// src/pages/Decisions.jsx — Management decision tracking (action
// tracking from the paper): record decisions with the person
// responsible and a follow-up deadline, and monitor them to completion.

import { useEffect, useState } from 'react';
import { store } from '../lib/store';
import { DEPARTMENTS } from '../lib/data';
import { fmtDate } from '../lib/format';
import { Card, Modal, Field, inputCls, Pill, statusTone } from '../components/widgets';
import { Icon } from '../components/icons';
import { ConfirmModal } from './Budgets';

const STATUSES = ['pending', 'in_progress', 'completed'];

export function Decisions() {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [department, setDepartment] = useState('');
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [error, setError] = useState(null);

  const load = () => {
    setError(null);
    store.getDecisions({ q, status, department: department || undefined })
      .then((r) => { setRows(r.data); setSummary(r.summary); })
      .catch((e) => setError(e.message));
  };
  useEffect(load, [q, status, department]);

  const changeStatus = async (row, next) => {
    await store.saveDecision({ ...row, status: next });
    load();
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Decision Tracking</h1>
          <p className="text-sm text-muted mt-1">
            Management decisions, who is responsible for each, and their follow-up deadlines.
          </p>
        </div>
        <button
          onClick={() => setEditing({})}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent-dark"
        >
          <Icon name="plus" size={15} /> Record decision
        </button>
      </div>

      {summary && (
        <div className="flex flex-wrap gap-2 mb-4">
          {[
            ['Total decisions', summary.total, 'gray'],
            ['Pending', summary.pending, 'amber'],
            ['In progress', summary.in_progress, 'amber'],
            ['Completed', summary.completed, 'green'],
            ['Overdue', summary.overdue, 'red'],
          ].map(([label, value, tone]) => (
            <div key={label} className="bg-white border border-hairline rounded-xl px-3.5 py-2 flex items-center gap-2">
              <span className="text-xs text-muted">{label}</span>
              <Pill tone={tone}>{value}</Pill>
            </div>
          ))}
        </div>
      )}

      <Card>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="relative flex-1 min-w-52">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"><Icon name="search" size={15} /></span>
            <input
              value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Search decisions, assignees…"
              className="w-full bg-white border border-hairline rounded-xl pl-9 pr-3 py-2.5 text-sm text-ink outline-none focus:border-accent"
            />
          </div>
          <select value={status} onChange={(e) => setStatus(e.target.value)}
            className="bg-white border border-hairline rounded-xl px-3 py-2.5 text-sm text-ink">
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
          <select value={department} onChange={(e) => setDepartment(e.target.value)}
            className="bg-white border border-hairline rounded-xl px-3 py-2.5 text-sm text-ink">
            <option value="">All departments</option>
            {DEPARTMENTS.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-3">{error}</div>}

        <div className="overflow-x-auto nice-scroll -mx-5 px-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] tracking-[0.1em] uppercase text-muted border-b border-hairline">
                <th className="py-2.5 pr-4 font-semibold">Decision</th>
                <th className="py-2.5 pr-4 font-semibold">Responsible</th>
                <th className="py-2.5 pr-4 font-semibold">Department</th>
                <th className="py-2.5 pr-4 font-semibold">Deadline</th>
                <th className="py-2.5 pr-4 font-semibold">Status</th>
                <th className="py-2.5 font-semibold w-20"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} className={`border-b border-hairline/60 ${i % 2 ? 'bg-cream/60' : ''}`}>
                  <td className="py-3 pr-4 max-w-md">
                    <div className="font-medium text-ink">{r.title}</div>
                    {r.description && <div className="text-xs text-muted mt-0.5 line-clamp-2">{r.description}</div>}
                    {r.decided_by && <div className="text-xs text-muted mt-0.5">Decided by {r.decided_by}</div>}
                  </td>
                  <td className="py-3 pr-4 text-ink/85 whitespace-nowrap">{r.assigned_to || '—'}</td>
                  <td className="py-3 pr-4 text-ink/85 whitespace-nowrap">{r.department || 'Hotel-wide'}</td>
                  <td className="py-3 pr-4 whitespace-nowrap">
                    <span className={r.overdue ? 'text-red-600 font-semibold' : 'text-ink/85'}>
                      {r.deadline ? fmtDate(r.deadline) : '—'}
                    </span>
                    {r.overdue && <span className="ml-2"><Pill tone="red">overdue</Pill></span>}
                  </td>
                  <td className="py-3 pr-4">
                    <select
                      value={r.status}
                      onChange={(e) => changeStatus(r, e.target.value)}
                      className="bg-white border border-hairline rounded-lg px-2 py-1.5 text-xs font-medium text-ink"
                      aria-label="Change status"
                    >
                      {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                    </select>
                  </td>
                  <td className="py-3">
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
                <tr><td colSpan={6} className="py-10 text-center text-muted">No decisions match these filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {editing && (
        <DecisionForm initial={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />
      )}
      {deleting && (
        <ConfirmModal
          title="Delete this decision?"
          body={deleting.title}
          onCancel={() => setDeleting(null)}
          onConfirm={async () => { await store.deleteDecision(deleting.id); setDeleting(null); load(); }}
        />
      )}
    </div>
  );
}

function DecisionForm({ initial, onClose, onSaved }) {
  const [form, setForm] = useState({
    title: initial.title ?? '',
    description: initial.description ?? '',
    decided_by: initial.decided_by ?? '',
    assigned_to: initial.assigned_to ?? '',
    department_id: initial.department_id ?? '',
    deadline: initial.deadline ? String(initial.deadline).slice(0, 10) : '',
    status: initial.status ?? 'pending',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = async () => {
    setSaving(true); setError(null);
    try {
      await store.saveDecision({
        ...(initial.id ? { id: initial.id } : {}),
        title: form.title,
        description: form.description || null,
        decided_by: form.decided_by || null,
        assigned_to: form.assigned_to || null,
        department_id: form.department_id ? Number(form.department_id) : null,
        deadline: form.deadline || null,
        status: form.status,
      });
      onSaved();
    } catch (e) { setError(e.message); setSaving(false); }
  };

  return (
    <Modal title={initial.id ? 'Edit decision' : 'Record decision'} onClose={onClose} wide>
      <div className="space-y-4">
        <Field label="Decision">
          <input value={form.title} onChange={set('title')} className={inputCls} placeholder="e.g. Approve weekend promo rate for Deluxe rooms" />
        </Field>
        <Field label="Details">
          <textarea value={form.description} onChange={set('description')} rows={3} className={inputCls}
            placeholder="What was decided, and why?" />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Decided by">
            <input value={form.decided_by} onChange={set('decided_by')} className={inputCls} placeholder="e.g. Maria Clara Santos" />
          </Field>
          <Field label="Responsible (assigned to)">
            <input value={form.assigned_to} onChange={set('assigned_to')} className={inputCls} placeholder="e.g. Ana Patricia Lim" />
          </Field>
          <Field label="Department">
            <select value={form.department_id} onChange={set('department_id')} className={inputCls}>
              <option value="">Hotel-wide</option>
              {DEPARTMENTS.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Deadline">
              <input type="date" value={form.deadline} onChange={set('deadline')} className={inputCls} />
            </Field>
            <Field label="Status">
              <select value={form.status} onChange={set('status')} className={inputCls}>
                {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
            </Field>
          </div>
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 text-sm font-semibold px-4 py-2.5 rounded-xl border border-hairline text-ink hover:border-accent">Cancel</button>
          <button onClick={save} disabled={saving} className="flex-1 text-sm font-semibold px-4 py-2.5 rounded-xl bg-accent text-white hover:bg-accent-dark disabled:opacity-60">
            {saving ? 'Saving…' : 'Save decision'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
