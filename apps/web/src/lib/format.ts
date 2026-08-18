/**
 * The API identifies concepts by id. Until course content carries learner-facing concept
 * titles, the interface renders a readable form of the id rather than inventing a name.
 */
export function humaniseId(id: string): string {
  const words = id.replaceAll("-", " ").replaceAll("_", " ").trim();
  return words.charAt(0).toLocaleUpperCase() + words.slice(1);
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

export function formatCurrent(amperes: number): string {
  if (Math.abs(amperes) < 1) return `${Math.round(amperes * 1000)} mA`;
  return `${amperes.toFixed(2)} A`;
}

export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Wording for a saved-at timestamp. Kept plain so the autosave line reads as a fact. */
export function formatSavedAt(isoTimestamp: string | null, now: number = Date.now()): string {
  if (!isoTimestamp) return "Not saved yet";
  const elapsed = now - Date.parse(isoTimestamp);
  if (!Number.isFinite(elapsed)) return "Not saved yet";
  if (elapsed < MINUTE) return "Saved just now";
  if (elapsed < HOUR) {
    const minutes = Math.round(elapsed / MINUTE);
    return `Saved ${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
  }
  if (elapsed < DAY) {
    const hours = Math.round(elapsed / HOUR);
    return `Saved ${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  }
  const days = Math.round(elapsed / DAY);
  return `Saved ${days} ${days === 1 ? "day" : "days"} ago`;
}

export function formatDueDate(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) return "an unknown date";
  return date.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
}

export function formatInterval(days: number): string {
  if (days < 1) {
    const hours = Math.max(1, Math.round(days * 24));
    return `${hours} ${hours === 1 ? "hour" : "hours"}`;
  }
  const rounded = Math.round(days);
  return `${rounded} ${rounded === 1 ? "day" : "days"}`;
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]?.charAt(0) ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.charAt(0) ?? "") : "";
  return `${first}${last}`.toLocaleUpperCase();
}
