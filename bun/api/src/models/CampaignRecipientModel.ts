import { pgTable, pgEnum, varchar, timestamp, index } from "drizzle-orm/pg-core";
import { organizationTable } from "./OrganizationModel";
import { campaignTable } from "./CampaignModel";
import { recipientsTable } from "./RecipientModel";

/** Per-send delivery status of a `campaign_recipient` row. */
export const campaignRecipientSendStatusEnum = pgEnum("campaign_recipient_send_status", ["pending", "sent", "failed"]);

/** TS union type for a campaign_recipient's `send_status` column. */
export type CampaignRecipientSendStatus = (typeof campaignRecipientSendStatusEnum.enumValues)[number];

/**
 * Drizzle schema for `campaign_recipient`: tracks one recipient's send
 * outcome within one campaign's send. Created by the dispatch job (one row
 * per recipient, per send) rather than by users - kept separate from
 * `recipients` itself so a recipient row stays freely reusable across
 * campaigns instead of carrying send state for whichever campaign sent to
 * it most recently.
 */
export const campaignRecipientTable = pgTable("campaign_recipient", {
    /** UUID to uniquely identify campaign_recipient. */
    id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    /** Denotes the type of object and the domain it belongs to. */
    entity: varchar("entity").default("mail_rocket.campaign_recipient"),
    /** ID of the campaign this send belongs to. */
    campaign_id: varchar("campaign_id").references(() => campaignTable.id),
    /** ID of the recipient being sent to. */
    recipient_id: varchar("recipient_id").references(() => recipientsTable.id),
    /** Delivery status of this recipient within this campaign's send. */
    send_status: campaignRecipientSendStatusEnum("send_status").default("pending"),
    /** When the send to this recipient succeeded. */
    sent_at: timestamp("sent_at"),
    /** ID of organization the campaign belongs to. */
    organization_id: varchar("organization_id").references(() => organizationTable.id),
    created_at: timestamp("created_at").$defaultFn(() => new Date()),
    updated_at: timestamp("updated_at").$onUpdate(() => new Date()),
    /** Field to store additional metadata about record. */
    description: varchar("description"),
}, (table) => [
    // Backs `getRecipientsForCampaign`-style lookups scoped to one send.
    index("campaign_recipient_campaign_id_idx").on(table.campaign_id),
    // Backs lookups of a recipient's send history across campaigns.
    index("campaign_recipient_recipient_id_idx").on(table.recipient_id),
    // Backs the finalize job's grouped count of a send's outcomes.
    index("campaign_recipient_campaign_id_send_status_idx").on(table.campaign_id, table.send_status),
]);

/** TS type for a campaign_recipient row, inferred directly from the table schema above. */
export type ICampaignRecipient = typeof campaignRecipientTable.$inferSelect;
