import { isValidTimeZone } from "@mail-rocket/shared";
import { ValidationError } from "./errors";

/** The default zone and the IANA check are shared with the web app. */
export { DEFAULT_TIME_ZONE, isValidTimeZone } from "@mail-rocket/shared";

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
