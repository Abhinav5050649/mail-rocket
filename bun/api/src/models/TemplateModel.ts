import { pgTable, varchar, timestamp, index } from "drizzle-orm/pg-core";
import { organizationTable } from "./OrganizationModel";
import { campaignTable } from "./CampaignModel";

/**
 * Drizzle schema for `template`: the reusable HTML content of a campaign
 * email. `subject`/`name` for the send itself live on `campaign` - a
 * template only carries the body markup, so a campaign can hold several
 * template rows (e.g. draft revisions or A/B variants) without duplicating
 * campaign-level metadata.
 */
export const templateTable = pgTable("template", {
    /** UUID to uniquely identify template. */
    id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    /** Denotes the type of object and the domain it belongs to. */
    entity: varchar("entity").default("mail_rocket.template"),
    /** Name of template. */
    name: varchar("name"),
    /** HTML markup of the email body. */
    html_body: varchar("html_body"),
    /** ID of campaign the template belongs to. */
    campaign_id: varchar("campaign_id").references(() => campaignTable.id),
    /** ID of organization the template belongs to. */
    organization_id: varchar("organization_id").references(() => organizationTable.id),
    /** Normalized name of template. */
    normalized_name: varchar("normalized_name"),
    created_at: timestamp("created_at").$defaultFn(() => new Date()),
    updated_at: timestamp("updated_at").$onUpdate(() => new Date()),
    /** Field to store additional metadata about record. */
    description: varchar("description"),
}, (table) => [
    // Backs `getByCampaign` and `getByOrganization`.
    index("template_campaign_id_idx").on(table.campaign_id),
    index("template_organization_id_idx").on(table.organization_id),
]);

/** TS type for a template row, inferred directly from the table schema above. */
export type ITemplate = typeof templateTable.$inferSelect;
