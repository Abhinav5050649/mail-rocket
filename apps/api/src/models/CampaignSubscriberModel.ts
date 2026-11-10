import { pgTable, varchar, timestamp, index, unique } from "drizzle-orm/pg-core";
import { campaignTable } from "./CampaignModel";
import { subscribersTable } from "./SubscriberModel";

/**
 * Drizzle schema for `campaign_subscriber`: subscribers a campaign sends to
 * individually, on top of everyone in its groups. Many-to-many - a campaign
 * can pick any number of subscribers, and a subscriber can be picked by any
 * number of campaigns. Rows are meaningless without either side, so deleting
 * a campaign or a subscriber removes its links.
 */
export const campaignSubscriberTable = pgTable("campaign_subscriber", {
    /** UUID to uniquely identify the link. */
    id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    /** Denotes the type of object and the domain it belongs to. */
    entity: varchar("entity").default("mail_rocket.campaign_subscriber"),
    /** ID of the campaign. */
    campaign_id: varchar("campaign_id").notNull().references(() => campaignTable.id, { onDelete: "cascade" }),
    /** ID of a subscriber the campaign sends to directly. */
    subscriber_id: varchar("subscriber_id").notNull().references(() => subscribersTable.id, { onDelete: "cascade" }),
    created_at: timestamp("created_at").$defaultFn(() => new Date()),
    updated_at: timestamp("updated_at").$onUpdate(() => new Date()),
    /** Field to store additional metadata about record. */
    description: varchar("description"),
}, (table) => [
    // One link per pair; also indexes `campaign_id` for reading a campaign's subscribers.
    unique("campaign_subscriber_campaign_id_subscriber_id_unique").on(table.campaign_id, table.subscriber_id),
    // Backs finding the campaigns that pick a subscriber.
    index("campaign_subscriber_subscriber_id_idx").on(table.subscriber_id),
]);

/** TS type for a campaign_subscriber row, inferred directly from the table schema above. */
export type ICampaignSubscriber = typeof campaignSubscriberTable.$inferSelect;
