import { pgTable, pgEnum, varchar, timestamp, index } from "drizzle-orm/pg-core";
import { DELIVERY_STATUSES } from "@mail-rocket/shared";
import { campaignTable } from "./CampaignModel";
import { subscribersTable } from "./SubscriberModel";

/** Per-send delivery status of a `campaign_delivery` row. */
export const campaignDeliveryStatusEnum = pgEnum("campaign_delivery_status", DELIVERY_STATUSES);

/** TS union type for a campaign_delivery's `status` column. */
export type CampaignDeliveryStatus = (typeof campaignDeliveryStatusEnum.enumValues)[number];

/**
 * Drizzle schema for `campaign_delivery`: tracks one subscriber's send
 * outcome within one campaign's send. Created by the dispatch job (one row
 * per subscriber, per send) rather than by users - kept separate from
 * `subscribers` itself so a subscriber row stays freely reusable across
 * campaigns instead of carrying send state for whichever campaign sent to
 * it most recently.
 */
export const campaignDeliveryTable = pgTable("campaign_delivery", {
    /** UUID to uniquely identify campaign_delivery. */
    id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    /** Denotes the type of object and the domain it belongs to. */
    entity: varchar("entity").default("mail_rocket.campaign_delivery"),
    /** ID of the campaign this send belongs to. */
    campaign_id: varchar("campaign_id").references(() => campaignTable.id),
    /** ID of the subscriber being sent to. */
    subscriber_id: varchar("subscriber_id").references(() => subscribersTable.id),
    /** Delivery status of this subscriber within this campaign's send. */
    status: campaignDeliveryStatusEnum("status").default("pending"),
    /** When the send to this subscriber succeeded. */
    sent_at: timestamp("sent_at"),
    created_at: timestamp("created_at").$defaultFn(() => new Date()),
    updated_at: timestamp("updated_at").$onUpdate(() => new Date()),
    /** Field to store additional metadata about record. */
    description: varchar("description"),
}, (table) => [
    // Backs `getSubscribersForCampaign`-style lookups scoped to one send.
    index("campaign_delivery_campaign_id_idx").on(table.campaign_id),
    // Backs lookups of a subscriber's send history across campaigns.
    index("campaign_delivery_subscriber_id_idx").on(table.subscriber_id),
    // Backs the finalize job's grouped count of a send's outcomes.
    index("campaign_delivery_campaign_id_status_idx").on(table.campaign_id, table.status),
]);

/** TS type for a campaign_delivery row, inferred directly from the table schema above. */
export type ICampaignDelivery = typeof campaignDeliveryTable.$inferSelect;
