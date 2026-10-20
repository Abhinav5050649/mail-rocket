/**
 * Display formatting shared by every screen, so a date or a count reads the
 * same way everywhere. Dates render in the viewer's local time zone.
 */

const numberFormat = new Intl.NumberFormat("en-GB");
const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });
const dateTimeFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const weekdayFormat = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" });
const timeFormat = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" });

/** "12,408". */
export const formatCount = (value: number) => numberFormat.format(value);

/** "23 Oct 2026". */
export const formatDate = (iso: string) => dateFormat.format(new Date(iso));

/** "23 Oct 2026, 09:00". */
export const formatDateTime = (iso: string) => dateTimeFormat.format(new Date(iso));

/** "Thu 23 Oct". */
export const formatWeekday = (iso: string) => weekdayFormat.format(new Date(iso));

/** "09:00". */
export const formatTime = (iso: string) => timeFormat.format(new Date(iso));

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Distance from now in the largest two units: "in 2 d 4 h", "in 35 min",
 * "3 d ago". Under a minute either way reads "now".
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

/** Converts an ISO string to the `YYYY-MM-DDTHH:mm` a datetime-local input expects, in local time. */
export function toDateTimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  const offset = date.getTimezoneOffset() * MINUTE;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

/** Converts a datetime-local value back to an ISO string, or undefined when empty. */
export function fromDateTimeLocal(value: string | undefined): string | undefined {
  return value ? new Date(value).toISOString() : undefined;
}
