import { SendEmailCommand } from "@aws-sdk/client-ses";
import { count, desc, eq, inArray, sql } from "drizzle-orm";
import { db, logger, sesClient, renderTemplate, addTracking, type TemplateVariableContext } from "../libs";
import { subscribersTable, templateTable, campaignDeliveryTable, groupTable, groupSubscriberTable } from "../models";
import { CampaignService } from "./CampaignService";
import { campaignAudience, outerSubscriberId } from "./SubscriberService";
import { IdentityService } from "./IdentityService";
import { OrganizationService } from "./OrganizationService";

const campaignService = new CampaignService();
const identityService = new IdentityService();
const organizationService = new OrganizationService();

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
     * Fetches every subscriber id in a campaign's audience: subscribers linked
     * to it directly plus members of the groups linked to it, each once (see
     * `campaignAudience`). Unpaginated,
     * unlike other list methods in this codebase - a send must see every
     * subscriber, not one page of them.
     *
     * @param campaignId - id of the campaign.
     * @returns Array of subscriber ids (empty if the campaign has none).
     */
    async getSubscriberIdsForCampaign(campaignId: string): Promise<string[]> {
        logger.info(`Start method: ${this.constructor.name}.${this.getSubscriberIdsForCampaign.name}`);
        logger.debug({ campaignId }, `Request:`);

        try {
            const rows = await db.select({ id: subscribersTable.id }).from(subscribersTable)
                .where(campaignAudience(campaignId));
            const subscriberIds = rows.map(row => row.id);

            logger.debug({ campaignId, count: subscriberIds.length }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.getSubscriberIdsForCampaign.name}`);

            return subscriberIds;
        } catch (error) {
            logger.error({ err: error, campaignId }, `Exception in ${this.constructor.name}.${this.getSubscriberIdsForCampaign.name}: Failed to get subscribers for campaign`);
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
     * Creates one `campaign_delivery` row per subscriber for a new send,
     * each starting at `status: 'pending'`. This is the only write this
     * service makes against subscriber data, and it lands entirely in
     * `campaign_delivery` - `subscribers` rows are never mutated, so the
     * same subscriber stays freely reusable across campaigns.
     *
     * @param campaignId - id of the campaign being sent.
     * @param subscriberIds - ids of the subscribers to include in this send.
     * @returns The created `campaign_delivery` rows' ids, in the same order as `subscriberIds`.
     */
    async createDeliveryManifest(campaignId: string, subscriberIds: string[]): Promise<string[]> {
        logger.info(`Start method: ${this.constructor.name}.${this.createDeliveryManifest.name}`);
        logger.debug({ campaignId, count: subscriberIds.length }, `Request:`);

        try {
            const rows = await db.insert(campaignDeliveryTable).values(
                subscriberIds.map(subscriberId => ({
                    campaign_id: campaignId,
                    subscriber_id: subscriberId,
                }))
            ).returning({ id: campaignDeliveryTable.id });
            const manifestIds = rows.map(row => row.id);

            logger.debug({ campaignId, count: manifestIds.length }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.createDeliveryManifest.name}`);

            return manifestIds;
        } catch (error) {
            logger.error({ err: error, campaignId }, `Exception in ${this.constructor.name}.${this.createDeliveryManifest.name}: Failed to create campaign_delivery manifest`);
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
    async markCampaignFailed(campaignId: string, reason: string): Promise<void> {
        logger.info(`Start method: ${this.constructor.name}.${this.markCampaignFailed.name}`);
        logger.warn({ campaignId, reason }, `${this.constructor.name}.${this.markCampaignFailed.name}: Marking campaign send as failed`);
        await campaignService.update(campaignId, { status: "failed", failure_reason: reason });
        logger.info(`End method: ${this.constructor.name}.${this.markCampaignFailed.name}`);
    }

    /**
     * Sends one chunk of a campaign's emails via SES. Re-fetches the
     * campaign, identity, template, and `campaign_delivery` rows fresh by
     * id rather than trusting the job payload, since any of them could have
     * changed between schedule time and now. Subscribers already marked
     * `status: 'sent'` are skipped, making a BullMQ retry of this job
     * safe. A per-subscriber SES failure is caught and recorded without
     * aborting the rest of the chunk; a systemic failure (bad credentials,
     * network down) is allowed to propagate so BullMQ retries the whole job.
     *
     * The subject and template body may contain `{{variable_name}}`
     * placeholders (see `src/libs/templateVariables.ts` and
     * `docs/TEMPLATE_VARIABLES.md`). Each is resolved per-subscriber; if any
     * placeholder can't be resolved for a given subscriber (unknown name, or
     * we simply don't have that value for them), that subscriber is marked
     * `failed` with the missing variable names recorded in `description` and
     * no email is sent to them - the rest of the chunk is unaffected.
     *
     * When `PUBLIC_API_URL` is set, each body also gets an open-tracking
     * pixel and click-tracking links tied to its `campaign_delivery` row
     * (see `src/libs/tracking.ts`).
     *
     * @param campaignId - id of the campaign being sent.
     * @param deliveryIds - ids of the `campaign_delivery` rows in this chunk.
     * @throws If the campaign, its identity, or its template can no longer be found, or the identity is a `domain` type (not yet supported as a From address).
     */
    async sendChunk(campaignId: string, deliveryIds: string[]): Promise<void> {
        logger.info(`Start method: ${this.constructor.name}.${this.sendChunk.name}`);
        logger.debug({ campaignId, count: deliveryIds.length }, `Request:`);

        const campaign = await campaignService.getById(campaignId);
        if (!campaign) throw new Error(`Campaign ${campaignId} not found`);
        if (!campaign.identity_id) throw new Error(`Campaign ${campaignId} has no identity_id`);

        const identity = await identityService.getById(campaign.identity_id);
        if (!identity) throw new Error(`Identity ${campaign.identity_id} for campaign ${campaignId} not found`);
        if (identity.type !== "email") throw new Error(`Identity ${identity.id} is type '${identity.type}'; only 'email' sending identities are supported`);

        // Resolved once per chunk - shared by every subscriber's template context below.
        // The instance's single organization profile, for `{{organization_name}}`.
        const organization = await organizationService.get();

        const template = await this.getCurrentTemplateForCampaign(campaignId);
        if (!template) throw new Error(`Campaign ${campaignId} has no template`);

        const rows = await db.select({
            deliveryId: campaignDeliveryTable.id,
            status: campaignDeliveryTable.status,
            email: subscribersTable.email_id,
            firstName: subscribersTable.first_name,
            lastName: subscribersTable.last_name,
            // Every group the subscriber is in, by name - "{{group_name}}" lists them all.
            groupNames: sql<string | null>`(
                select string_agg(${groupTable.name}, ', ' order by ${groupTable.name})
                from ${groupSubscriberTable}
                inner join ${groupTable} on ${groupTable.id} = ${groupSubscriberTable.group_id}
                where ${groupSubscriberTable.subscriber_id} = ${outerSubscriberId}
            )`,
        }).from(campaignDeliveryTable)
            .innerJoin(subscribersTable, eq(campaignDeliveryTable.subscriber_id, subscribersTable.id))
            .where(inArray(campaignDeliveryTable.id, deliveryIds));

        for (const row of rows) {
            if (row.status === "sent") continue;
            if (!row.email) {
                await db.update(campaignDeliveryTable).set({ status: "failed" }).where(eq(campaignDeliveryTable.id, row.deliveryId));
                continue;
            }

            const context: TemplateVariableContext = {
                subscriber: { first_name: row.firstName, last_name: row.lastName, email_id: row.email },
                group: row.groupNames ? { name: row.groupNames } : null,
                campaign: { name: campaign.name, start_time: campaign.start_time },
                organization: organization ? { name: organization.name, timezone: organization.timezone } : null,
                sender: { email: identity.identity },
            };

            const subject = renderTemplate(campaign.subject ?? "", context);
            const body = renderTemplate(template.html_body ?? "", context);
            const missing = [...new Set([...subject.missing, ...body.missing])];

            if (missing.length > 0) {
                logger.warn({ campaignId, deliveryId: row.deliveryId, missing }, `${this.constructor.name}.${this.sendChunk.name}: Skipping subscriber - unresolved template variables`);
                await db.update(campaignDeliveryTable)
                    .set({ status: "failed", description: `Missing template variables: ${missing.join(", ")}` })
                    .where(eq(campaignDeliveryTable.id, row.deliveryId));
                continue;
            }

            try {
                await sesClient.send(new SendEmailCommand({
                    Source: identity.identity,
                    Destination: { ToAddresses: [row.email] },
                    Message: {
                        Subject: { Data: subject.rendered },
                        Body: { Html: { Data: addTracking(body.rendered, row.deliveryId) } },
                    },
                }));
                await db.update(campaignDeliveryTable).set({ status: "sent", sent_at: new Date() }).where(eq(campaignDeliveryTable.id, row.deliveryId));
            } catch (error) {
                logger.error({ err: error, campaignId, deliveryId: row.deliveryId }, `${this.constructor.name}.${this.sendChunk.name}: Failed to send to subscriber`);
                await db.update(campaignDeliveryTable).set({ status: "failed" }).where(eq(campaignDeliveryTable.id, row.deliveryId));
            }
        }

        logger.info(`End method: ${this.constructor.name}.${this.sendChunk.name}`);
    }

    /**
     * Recomputes a campaign's final status once every chunk of its send has
     * settled: `sent` if at least one subscriber succeeded, `failed`
     * only on total failure. Partial delivery failures (bounces etc.) are
     * routine at scale and shouldn't flip a whole campaign to a failed
     * state - the per-subscriber `campaign_delivery.status` trail
     * remains the accurate record.
     *
     * @param campaignId - id of the campaign to finalize.
     */
    async finalizeCampaign(campaignId: string): Promise<void> {
        logger.info(`Start method: ${this.constructor.name}.${this.finalizeCampaign.name}`);
        logger.debug({ campaignId }, `Request:`);

        const counts = await db.select({ status: campaignDeliveryTable.status, count: count() })
            .from(campaignDeliveryTable)
            .where(eq(campaignDeliveryTable.campaign_id, campaignId))
            .groupBy(campaignDeliveryTable.status);

        const sentCount = counts.find(row => row.status === "sent")?.count ?? 0;

        if (sentCount > 0) {
            await campaignService.update(campaignId, { status: "sent" });
        } else {
            await this.markCampaignFailed(campaignId, "No subscribers were successfully sent to");
        }

        logger.debug({ campaignId, counts }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.finalizeCampaign.name}`);
    }
}
