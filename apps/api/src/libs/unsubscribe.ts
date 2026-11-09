import { config } from "../../config";

/**
 * The unsubscribe link for one sent email: `/unsubscribe/:delivery_id` on
 * the public API. The delivery id is a random UUID that only appears in that
 * subscriber's email, so it needs no signature.
 *
 * @param deliveryId - id of the `campaign_delivery` row being sent.
 * @returns The URL, or `null` when `PUBLIC_API_URL` isn't set (nothing public to link to).
 */
export const unsubscribeUrl = (deliveryId: string): string | null =>
    config.publicApiUrl ? `${config.publicApiUrl}/unsubscribe/${deliveryId}` : null;

/**
 * Adds a small "Unsubscribe" footer to one subscriber's rendered email,
 * before `</body>` (or at the end). Runs after `addTracking`, so this link
 * is never routed through click tracking. Returns the HTML untouched when
 * `PUBLIC_API_URL` isn't set.
 *
 * @param html - the subscriber's rendered email body.
 * @param deliveryId - id of the `campaign_delivery` row being sent.
 * @returns The HTML with the footer added.
 */
export const addUnsubscribeFooter = (html: string, deliveryId: string): string => {
    const url = unsubscribeUrl(deliveryId);
    if (!url) return html;

    const footer = `<p style="margin-top:32px;font-size:12px;color:#686d70;text-align:center">Don't want these emails? <a href="${url}" style="color:#686d70">Unsubscribe</a></p>`;
    return /<\/body>/i.test(html) ? html.replace(/<\/body>/i, `${footer}</body>`) : html + footer;
};
