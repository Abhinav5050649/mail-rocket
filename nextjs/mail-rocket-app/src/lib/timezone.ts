/**
 * Time zone arithmetic with `Intl` only (no date library). Timestamps from
 * the API are absolute instants; these helpers read them as wall-clock time
 * in an IANA zone, and turn wall-clock input back into instants.
 */

export interface ZonedParts {
  year: number;
  /** 1-12. */
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const partsFormatters = new Map<string, Intl.DateTimeFormat>();

/** Cached numeric formatter for `timeZone`, used to read wall-clock parts. */
function partsFormatter(timeZone: string) {
  let formatter = partsFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    });
    partsFormatters.set(timeZone, formatter);
  }
  return formatter;
}

/** The wall-clock date and time of `date` in `timeZone`. */
export function zonedParts(date: Date, timeZone: string): ZonedParts {
  const parts: Record<string, number> = {};
  for (const part of partsFormatter(timeZone).formatToParts(date)) {
    if (part.type !== "literal") parts[part.type] = Number(part.value);
  }
  return { year: parts.year!, month: parts.month!, day: parts.day!, hour: parts.hour! % 24, minute: parts.minute!, second: parts.second! };
}

/** How far `timeZone` is ahead of UTC at `date`, in milliseconds (negative when behind). */
export function offsetMs(date: Date, timeZone: string): number {
  const p = zonedParts(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/**
 * The instant at which `timeZone`'s clocks show the given wall-clock time.
 * Tries the offsets in force half a day either side, so DST changes resolve
 * predictably: a repeated time (autumn) takes its first occurrence, and a
 * skipped time (spring) moves forward by the gap, as clocks do.
 */
export function wallTimeToInstant(wall: Omit<ZonedParts, "second"> & { second?: number }, timeZone: string): Date {
  const asUtc = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute, wall.second ?? 0);
  const halfDay = 12 * 3_600_000;
  const candidates = [offsetMs(new Date(asUtc - halfDay), timeZone), offsetMs(new Date(asUtc + halfDay), timeZone)].map((offset) => asUtc - offset);
  const shows = (instant: number) => {
    const p = zonedParts(new Date(instant), timeZone);
    return p.year === wall.year && p.month === wall.month && p.day === wall.day && p.hour === wall.hour && p.minute === wall.minute;
  };
  const valid = candidates.filter(shows);
  return new Date(valid.length > 0 ? Math.min(...valid) : Math.max(...candidates));
}

/** "UTC+05:30", "UTC−08:00", "UTC" for `timeZone` at `date`. */
export function offsetLabel(timeZone: string, date = new Date()): string {
  const minutes = Math.round(offsetMs(date, timeZone) / 60_000);
  if (minutes === 0) return "UTC";
  const sign = minutes > 0 ? "+" : "−";
  const abs = Math.abs(minutes);
  return `UTC${sign}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;
}

/** The browser's own zone, e.g. "Europe/London". */
export const browserTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

/** Every IANA zone the browser knows, with UTC first. */
export function listTimeZones(): string[] {
  const zones = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [];
  return ["UTC", ...zones.filter((zone) => zone !== "UTC")];
}
