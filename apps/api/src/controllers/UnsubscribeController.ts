import type { Context } from "hono";
import { logger } from "../libs";
import { OrganizationService, SubscriberService } from "../services";

/**
 * A minimal standalone HTML page. Subscribers reach these from an email, in
 * a browser, so they get a page rather than JSON. `message` must already be
 * HTML-safe.
 */
const page = (title: string, message: string, form = "") => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title></head>
<body style="margin:0;padding:64px 16px;font-family:system-ui,sans-serif;background:#eff3f3;color:#131416">
<main style="max-width:420px;margin:0 auto;padding:32px;background:#fff;border:1px solid #e4e8e9;border-radius:8px">
<h1 style="margin:0 0 8px;font-size:22px">${title}</h1><p style="margin:0;color:#565b5d">${message}</p>${form}
</main></body></html>`;

/** Escapes text for HTML, for the organization name shown on the pages. */
const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

/**
 * HTTP layer for `/unsubscribe`: where an email's unsubscribe link and
 * `List-Unsubscribe` header point. Public - subscribers have no API key.
 * GET only shows a confirmation page, so link scanners that prefetch email
 * links can't unsubscribe anyone; the POST does the unsubscribing, both from
 * that page's button and from mail clients' one-click unsubscribe (RFC 8058).
 */
export class UnsubscribeController {
    constructor(private subscriberService: SubscriberService, private organizationService: OrganizationService) {
    }

    /**
     * GET /unsubscribe/:delivery_id
     * Shows a confirmation page with an "Unsubscribe" button, or says the
     * subscriber is already unsubscribed.
     *
     * @param c - Hono request context; expects a `delivery_id` route param.
     * @returns An HTML page (404 if the link matches no email).
     */
    confirm = async (c: Context) => {
        logger.info(`Start method: ${this.constructor.name}.${this.confirm.name}`);

        const deliveryId = c.req.param('delivery_id')!;

        logger.debug({ deliveryId }, `Request:`);

        const subscriber = await this.subscriberService.getByDelivery(deliveryId);

        if (!subscriber) {
            logger.warn({ deliveryId }, `${this.constructor.name}.${this.confirm.name}: Subscriber not found`);
            return c.html(page("Link not valid", "This unsubscribe link doesn't match any email we sent."), 404);
        }

        const sender = escapeHtml((await this.organizationService.get())?.name || "us");

        logger.info(`End method: ${this.constructor.name}.${this.confirm.name}`);

        if (subscriber.unsubscribed_at) {
            return c.html(page("You're unsubscribed", `You won't get any more emails from ${sender}.`));
        }

        const form = `<form method="post" style="margin-top:24px"><button type="submit" style="padding:8px 16px;font:inherit;color:#fff;background:#131416;border:0;border-radius:6px;cursor:pointer">Unsubscribe</button></form>`;
        return c.html(page("Unsubscribe?", `You'll stop getting emails from ${sender}.`, form));
    }

    /**
     * POST /unsubscribe/:delivery_id
     * Unsubscribes the subscriber the email went to. Accepts any body (the
     * confirmation form, or a mail client's `List-Unsubscribe=One-Click`).
     *
     * @param c - Hono request context; expects a `delivery_id` route param.
     * @returns An HTML page (404 if the link matches no email).
     */
    unsubscribe = async (c: Context) => {
        logger.info(`Start method: ${this.constructor.name}.${this.unsubscribe.name}`);

        const deliveryId = c.req.param('delivery_id')!;

        logger.debug({ deliveryId }, `Request:`);

        const subscriber = await this.subscriberService.unsubscribe(deliveryId);

        if (!subscriber) {
            logger.warn({ deliveryId }, `${this.constructor.name}.${this.unsubscribe.name}: Subscriber not found`);
            return c.html(page("Link not valid", "This unsubscribe link doesn't match any email we sent."), 404);
        }

        const sender = escapeHtml((await this.organizationService.get())?.name || "us");

        logger.info(`End method: ${this.constructor.name}.${this.unsubscribe.name}`);

        return c.html(page("You're unsubscribed", `You won't get any more emails from ${sender}.`));
    }
}
