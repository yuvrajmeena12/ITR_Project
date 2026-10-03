const dateFmt = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
const dateTimeFmt = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
});
const timeFmt = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });

export const formatDate = (d) => (d ? dateFmt.format(new Date(d)) : '');
export const formatDateTime = (d) => (d ? dateTimeFmt.format(new Date(d)) : '');
export const formatTime = (d) => (d ? timeFmt.format(new Date(d)) : '');

export function timeAgo(d) {
  const s = Math.max(0, Math.floor((Date.now() - new Date(d).getTime()) / 1000));
  if (s < 45) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${Math.max(m, 1)}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(d);
}

export const initials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('') || '?';

export const levelLabel = (l) => (l ? l.charAt(0).toUpperCase() + l.slice(1) : '');

export const STATUS_LABEL = {
  pending: 'Pending',
  accepted: 'Accepted',
  rejected: 'Declined',
  scheduled: 'Scheduled',
  in_progress: 'Awaiting confirmation',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

// value for <input type="datetime-local"> -> ISO string (UTC) for the API
export const localInputToIso = (v) => (v ? new Date(v).toISOString() : '');

export function minLocalInput(minutesAhead = 10) {
  const d = new Date(Date.now() + minutesAhead * 60000);
  d.setSeconds(0, 0);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
