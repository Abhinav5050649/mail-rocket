import { pgTable, varchar, timestamp, index } from "drizzle-orm/pg-core";
import { campaignTable } from "./CampaignModel";

/**
 * Drizzle schema for `recipients`: a person a campaign can send to. A
 * recipient is linked to at most one campaign directly, and to any number of
 * groups through `group_recipient`.
 */
export const recipientsTable = pgTable("recipients", {
    /** UUID to uniquely identify recipient. */
    id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    /** Denotes the type of object and the domain it belongs to. */
    entity: varchar("entity").default("mail_rocket.recipients"),
    /** First name of recipient. */
    first_name: varchar("first_name"),
    /** Last name of recipient. */
    last_name: varchar("last_name"),
    /** Normalized name of recipient. */
    normalized_name: varchar("normalized_name"),
    /** Email ID of recipient. */
    email_id: varchar("email_id"),
    /** ID of campaign the recipient is associated with. */
    campaign_id: varchar("campaign_id").references(() => campaignTable.id),
    created_at: timestamp("created_at").$defaultFn(() => new Date()),
    updated_at: timestamp("updated_at").$onUpdate(() => new Date()),
    /** Field to store additional metadata about record. */
    description: varchar("description"),
}, (table) => [
    // Backs `getByCampaign`. Group membership lives in `group_recipient`.
    index("recipients_campaign_id_idx").on(table.campaign_id),
]);

/** TS type for a recipient row, inferred directly from the table schema above. */
export type IRecipient = typeof recipientsTable.$inferSelect;
