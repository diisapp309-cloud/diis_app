import { TIME_ZONE } from './config';

const LOCALE = 'en-PK';
const money = new Intl.NumberFormat(LOCALE, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const pkDay = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
});

export const formatMoney = (n) => `Rs ${money.format(Number(n) || 0)}`;

export const formatTime = (ts) =>
  new Date(ts).toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' });

export const formatDateTime = (ts) =>
  new Date(ts).toLocaleString(LOCALE, {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

export const formatDayHeading = (d) =>
  new Date(d).toLocaleDateString(LOCALE, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

// YYYY-MM-DD in the browser's local time.
export function localDayKey(d) {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}

// YYYY-MM-DD in Pakistan time (same rule the database uses for edit locking).
export const pkDayKey = (ts) => pkDay.format(new Date(ts));

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

// Half-open [from, to) range for the day / week (Mon-Sun) / month containing `anchor`.
export function periodRange(mode, anchor) {
  const from = startOfDay(anchor);
  const to = new Date(from);
  if (mode === 'day') {
    to.setDate(to.getDate() + 1);
  } else if (mode === 'week') {
    from.setDate(from.getDate() - ((from.getDay() + 6) % 7));
    to.setTime(from.getTime());
    to.setDate(to.getDate() + 7);
  } else {
    from.setDate(1);
    to.setTime(from.getTime());
    to.setMonth(to.getMonth() + 1);
  }
  return { from, to };
}

export function shiftAnchor(mode, anchor, dir) {
  const d = new Date(anchor);
  if (mode === 'day') d.setDate(d.getDate() + dir);
  else if (mode === 'week') d.setDate(d.getDate() + 7 * dir);
  else { d.setDate(1); d.setMonth(d.getMonth() + dir); }
  return d;
}

export function periodLabel(mode, { from, to }) {
  if (mode === 'day') return formatDayHeading(from);
  if (mode === 'month') return from.toLocaleDateString(LOCALE, { month: 'long', year: 'numeric' });
  const last = new Date(to.getTime() - 1);
  const a = from.toLocaleDateString(LOCALE, { day: 'numeric', month: 'short' });
  const b = last.toLocaleDateString(LOCALE, { day: 'numeric', month: 'short', year: 'numeric' });
  return `${a} – ${b}`;
}

// Value for <input type="datetime-local"> in local time.
export function toDatetimeLocal(d) {
  const x = new Date(d);
  x.setMinutes(x.getMinutes() - x.getTimezoneOffset());
  return x.toISOString().slice(0, 16);
}

export function generatePassword(length = 12) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const buf = new Uint32Array(length);
  crypto.getRandomValues(buf);
  return Array.from(buf, (n) => chars[n % chars.length]).join('');
}
