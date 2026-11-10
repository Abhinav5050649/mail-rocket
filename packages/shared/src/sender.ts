import type { IdentityType } from "./resources";

/**
 * Who a campaign's email comes from. A campaign sends through one SES
 * identity, and the From address depends on that identity's type:
 *
 * - `email` identity (`news@example.com`): the From address is the identity
 *   itself, so the campaign must not set `from_local_part`.
 * - `domain` identity (`example.com`): SES may send from any address on the
 *   domain, so the campaign names the part before the `@`
 *   (`from_local_part: "notifications"` -> `notifications@example.com`).
 *
 * Either type can add a display name (`from_name`), which inboxes show in
 * place of the bare address. The API enforces these rules when a campaign is
 * saved and again when it sends; the web app uses the same rules to validate
 * its form, so both sides agree on what is accepted.
 */

/** Longest local part an email address may have (RFC 5321, section 4.5.3.1.1). */
export const FROM_LOCAL_PART_MAX_LENGTH = 64;

/** Longest display name accepted, so the From header stays a sensible length. */
export const FROM_NAME_MAX_LENGTH = 64;

/**
 * A plain ASCII local part: letters, digits and `. _ % + -`, never starting
 * or ending with a dot and never with two dots in a row. Narrower than
 * RFC 5322 allows, on purpose: these are the characters every mail system
 * handles without quoting.
 */
export const FROM_LOCAL_PART_PATTERN = /^[A-Za-z0-9_%+-]+(\.[A-Za-z0-9_%+-]+)*$/;

/** The identity fields that decide a campaign's From address. */
export interface SenderIdentity {
    /** `email` or `domain`. */
    type: IdentityType;
    /** The verified address (`news@example.com`) or domain (`example.com`). */
    identity: string;
}

/**
 * Explains what's wrong with a campaign's sender settings, if anything.
 *
 * @param identityType - Type of the campaign's sending identity.
 * @param fromLocalPart - The campaign's `from_local_part` (null when unset).
 * @param fromName - The campaign's `from_name` (null when unset).
 * @returns A message fit to show the user, or `null` when the settings are valid.
 */
export function senderProblem(identityType: IdentityType, fromLocalPart: string | null, fromName: string | null): string | null {
    // A domain identity has no address of its own, so the campaign must supply one.
    if (identityType === "domain" && !fromLocalPart) {
        return "A campaign sending from a domain needs a From address (the part before the @).";
    }
    // An email identity already is the address; a second one would contradict it.
    if (identityType === "email" && fromLocalPart) {
        return "A campaign sending from an email identity can't set its own From address.";
    }
    // Only a domain identity reaches here with a local part, so check its shape.
    if (fromLocalPart) {
        if (fromLocalPart.length > FROM_LOCAL_PART_MAX_LENGTH) {
            return `The From address can be at most ${FROM_LOCAL_PART_MAX_LENGTH} characters before the @.`;
        }
        if (!FROM_LOCAL_PART_PATTERN.test(fromLocalPart)) {
            return "The From address can only use letters, digits and . _ % + - (no spaces, and no dot at the start, at the end or twice in a row).";
        }
    }
    // The display name goes into a mail header, where a line break would start a new header.
    if (fromName) {
        if (fromName.length > FROM_NAME_MAX_LENGTH) {
            return `The sender name can be at most ${FROM_NAME_MAX_LENGTH} characters.`;
        }
        if (/[\r\n]/.test(fromName)) {
            return "The sender name can't contain line breaks.";
        }
    }
    return null;
}

/**
 * The email address a campaign sends from.
 *
 * @param identity - The campaign's sending identity.
 * @param fromLocalPart - The campaign's `from_local_part` (null when unset).
 * @returns The From address, or `null` when a domain identity has no local part yet.
 */
export function senderEmail(identity: SenderIdentity, fromLocalPart: string | null): string | null {
    // An email identity sends from itself.
    if (identity.type === "email") return identity.identity;
    // A domain identity sends from <local part>@<domain>, once the local part is set.
    return fromLocalPart ? `${fromLocalPart}@${identity.identity}` : null;
}
