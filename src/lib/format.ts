/** Helpers to format dates, GPS coords, and labels for the UI. */

/** Active locale for date/time formatting; kept in sync by the i18n layer. */
let _loc = 'en-US';
const isEs = () => _loc.toLowerCase().startsWith('es');

/** Set the locale used by all date/time formatters (called from i18n). */
export function setDateLocale(lang: string): void {
  _loc = lang.toLowerCase().startsWith('es') ? 'es-US' : 'en-US';
}

export function formatDate(d: number | string | Date): string {
  const date = typeof d === 'object' ? d : new Date(d);
  return date.toLocaleDateString(_loc, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateLong(d: number | string | Date): string {
  const date = typeof d === 'object' ? d : new Date(d);
  return date.toLocaleDateString(_loc, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(d: number | string | Date): string {
  const date = typeof d === 'object' ? d : new Date(d);
  return date.toLocaleString(_loc, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatTime(d: number | string | Date): string {
  const date = typeof d === 'object' ? d : new Date(d);
  return date.toLocaleTimeString(_loc, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function relativeDate(d: number | string | Date): string {
  const date = typeof d === 'object' ? d : new Date(d);
  const now = new Date();
  const startOfDay = (x: Date) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round(
    (startOfDay(now) - startOfDay(date)) / (1000 * 60 * 60 * 24),
  );
  if (diffDays === 0)
    return `${isEs() ? 'Hoy' : 'Today'} · ${formatTime(date)}`;
  if (diffDays === 1) return isEs() ? 'Ayer' : 'Yesterday';
  if (diffDays > 1 && diffDays < 7) return formatDate(date);
  return date.toLocaleDateString(_loc, { month: 'short', day: 'numeric' });
}

export function formatGps(lat: number, lng: number): string {
  const ns = lat >= 0 ? 'N' : 'S';
  const ew = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)}° ${ns} · ${Math.abs(lng).toFixed(4)}° ${ew}`;
}

export function shortReportId(id: string): string {
  // Take last 4 hex chars (or whole id if short).
  const tail = id.replace(/-/g, '').slice(-4).toUpperCase();
  return `KT-${new Date().getFullYear()}-${tail}`;
}

export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .toUpperCase();
}
