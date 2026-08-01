import { pgTable, varchar, timestamp, index } from "drizzle-orm/pg-core";
import { organizationTable } from "./OrganizationModel";
import { userTable } from "./UserModel";
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
    /** ID of organization the group belongs to. */
    organization_id: varchar("organization_id").references(() => organizationTable.id),
    /** ID of user who created the group. */
    creator_id: varchar("creator_id").references(() => userTable.id),
    /** Normalized name of group. */
    normalized_name: varchar("normalized_name"),
}, (table) => [
    // Backs `getByCampaign` and `getByOrganization`.
    index("group_campaign_id_idx").on(table.campaign_id),
    index("group_organization_id_idx").on(table.organization_id),
]);

/** TS type for a group row, inferred directly from the table schema above. */
export type IGroup = typeof groupTable.$inferSelect;
