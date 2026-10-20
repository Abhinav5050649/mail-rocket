import { pgTable, varchar, timestamp, index } from "drizzle-orm/pg-core";
import { campaignTable } from "./CampaignModel";

/** Drizzle schema for `group`: a recipient list within a campaign. */
export const groupTable = pgTable("group", {
    /** UUID to uniquely identify group. */
    id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    created_at: timestamp("created_at").$defaultFn(() => new Date()),
    updated_at: timestamp("updated_at").$onUpdate(() => new Date()),
    /** Field to store additional metadata about record. */
    description: varchar("description"),
    /** Denotes the type of object and the domain it belongs to. */
    entity: varchar("entity").default("mail_rocket.group"),
    /** Name of group. */
    name: varchar("name"),
    /** ID of campaign the group belongs to. */
    campaign_id: varchar("campaign_id").references(() => campaignTable.id),
    /** Normalized name of group. */
    normalized_name: varchar("normalized_name"),
}, (table) => [
    // Backs `getByCampaign`.
    index("group_campaign_id_idx").on(table.campaign_id),
]);

/** TS type for a group row, inferred directly from the table schema above. */
export type IGroup = typeof groupTable.$inferSelect;
