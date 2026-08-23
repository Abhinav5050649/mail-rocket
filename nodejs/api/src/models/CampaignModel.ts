import { pgTable, pgEnum, varchar, timestamp, index } from "drizzle-orm/pg-core";
import { organizationTable } from "./OrganizationModel";
import { userTable } from "./UserModel";
import { identityTable } from "./IdentityModel";

/**
 * Lifecycle status of a campaign's scheduled send:
 * `draft` (no send scheduled) -> `scheduled` (a dispatch job is queued for
 * `start_time`) -> `sending` (the dispatch job fired and chunk jobs are in
 * flight) -> `sent` | `send_failed` (every chunk has settled).
 */
export const campaignStatusEnum = pgEnum("campaign_status", ["draft", "scheduled", "sending", "sent", "send_failed"]);

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
    /** ID of the identity (domain/email) this campaign sends from via SES. */
    identity_id: varchar("identity_id").references(() => identityTable.id),
    /** Reason the send ended in `send_failed`, set by the finalize job. */
    send_failure_reason: varchar("send_failure_reason"),
}, (table) => [
    // Backs `getByOrganization`, which filters on organization_id.
    index("campaign_organization_id_idx").on(table.organization_id),
]);

/** TS type for a campaign row, inferred directly from the table schema above. */
export type ICampaign = typeof campaignTable.$inferSelect;
