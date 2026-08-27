import { SendEmailCommand } from "@aws-sdk/client-ses";
import { count, desc, eq, inArray } from "drizzle-orm";
import { db, logger, sesClient } from "../libs";
import { recipientsTable, templateTable, campaignRecipientTable } from "../models";
import { CampaignService } from "./CampaignService";
import { IdentityService } from "./IdentityService";

const campaignService = new CampaignService();
const identityService = new IdentityService();

/**
 * Business logic for the campaign send pipeline (dispatch -> send-chunk ->
 * finalize). Called by the BullMQ worker processors in `src/queues/`, which
 * stay thin and delegate all DB/SES work here - this service never imports
 * from `src/queues/`, the same way other services never touch Hono's
 * `Context`. Follows the same logging/error conventions as every other
 * service in the codebase.
 */
export class SendCampaignService {

    /**
     * Fetches every recipient id belonging to a campaign. Unpaginated,
     * unlike other list methods in this codebase - a send must see every
     * recipient, not one page of them.
     *
     * @param campaignId - id of the campaign.
     * @returns Array of recipient ids (empty if the campaign has none).
     */
    async getRecipientIdsForCampaign(campaignId: string): Promise<string[]> {
        logger.info(`Start method: ${this.constructor.name}.${this.getRecipientIdsForCampaign.name}`);
        logger.debug({ campaignId }, `Request:`);

        try {
            const rows = await db.select({ id: recipientsTable.id }).from(recipientsTable)
                .where(eq(recipientsTable.campaign_id, campaignId));
            const recipientIds = rows.map(row => row.id);

            logger.debug({ campaignId, count: recipientIds.length }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.getRecipientIdsForCampaign.name}`);

            return recipientIds;
        } catch (error) {
            logger.error({ err: error, campaignId }, `Exception in ${this.constructor.name}.${this.getRecipientIdsForCampaign.name}: Failed to get recipients for campaign`);
            throw error;
        }
    }

    /**
     * Fetches the template to send for a campaign: the most-recently-updated
     * template row belonging to it. Templates have no "is_final"/"is_active"
     * flag today, so this is a stand-in for "the" template.
     *
     * @param campaignId - id of the campaign.
     * @returns The template row, or `null` if the campaign has none.
     */
    async getCurrentTemplateForCampaign(campaignId: string) {
        logger.info(`Start method: ${this.constructor.name}.${this.getCurrentTemplateForCampaign.name}`);
        logger.debug({ campaignId }, `Request:`);

        try {
            const [template] = await db.select().from(templateTable)
                .where(eq(templateTable.campaign_id, campaignId))
                .orderBy(desc(templateTable.updated_at), desc(templateTable.created_at))
                .limit(1);

            if (!template) {
                logger.warn({ campaignId }, `${this.constructor.name}.${this.getCurrentTemplateForCampaign.name}: No template found for campaign`);
                return null;
            }

            logger.debug({ campaignId, templateId: template.id }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.getCurrentTemplateForCampaign.name}`);

            return template;
        } catch (error) {
            logger.error({ err: error, campaignId }, `Exception in ${this.constructor.name}.${this.getCurrentTemplateForCampaign.name}: Failed to get template for campaign`);
            throw error;
        }
    }

    /**
     * Creates one `campaign_recipient` row per recipient for a new send,
     * each starting at `send_status: 'pending'`. This is the only write this
     * service makes against recipient data, and it lands entirely in
     * `campaign_recipient` - `recipients` rows are never mutated, so the
     * same recipient stays freely reusable across campaigns.
     *
     * @param campaignId - id of the campaign being sent.
     * @param organizationId - id of the organization the campaign belongs to.
     * @param recipientIds - ids of the recipients to include in this send.
     * @returns The created `campaign_recipient` rows' ids, in the same order as `recipientIds`.
     */
    async createCampaignRecipientManifest(campaignId: string, organizationId: string | null, recipientIds: string[]): Promise<string[]> {
        logger.info(`Start method: ${this.constructor.name}.${this.createCampaignRecipientManifest.name}`);
        logger.debug({ campaignId, count: recipientIds.length }, `Request:`);

        try {
            const rows = await db.insert(campaignRecipientTable).values(
                recipientIds.map(recipientId => ({
                    campaign_id: campaignId,
                    recipient_id: recipientId,
                    organization_id: organizationId,
                }))
            ).returning({ id: campaignRecipientTable.id });
            const manifestIds = rows.map(row => row.id);

            logger.debug({ campaignId, count: manifestIds.length }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.createCampaignRecipientManifest.name}`);

            return manifestIds;
        } catch (error) {
            logger.error({ err: error, campaignId }, `Exception in ${this.constructor.name}.${this.createCampaignRecipientManifest.name}: Failed to create campaign_recipient manifest`);
            throw error;
        }
    }

    /**
     * Marks a campaign as actively sending.
     *
     * @param campaignId - id of the campaign.
     */
    async beginSending(campaignId: string): Promise<void> {
        logger.info(`Start method: ${this.constructor.name}.${this.beginSending.name}`);
        await campaignService.update(campaignId, { status: "sending" });
        logger.info(`End method: ${this.constructor.name}.${this.beginSending.name}`);
    }

    /**
     * Marks a campaign's send as failed, recording why.
     *
     * @param campaignId - id of the campaign.
     * @param reason - human-readable reason the send failed.
     */
    async markCampaignSendFailed(campaignId: string, reason: string): Promise<void> {
        logger.info(`Start method: ${this.constructor.name}.${this.markCampaignSendFailed.name}`);
        logger.warn({ campaignId, reason }, `${this.constructor.name}.${this.markCampaignSendFailed.name}: Marking campaign send as failed`);
        await campaignService.update(campaignId, { status: "send_failed", send_failure_reason: reason });
        logger.info(`End method: ${this.constructor.name}.${this.markCampaignSendFailed.name}`);
    }

    /**
     * Sends one chunk of a campaign's emails via SES. Re-fetches the
     * campaign, identity, template, and `campaign_recipient` rows fresh by
     * id rather than trusting the job payload, since any of them could have
     * changed between schedule time and now. Recipients already marked
     * `send_status: 'sent'` are skipped, making a BullMQ retry of this job
     * safe. A per-recipient SES failure is caught and recorded without
     * aborting the rest of the chunk; a systemic failure (bad credentials,
     * network down) is allowed to propagate so BullMQ retries the whole job.
     *
     * @param campaignId - id of the campaign being sent.
     * @param campaignRecipientIds - ids of the `campaign_recipient` rows in this chunk.
     * @throws If the campaign, its identity, or its template can no longer be found, or the identity is a `domain` type (not yet supported as a From address).
     */
    async sendChunk(campaignId: string, campaignRecipientIds: string[]): Promise<void> {
        logger.info(`Start method: ${this.constructor.name}.${this.sendChunk.name}`);
        logger.debug({ campaignId, count: campaignRecipientIds.length }, `Request:`);

        const campaign = await campaignService.getById(campaignId);
        if (!campaign) throw new Error(`Campaign ${campaignId} not found`);
        if (!campaign.identity_id) throw new Error(`Campaign ${campaignId} has no identity_id`);

        const identity = await identityService.getById(campaign.identity_id);
        if (!identity) throw new Error(`Identity ${campaign.identity_id} for campaign ${campaignId} not found`);
        if (identity.type !== "email") throw new Error(`Identity ${identity.id} is type '${identity.type}'; only 'email' sending identities are supported`);

        const template = await this.getCurrentTemplateForCampaign(campaignId);
        if (!template) throw new Error(`Campaign ${campaignId} has no template`);

        const rows = await db.select({
            campaignRecipientId: campaignRecipientTable.id,
            sendStatus: campaignRecipientTable.send_status,
            email: recipientsTable.email_id,
        }).from(campaignRecipientTable)
            .innerJoin(recipientsTable, eq(campaignRecipientTable.recipient_id, recipientsTable.id))
            .where(inArray(campaignRecipientTable.id, campaignRecipientIds));

        for (const row of rows) {
            if (row.sendStatus === "sent") continue;
            if (!row.email) {
                await db.update(campaignRecipientTable).set({ send_status: "failed" }).where(eq(campaignRecipientTable.id, row.campaignRecipientId));
                continue;
            }

            try {
                await sesClient.send(new SendEmailCommand({
                    Source: identity.identity,
                    Destination: { ToAddresses: [row.email] },
                    Message: {
                        Subject: { Data: campaign.subject ?? "" },
                        Body: { Html: { Data: template.html_body ?? "" } },
                    },
                }));
                await db.update(campaignRecipientTable).set({ send_status: "sent", sent_at: new Date() }).where(eq(campaignRecipientTable.id, row.campaignRecipientId));
            } catch (error) {
                logger.error({ err: error, campaignId, campaignRecipientId: row.campaignRecipientId }, `${this.constructor.name}.${this.sendChunk.name}: Failed to send to recipient`);
                await db.update(campaignRecipientTable).set({ send_status: "failed" }).where(eq(campaignRecipientTable.id, row.campaignRecipientId));
            }
        }

        logger.info(`End method: ${this.constructor.name}.${this.sendChunk.name}`);
    }

    /**
     * Recomputes a campaign's final status once every chunk of its send has
     * settled: `sent` if at least one recipient succeeded, `send_failed`
     * only on total failure. Partial delivery failures (bounces etc.) are
     * routine at scale and shouldn't flip a whole campaign to a failed
     * state - the per-recipient `campaign_recipient.send_status` trail
     * remains the accurate record.
     *
     * @param campaignId - id of the campaign to finalize.
     */
    async finalizeCampaign(campaignId: string): Promise<void> {
        logger.info(`Start method: ${this.constructor.name}.${this.finalizeCampaign.name}`);
        logger.debug({ campaignId }, `Request:`);

        const counts = await db.select({ status: campaignRecipientTable.send_status, count: count() })
            .from(campaignRecipientTable)
            .where(eq(campaignRecipientTable.campaign_id, campaignId))
            .groupBy(campaignRecipientTable.send_status);

        const sentCount = counts.find(row => row.status === "sent")?.count ?? 0;

        if (sentCount > 0) {
            await campaignService.update(campaignId, { status: "sent" });
        } else {
            await this.markCampaignSendFailed(campaignId, "No recipients were successfully sent to");
        }

        logger.debug({ campaignId, counts }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.finalizeCampaign.name}`);
    }
}
