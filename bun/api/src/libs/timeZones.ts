import { ValidationError } from "./errors";

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

/**
 * Rejects a body whose `timezone` field is present but not a known IANA
 * time zone. A body without the field passes untouched.
 *
 * @param body - The parsed request body.
 * @throws {ValidationError} (-> 400) naming the bad value.
 */
export function assertValidTimeZoneField(body: Record<string, unknown>): void {
    if ("timezone" in body && !isValidTimeZone(body.timezone)) {
        throw new ValidationError(`Unknown time zone "${String(body.timezone)}". Use an IANA name such as "Europe/London" or "UTC".`);
    }
}
