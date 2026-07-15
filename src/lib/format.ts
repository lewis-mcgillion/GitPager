// Small date/time formatting helpers used across the UI.

/** Coerce input to a valid Date, or null for nullish/unparseable values so
 *  callers render a placeholder instead of "Invalid Date"/"NaN". */
function toDate(d: Date | string | null | undefined): Date | null {
  if (d == null) return null;
  const date = typeof d === "string" ? new Date(d) : d;
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateTime(d: Date | string | null | undefined): string {
  const date = toDate(d);
  if (!date) return "—";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(d: Date | string | null | undefined): string {
  const date = toDate(d);
  if (!date) return "—";
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatTime(d: Date | string | null | undefined): string {
  const date = toDate(d);
  if (!date) return "—";
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export function formatRelative(d: Date | string | null | undefined): string {
  const date = toDate(d);
  if (!date) return "—";
  const diffMs = Date.now() - date.getTime();
  const future = diffMs < 0;
  const abs = Math.abs(diffMs);
  const mins = Math.round(abs / 60000);
  const hours = Math.round(abs / 3600000);
  const days = Math.round(abs / 86400000);

  let text: string;
  if (abs < 45000) text = "just now";
  else if (mins < 60) text = `${mins}m`;
  else if (hours < 24) text = `${hours}h`;
  else text = `${days}d`;

  if (text === "just now") return text;
  return future ? `in ${text}` : `${text} ago`;
}

/** Human-friendly duration for a number of seconds (e.g. rotation length). */
export function formatDurationSeconds(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0 min";
  if (seconds % (7 * 86400) === 0) {
    const w = seconds / (7 * 86400);
    return w === 1 ? "1 week" : `${w} weeks`;
  }
  if (seconds % 86400 === 0) {
    const d = seconds / 86400;
    return d === 1 ? "1 day" : `${d} days`;
  }
  if (seconds % 3600 === 0) {
    const h = seconds / 3600;
    return h === 1 ? "1 hour" : `${h} hours`;
  }
  const m = Math.round(seconds / 60);
  return `${m} min`;
}
