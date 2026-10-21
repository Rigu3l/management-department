// src/lib/format.js — display formatting + period math that mirrors
// backend/config/bootstrap.php (period_range / prev_period).

const pesoFmt = new Intl.NumberFormat('en-PH', {
  style: 'currency', currency: 'PHP', maximumFractionDigits: 0,
});
const peso2Fmt = new Intl.NumberFormat('en-PH', {
  style: 'currency', currency: 'PHP', minimumFractionDigits: 2, maximumFractionDigits: 2,
});
const numFmt = new Intl.NumberFormat('en-PH');

export const peso = (v) => (v == null || isNaN(v) ? '—' : pesoFmt.format(Number(v)));
export const peso2 = (v) => (v == null || isNaN(v) ? '—' : peso2Fmt.format(Number(v)));
export const num = (v) => (v == null || isNaN(v) ? '—' : numFmt.format(Number(v)));
export const pct = (v) => (v == null || isNaN(v) ? '—' : `${Number(v).toFixed(1)}%`);
export const rating = (v) => (v == null || isNaN(v) ? '—' : `${Number(v).toFixed(2)} / 5`);

export function fmtVal(value, format) {
  if (value == null) return '—';
  switch (format) {
    case 'money': return peso2(value);
    case 'pct': return pct(value);
    case 'rating': return rating(value);
    case 'num': return num(value);
    default:
      if (typeof value === 'number') return Number.isInteger(value) ? num(value) : value.toFixed(2);
      return String(value).replaceAll('_', ' ');
  }
}

export const toISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const todayISO = () => toISO(new Date());

export function addDays(iso, n) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

// Same rules as the PHP presets: daily = today; weekly = 7 days ending
// today; monthly = calendar month to date; yearly = Jan 1 to today.
export function periodRange(preset, custom) {
  const today = todayISO();
  if (preset === 'custom' && custom?.from && custom?.to) {
    return { from: custom.from, to: custom.to, period: 'custom' };
  }
  switch (preset) {
    case 'daily':
      return { from: today, to: today, period: 'daily' };
    case 'yearly':
      return { from: `${today.slice(0, 4)}-01-01`, to: today, period: 'yearly' };
    case 'monthly':
      return { from: `${today.slice(0, 7)}-01`, to: today, period: 'monthly' };
    case 'weekly':
    default:
      return { from: addDays(today, -6), to: today, period: 'weekly' };
  }
}

export function prevPeriod(from, to) {
  const days = Math.round((new Date(to) - new Date(from)) / 86400000) + 1;
  const pto = addDays(from, -1);
  return { from: addDays(pto, -(days - 1)), to: pto };
}

export function monthRange(month) {
  // month = 'YYYY-MM'
  const from = `${month}-01`;
  const d = new Date(`${from}T00:00:00`);
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  return { from, to: toISO(d) };
}

export const fmtDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00`);
  return isNaN(d) ? String(iso) : d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const fmtDateTime = (iso) => {
  if (!iso) return '—';
  const d = new Date(String(iso).replace(' ', 'T'));
  return isNaN(d) ? String(iso) : d.toLocaleString('en-PH', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
};

export const periodLabel = ({ from, to }) =>
  from === to ? fmtDate(from) : `${fmtDate(from)} – ${fmtDate(to)}`;
