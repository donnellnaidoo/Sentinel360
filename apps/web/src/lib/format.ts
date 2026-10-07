// Dates in the console are always shown in South African time: dockets,
// arrest times and court dates are legal records, so they must read the
// same for every officer regardless of their device's timezone.
const TIME_ZONE = "Africa/Johannesburg";

const dateTimeFormat = new Intl.DateTimeFormat("en-ZA", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: TIME_ZONE,
});
const dateFormat = new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeZone: TIME_ZONE });
const relativeFormat = new Intl.RelativeTimeFormat("en-ZA", { numeric: "auto" });
const randFormat = new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" });

type DateInput = Date | string | number;

function toDate(value: DateInput): Date {
  return value instanceof Date ? value : new Date(value);
}

/** "1 Oct 2026, 14:05" */
export function formatDateTime(value: DateInput): string {
  return dateTimeFormat.format(toDate(value));
}

/** "1 Oct 2026" */
export function formatDate(value: DateInput): string {
  return dateFormat.format(toDate(value));
}

const RELATIVE_UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ["year", 365 * 24 * 60 * 60 * 1000],
  ["month", 30 * 24 * 60 * 60 * 1000],
  ["week", 7 * 24 * 60 * 60 * 1000],
  ["day", 24 * 60 * 60 * 1000],
  ["hour", 60 * 60 * 1000],
  ["minute", 60 * 1000],
];

/** "in 5 hours", "2 days ago", "just now" */
export function formatRelative(value: DateInput, now: number = Date.now()): string {
  const diff = toDate(value).getTime() - now;
  for (const [unit, ms] of RELATIVE_UNITS) {
    if (Math.abs(diff) >= ms) {
      return relativeFormat.format(Math.round(diff / ms), unit);
    }
  }
  return "just now";
}

export function formatRand(amount: number | string): string {
  return randFormat.format(Number(amount));
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Fallback label for an enum with no explicit mapping: "SCHEDULE_5" -> "Schedule 5". */
export function humanizeEnum(value: string): string {
  const spaced = value.replace(/_/g, " ").toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * Value for an <input type="datetime-local"> showing `value` in SAST.
 * (datetime-local has no timezone, so build the wall-clock string by hand.)
 */
export function toDateTimeLocalValue(value: DateInput): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(toDate(value));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

/** Parse a datetime-local value entered as SAST wall-clock time (UTC+2, no DST). */
export function fromDateTimeLocal(value: string): Date {
  return new Date(`${value}:00+02:00`);
}
