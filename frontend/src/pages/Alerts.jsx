// src/pages/Alerts.jsx — Operational alerts and notifications from
// across the hotel (occupancy, inventory, maintenance, housekeeping,
// finance, guest feedback), plus manual announcements from Management.

import { useEffect, useState } from 'react';
import { store } from '../lib/store';
import { fmtDateTime } from '../lib/format';
import { Card, Modal, Field, inputCls, Pill } from '../components/widgets';
import { Icon } from '../components/icons';
import { ConfirmModal } from './Budgets';

const SEVERITY_STYLE = {
  critical: 'bg-red-100 text-red-600',
  warning: 'bg-amber-100 text-amber-600',
  info: 'bg-pill text-accent-dark',
};
const SOURCES = ['Management', 'Occupancy', 'Inventory', 'Maintenance', 'Housekeeping', 'Finance', 'Guest feedback', 'System'];

export function Alerts() {
  const [rows, setRows] = useState([]);
  const [unread, setUnread] = useState(0);
  const [status, setStatus] = useState('');
  const [severity, setSeverity] = useState('');
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [error, setError] = useState(null);

  const load = () => {
    setError(null);
    store.getAlerts({ status: status || undefined, severity: severity || undefined })
      .then((r) => { setRows(r.data); setUnread(r.unread ?? 0); })
      .catch((e) => setError(e.message));
  };
  useEffect(load, [status, severity]);

  const act = async (fn) => { await fn(); load(); };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Operational Alerts</h1>
          <p className="text-sm text-muted mt-1">
            {unread} unread · alerts raised by hotel operations and by the management team.
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent-dark"
        >
          <Icon name="plus" size={15} /> New alert
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex bg-white border border-hairline rounded-xl p-1 gap-1">
          {[['', 'All'], ['unread', 'Unread'], ['read', 'Read'], ['resolved', 'Resolved']].map(([id, label]) => (
            <button
              key={id} onClick={() => setStatus(id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${status === id ? 'bg-pill text-accent-dark' : 'text-muted hover:text-ink'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <select value={severity} onChange={(e) => setSeverity(e.target.value)}
          className="bg-white border border-hairline rounded-xl px-3 py-2 text-xs font-medium text-ink">
          <option value="">All severities</option>
          {['info', 'warning', 'critical'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-3">{error}</div>}

      <div className="space-y-3">
        {rows.map((a) => (
          <Card key={a.id} className={`flex gap-4 ${a.status === 'resolved' ? 'opacity-70' : ''}`}>
            <span className={`w-10 h-10 rounded-xl grid place-items-center shrink-0 ${SEVERITY_STYLE[a.severity] || SEVERITY_STYLE.info}`}>
              <Icon name="bell" size={18} />
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-ink">{a.title}</span>
                {a.status === 'unread' && <span className="w-2 h-2 rounded-full bg-accent" />}
                <Pill tone={a.severity === 'critical' ? 'red' : a.severity === 'warning' ? 'amber' : 'pink'}>{a.severity}</Pill>
                <Pill>{a.status}</Pill>
              </div>
              {a.message && <p className="text-sm text-ink/85 mt-1">{a.message}</p>}
              <div className="text-xs text-muted mt-1.5">{a.source} · {fmtDateTime(a.created_at)}</div>
            </div>
            <div className="flex flex-col sm:flex-row gap-1.5 shrink-0">
              {a.status === 'unread' && (
                <button onClick={() => act(() => store.setAlertStatus(a.id, 'read'))}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-hairline text-xs font-semibold text-ink hover:border-accent">
                  <Icon name="eye" size={13} /> Mark read
                </button>
              )}
              {a.status !== 'resolved' && (
                <button onClick={() => act(() => store.setAlertStatus(a.id, 'resolved'))}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-pill text-accent-dark text-xs font-semibold hover:bg-blush">
                  <Icon name="check" size={13} /> Resolve
                </button>
              )}
              <button onClick={() => setDeleting(a)}
                className="p-1.5 rounded-lg text-muted hover:text-red-600 hover:bg-red-50 self-start" title="Delete">
                <Icon name="trash" size={15} />
              </button>
            </div>
          </Card>
        ))}
        {!rows.length && !error && (
          <Card className="text-center text-muted text-sm py-12">No alerts match these filters.</Card>
        )}
      </div>

      {creating && (
        <AlertForm onClose={() => setCreating(false)} onSaved={() => { setCreating(false); load(); }} />
      )}
      {deleting && (
        <ConfirmModal
          title="Delete this alert?"
          body={deleting.title}
          onCancel={() => setDeleting(null)}
          onConfirm={async () => { await store.deleteAlert(deleting.id); setDeleting(null); load(); }}
        />
      )}
    </div>
  );
}

function AlertForm({ onClose, onSaved }) {
  const [form, setForm] = useState({ title: '', message: '', severity: 'info', source: 'Management' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = async () => {
    setSaving(true); setError(null);
    try {
      await store.createAlert(form);
      onSaved();
    } catch (e) { setError(e.message); setSaving(false); }
  };

  return (
    <Modal title="New alert / announcement" onClose={onClose}>
      <div className="space-y-4">
        <Field label="Title">
          <input value={form.title} onChange={set('title')} className={inputCls} placeholder="e.g. Staff meeting moved to 3 PM" />
        </Field>
        <Field label="Message">
          <textarea value={form.message} onChange={set('message')} rows={3} className={inputCls} placeholder="Details for the departments…" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Severity">
            <select value={form.severity} onChange={set('severity')} className={inputCls}>
              {['info', 'warning', 'critical'].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Source">
            <select value={form.source} onChange={set('source')} className={inputCls}>
              {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 text-sm font-semibold px-4 py-2.5 rounded-xl border border-hairline text-ink hover:border-accent">Cancel</button>
          <button onClick={save} disabled={saving} className="flex-1 text-sm font-semibold px-4 py-2.5 rounded-xl bg-accent text-white hover:bg-accent-dark disabled:opacity-60">
            {saving ? 'Posting…' : 'Post alert'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
