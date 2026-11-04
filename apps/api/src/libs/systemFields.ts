import { ValidationError } from "./errors";

/**
 * Rejects a request body that tries to write fields only the system may set
 * - e.g. a campaign's `status`, which must stay in step with its queued send
 * job. Rejecting (rather than silently dropping) tells the caller what to do
 * instead. Internal callers (workers, the send pipeline) write these fields
 * through the services directly and never pass through this check.
 *
 * @param body - The parsed JSON request body.
 * @param fields - Field names the caller may not set.
 * @param hint - What the caller should do instead, appended to the message.
 * @throws {ValidationError} (-> 400) naming the first offending field.
 */
export function assertNoSystemFields(body: Record<string, unknown>, fields: readonly string[], hint: string): void {
    const field = fields.find((name) => name in body);
    if (field) throw new ValidationError(`${field} is managed by the system and can't be set. ${hint}`);
}
