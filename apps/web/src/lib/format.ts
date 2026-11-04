import { browserTimeZone, wallTimeToInstant, zonedParts } from "./timezone";

/**
 * Display formatting shared by every screen, so a date or a count reads the
 * same way everywhere. Dates render in the organization's time zone, which
 * the app shell sets once with `setDisplayTimeZone` before any page renders
 * (and re-mounts the page when it changes).
 */

let displayTimeZone = typeof Intl !== "undefined" ? browserTimeZone() : "UTC";

/** Sets the zone every formatter below uses. Called by the app shell's time zone gate. */
export function setDisplayTimeZone(timeZone: string) {
  displayTimeZone = timeZone;
}

/** The zone dates are currently shown in. */
export const getDisplayTimeZone = () => displayTimeZone;

const numberFormat = new Intl.NumberFormat("en-GB");
const dateFormatters = new Map<string, Intl.DateTimeFormat>();

/** A cached en-GB formatter for `options` in the display zone. */
function formatter(name: string, options: Intl.DateTimeFormatOptions) {
  const key = `${name}|${displayTimeZone}`;
  let cached = dateFormatters.get(key);
  if (!cached) {
    cached = new Intl.DateTimeFormat("en-GB", { ...options, timeZone: displayTimeZone });
    dateFormatters.set(key, cached);
  }
  return cached;
}

/** "12,408". */
export const formatCount = (value: number) => numberFormat.format(value);

/** "23 Oct 2026". */
export const formatDate = (iso: string) => formatter("date", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));

/** "23 Oct 2026, 09:00". */
export const formatDateTime = (iso: string) =>
  formatter("datetime", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso));

/** "Thu 23 Oct". */
export const formatWeekday = (iso: string) => formatter("weekday", { weekday: "short", day: "numeric", month: "short" }).format(new Date(iso));

/** "09:00". */
export const formatTime = (iso: string) => formatter("time", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso));

/** "IST", "GMT+1", "UTC": the zone's short name right now. */
export const formatZoneName = (date = new Date()) =>
  // en-US knows the common abbreviations ("EDT", "IST"); en-GB would say "GMT-4".
  new Intl.DateTimeFormat("en-US", { timeZone: displayTimeZone, timeZoneName: "short" })
    .formatToParts(date)
    .find((part) => part.type === "timeZoneName")?.value ?? displayTimeZone;

/** "2026-10-23": the calendar day an instant falls on in the display zone, for grouping by day. */
export function dayKey(date: Date): string {
  const { year, month, day } = zonedParts(date, displayTimeZone);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Distance from now in the largest two units: "in 2 d 4 h", "in 35 min",
 * "3 d ago". Under a minute either way reads "now". Zone-independent.
 */
export function formatRelative(iso: string, now = Date.now()): string {
  const diff = new Date(iso).getTime() - now;
  const abs = Math.abs(diff);
  let text: string;
  if (abs < MINUTE) return "now";
  if (abs < HOUR) text = `${Math.round(abs / MINUTE)} min`;
  else if (abs < DAY) {
    const hours = Math.floor(abs / HOUR);
    const minutes = Math.round((abs % HOUR) / MINUTE);
    text = minutes ? `${hours} h ${minutes} min` : `${hours} h`;
  } else {
    const days = Math.floor(abs / DAY);
    const hours = Math.round((abs % DAY) / HOUR);
    text = hours && days < 7 ? `${days} d ${hours} h` : `${days} d`;
  }
  return diff > 0 ? `in ${text}` : `${text} ago`;
}

/** "Ada Lovelace", or null when neither name is set. */
export function fullName(person: { first_name: string | null; last_name: string | null }): string | null {
  return [person.first_name, person.last_name].filter(Boolean).join(" ") || null;
}

/** "draft" -> "Draft". */
export const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

/** "1 campaign" / "3 campaigns". */
export const plural = (count: number, singular: string, pluralForm = `${singular}s`) =>
  `${formatCount(count)} ${count === 1 ? singular : pluralForm}`;

const pad = (value: number) => String(value).padStart(2, "0");

/** An instant as the `YYYY-MM-DDTHH:mm` a datetime-local input expects, in the display zone. */
export function toDateTimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const p = zonedParts(new Date(iso), displayTimeZone);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

/** A datetime-local value, read as wall-clock time in the display zone, back to an ISO instant; undefined when empty or invalid. */
export function fromDateTimeLocal(value: string | undefined): string | undefined {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!match) return undefined;
  const [, year, month, day, hour, minute] = match.map(Number) as number[];
  return wallTimeToInstant({ year: year!, month: month!, day: day!, hour: hour!, minute: minute! }, displayTimeZone).toISOString();
}
