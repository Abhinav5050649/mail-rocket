/** Time zone a fresh organization starts in, until someone picks theirs. */
export const DEFAULT_TIME_ZONE = "UTC";

/**
 * Whether `value` is an IANA time zone name the runtime knows (e.g.
 * "Europe/London", "Asia/Kolkata", "UTC"). Asks `Intl` directly rather than
 * keeping a list, so it stays in step with the runtime's tz database.
 *
 * @param value - Candidate time zone name.
 * @returns true if `Intl.DateTimeFormat` accepts it.
 */
export function isValidTimeZone(value: unknown): value is string {
    if (typeof value !== "string" || value.trim() === "") return false;
    try {
        new Intl.DateTimeFormat("en-US", { timeZone: value });
        return true;
    } catch {
        return false;
    }
}
