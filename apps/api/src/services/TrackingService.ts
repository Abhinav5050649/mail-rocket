import { and, eq, isNull } from "drizzle-orm";
import { db, logger } from "../libs";
import { campaignDeliveryTable } from "../models";

/** What a subscriber did with an email: loaded its tracking pixel, or clicked a link in it. */
export type TrackingEvent = "open" | "click";

/**
 * Records opens and clicks against the `campaign_delivery` row an email
 * was sent for. Only the first open and first click are kept, so stats
 * count each subscriber once however often they reopen or click.
 */
export class TrackingService {

    /**
     * Records an open or a click. A click also counts as an open, since
     * clients that block images never load the pixel. Unknown ids are
     * ignored - there's nothing to record against.
     *
     * @param deliveryId - id of the `campaign_delivery` row the email was sent for.
     * @param event - `open` or `click`.
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async record(deliveryId: string, event: TrackingEvent): Promise<void> {
        logger.info(`Start method: ${this.constructor.name}.${this.record.name}`);
        logger.debug({ deliveryId, event }, `Request:`);

        try {
            // `isNull` keeps the first timestamp instead of overwriting it on every reopen/click.
            await db.update(campaignDeliveryTable).set({ opened_at: new Date() })
                .where(and(eq(campaignDeliveryTable.id, deliveryId), isNull(campaignDeliveryTable.opened_at)));

            if (event === "click") {
                await db.update(campaignDeliveryTable).set({ clicked_at: new Date() })
                    .where(and(eq(campaignDeliveryTable.id, deliveryId), isNull(campaignDeliveryTable.clicked_at)));
            }

            logger.info(`End method: ${this.constructor.name}.${this.record.name}`);
        } catch (error) {
            logger.error({ err: error, deliveryId, event }, `Exception in ${this.constructor.name}.${this.record.name}: Failed to record tracking event`);
            throw error;
        }
    }
}
