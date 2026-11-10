import { pgTable, varchar, timestamp } from "drizzle-orm/pg-core";

/**
 * Drizzle schema for `subscribers`: a person a campaign can send to. A
 * subscriber joins any number of groups through `group_subscriber`, and any
 * number of campaigns can pick them individually through `campaign_subscriber`.
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
    /** When the subscriber unsubscribed; no campaign sends to them after that. Set only by the subscriber, via an email's unsubscribe link. */
    unsubscribed_at: timestamp("unsubscribed_at"),
    created_at: timestamp("created_at").$defaultFn(() => new Date()),
    updated_at: timestamp("updated_at").$onUpdate(() => new Date()),
    /** Field to store additional metadata about record. */
    description: varchar("description"),
});

/** TS type for a subscriber row, inferred directly from the table schema above. */
export type ISubscriber = typeof subscribersTable.$inferSelect;
