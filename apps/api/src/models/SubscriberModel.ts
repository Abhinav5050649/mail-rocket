import { pgTable, varchar, timestamp, index } from "drizzle-orm/pg-core";
import { campaignTable } from "./CampaignModel";

/**
 * Drizzle schema for `subscribers`: a person a campaign can send to. A
 * subscriber is linked to at most one campaign directly, and to any number of
 * groups through `group_subscriber`.
 */
export const subscribersTable = pgTable("subscribers", {
    /** UUID to uniquely identify subscriber. */
    id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    /** Denotes the type of object and the domain it belongs to. */
    entity: varchar("entity").default("mail_rocket.subscribers"),
    /** First name of subscriber. */
    first_name: varchar("first_name"),
    /** Last name of subscriber. */
    last_name: varchar("last_name"),
    /** Normalized name of subscriber. */
    normalized_name: varchar("normalized_name"),
    /** Email ID of subscriber. */
    email_id: varchar("email_id"),
    /** ID of campaign the subscriber is associated with. */
    campaign_id: varchar("campaign_id").references(() => campaignTable.id),
    created_at: timestamp("created_at").$defaultFn(() => new Date()),
    updated_at: timestamp("updated_at").$onUpdate(() => new Date()),
    /** Field to store additional metadata about record. */
    description: varchar("description"),
}, (table) => [
    // Backs `getByCampaign`. Group membership lives in `group_subscriber`.
    index("subscribers_campaign_id_idx").on(table.campaign_id),
]);

/** TS type for a subscriber row, inferred directly from the table schema above. */
export type ISubscriber = typeof subscribersTable.$inferSelect;
