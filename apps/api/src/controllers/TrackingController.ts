import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { config } from "../../config";
import { logger, signTrackingLink } from "../libs";
import { TrackingService } from "../services";

/** A 1x1 transparent GIF, returned for every open-tracking request. */
const PIXEL = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

/**
 * HTTP layer for `/track`: the open pixel and click redirect that sent
 * emails point at (see `src/libs/tracking.ts`). These are public - they're
 * loaded by subscribers' mail clients, which have no API key.
 */
export class TrackingController {
    constructor(private trackingService: TrackingService) {
    }

    /**
     * GET /track/open/:delivery_id
     * Records an open and returns the tracking pixel.
     *
     * @param c - Hono request context; expects a `delivery_id` route param.
     * @returns A 1x1 GIF, never cached so every load reaches the API.
     */
    open = async (c: Context) => {
        logger.info(`Start method: ${this.constructor.name}.${this.open.name}`);

        const deliveryId = c.req.param('delivery_id')!;

        logger.debug({ deliveryId }, `Request:`);

        await this.trackingService.record(deliveryId, "open");

        logger.info(`End method: ${this.constructor.name}.${this.open.name}`);

        return c.body(PIXEL, 200, { "Content-Type": "image/gif", "Cache-Control": "no-store" });
    }

    /**
     * GET /track/click/:delivery_id?url=...&sig=...
     * Records a click and redirects to the link's real destination.
     *
     * @param c - Hono request context; expects a `delivery_id` route param and `url`/`sig` query params.
     * @returns A 302 redirect to `url`.
     * @throws {HTTPException} 400 if tracking is off, or `url` is missing or its signature doesn't match (not a link this API sent).
     */
    click = async (c: Context) => {
        logger.info(`Start method: ${this.constructor.name}.${this.click.name}`);

        const deliveryId = c.req.param('delivery_id')!;
        const url = c.req.query('url');
        const sig = c.req.query('sig');

        logger.debug({ deliveryId, url }, `Request:`);

        // Without a secret anyone could sign a link, so with tracking off no link is valid.
        if (!config.trackingSecret || !url || sig !== signTrackingLink(deliveryId, url)) {
            throw new HTTPException(400, { message: "Invalid tracking link" });
        }

        await this.trackingService.record(deliveryId, "click");

        logger.info(`End method: ${this.constructor.name}.${this.click.name}`);

        return c.redirect(url, 302);
    }
}
