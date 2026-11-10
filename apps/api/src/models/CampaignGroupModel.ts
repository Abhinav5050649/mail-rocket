import { pgTable, varchar, timestamp, index, unique } from "drizzle-orm/pg-core";
import { campaignTable } from "./CampaignModel";
import { groupTable } from "./GroupModel";

/**
 * Drizzle schema for `campaign_group`: which groups a campaign sends to.
 * Many-to-many - a campaign can send to any number of groups, and a group
 * can be the audience of any number of campaigns at once. Rows are
 * meaningless without either side, so deleting a campaign or a group
 * removes its links.
 */
export const campaignGroupTable = pgTable("campaign_group", {
    /** UUID to uniquely identify the link. */
    id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    /** Denotes the type of object and the domain it belongs to. */
    entity: varchar("entity").default("mail_rocket.campaign_group"),
    /** ID of the campaign. */
    campaign_id: varchar("campaign_id").notNull().references(() => campaignTable.id, { onDelete: "cascade" }),
    /** ID of a group the campaign sends to. */
    group_id: varchar("group_id").notNull().references(() => groupTable.id, { onDelete: "cascade" }),
    created_at: timestamp("created_at").$defaultFn(() => new Date()),
    updated_at: timestamp("updated_at").$onUpdate(() => new Date()),
    /** Field to store additional metadata about record. */
    description: varchar("description"),
}, (table) => [
    // One link per pair; also indexes `campaign_id` for reading a campaign's groups.
    unique("campaign_group_campaign_id_group_id_unique").on(table.campaign_id, table.group_id),
    // Backs finding the campaigns that use a group.
    index("campaign_group_group_id_idx").on(table.group_id),
]);

/** TS type for a campaign_group row, inferred directly from the table schema above. */
export type ICampaignGroup = typeof campaignGroupTable.$inferSelect;
