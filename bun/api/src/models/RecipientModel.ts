import { pgTable, varchar, timestamp } from "drizzle-orm/pg-core";
import { organizationTable } from "./OrganizationModel";
import { campaignTable } from "./CampaignModel";
import { groupTable } from "./GroupModel";

/** Drizzle schema for `recipients`: a person targeted by a campaign/group. */
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
    /** ID of group the recipient belongs to. */
    group_id: varchar("group_id").references(() => groupTable.id),
    /** ID of campaign the recipient is associated with. */
    campaign_id: varchar("campaign_id").references(() => campaignTable.id),
    created_at: timestamp("created_at").$defaultFn(() => new Date()),
    updated_at: timestamp("updated_at").$onUpdate(() => new Date()),
    /** Field to store additional metadata about record. */
    description: varchar("description"),
    /** ID of organization the recipient belongs to. */
    organization_id: varchar("organization_id").references(() => organizationTable.id),
});

/** TS type for a recipient row, inferred directly from the table schema above. */
export type IRecipient = typeof recipientsTable.$inferSelect;
