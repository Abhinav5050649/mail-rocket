import { pgTable, pgEnum, varchar, timestamp } from "drizzle-orm/pg-core";
import { organizationTable } from "./OrganizationModel";
import { userTable } from "./UserModel";

/** Lifecycle status of a campaign. */
export const campaignStatusEnum = pgEnum("campaign_status", ["draft", "active"]);

/** TS union type for a campaign's `status` column. */
export type CampaignStatus = (typeof campaignStatusEnum.enumValues)[number];

/** Drizzle schema for `campaign`: an email campaign run by an organization. */
export const campaignTable = pgTable("campaign", {
    /** UUID to uniquely identify campaign. */
    id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    /** Denotes the type of object and the domain it belongs to. */
    entity: varchar("entity").default("mail_rocket.campaign"),
    /** Name of campaign. */
    name: varchar("name"),
    /** Subject line of the campaign email. */
    subject: varchar("subject"),
    /** Storage key/path of the campaign logo. */
    logo_key: varchar("logo_key"),
    /** Storage bucket where the campaign logo is stored. */
    logo_bucket: varchar("logo_bucket"),
    created_at: timestamp("created_at").$defaultFn(() => new Date()),
    updated_at: timestamp("updated_at").$onUpdate(() => new Date()),
    /** Field to store additional metadata about record. */
    description: varchar("description"),
    /** ID of organization the campaign belongs to. */
    organization_id: varchar("organization_id").references(() => organizationTable.id),
    /** Timestamp when the campaign starts/started. */
    start_time: timestamp("start_time"),
    /** ID of user organizing the campaign. */
    organizer_id: varchar("organizer_id").references(() => userTable.id),
    /** Normalized name of campaign. */
    normalized_name: varchar("normalized_name"),
    /** Lifecycle status of the campaign. */
    status: campaignStatusEnum("status").default("draft"),
});

/** TS type for a campaign row, inferred directly from the table schema above. */
export type ICampaign = typeof campaignTable.$inferSelect;
