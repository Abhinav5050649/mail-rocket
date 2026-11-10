/**
 * Builds the value SES gets as a campaign email's From address, with the
 * optional display name (`"Mail Rocket" <notifications@example.com>`).
 * Which email address a campaign sends from is decided by `senderEmail` in
 * @mail-rocket/shared; this only formats it for the mail header.
 */

/**
 * Formats a From header value.
 *
 * A plain ASCII name is quoted, with `\` and `"` escaped, so commas and other
 * specials in it can't be read as part of the address. A name with any
 * non-ASCII character (an accent, an emoji) is MIME-encoded as UTF-8
 * (RFC 2047), the form SES requires for it.
 *
 * @param email - The address the campaign sends from.
 * @param name - Display name for the sender, or null/empty to send the bare address.
 * @returns `email` alone, or `"name" <email>` / `=?UTF-8?B?...?= <email>`.
 */
export function formatFromAddress(email: string, name: string | null): string {
    // No name: the address alone is a valid From value.
    if (!name) return email;

    // Every character is printable ASCII, so a quoted string carries it as is.
    if (/^[\x20-\x7E]*$/.test(name)) {
        // Inside a quoted string only the backslash and the quote need escaping.
        const quoted = name.replace(/[\\"]/g, (character) => `\\${character}`);
        return `"${quoted}" <${email}>`;
    }

    // Anything else goes in a base64 encoded-word, which every mail client decodes back to UTF-8.
    const encoded = Buffer.from(name, "utf8").toString("base64");
    return `=?UTF-8?B?${encoded}?= <${email}>`;
}
