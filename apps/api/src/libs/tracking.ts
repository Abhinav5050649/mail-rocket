import { createHmac } from "node:crypto";
import { config } from "../../config";

/**
 * Signs a click-tracking link, so `/track/click` only redirects to URLs this
 * API itself put in an email and can't be abused as an open redirect.
 *
 * @param deliveryId - id of the `campaign_delivery` row the link was sent to.
 * @param url - the link's real destination.
 * @returns The signature, as base64url.
 */
export const signTrackingLink = (deliveryId: string, url: string): string =>
    createHmac("sha256", config.trackingSecret).update(`${deliveryId}:${url}`).digest("base64url");

/**
 * Adds open and click tracking to one subscriber's rendered email: every
 * absolute `http(s)` link is routed through `/track/click`, and a 1x1 pixel
 * pointing at `/track/open` goes before `</body>` (or at the end). Returns
 * the HTML untouched when `PUBLIC_API_URL` isn't set.
 *
 * @param html - the subscriber's rendered email body.
 * @param deliveryId - id of the `campaign_delivery` row being sent.
 * @returns The HTML with tracking added.
 */
export const addTracking = (html: string, deliveryId: string): string => {
    if (!config.publicApiUrl) return html;

    const base = `${config.publicApiUrl}/track`;

    // Hrefs are HTML-escaped in the source, so unescape `&amp;` to get the URL a browser would follow.
    const tracked = html.replace(/href=(["'])(https?:\/\/.*?)\1/gi, (_match, quote: string, href: string) => {
        const url = href.replaceAll("&amp;", "&");
        const query = `url=${encodeURIComponent(url)}&amp;sig=${signTrackingLink(deliveryId, url)}`;
        return `href=${quote}${base}/click/${deliveryId}?${query}${quote}`;
    });

    const pixel = `<img src="${base}/open/${deliveryId}" width="1" height="1" alt="" style="border:0">`;
    return /<\/body>/i.test(tracked) ? tracked.replace(/<\/body>/i, `${pixel}</body>`) : tracked + pixel;
};
