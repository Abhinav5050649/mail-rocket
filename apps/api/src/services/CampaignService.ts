import { and, asc, count, eq, sql, type SQL } from "drizzle-orm";
import { senderProblem, type IdentityType } from "@mail-rocket/shared";
import { db, logger, DEFAULT_PAGE_SIZE, ValidationError, type PaginationOptions } from "../libs";
import { campaignDeliveryTable, campaignTable, groupTable, identityTable, subscribersTable, templateTable, type CampaignStatus, type ICampaign } from "../models";
// Imported directly from CampaignDispatch (not the `../queues` barrel) to
// avoid a circular import: the barrel also re-exports CampaignWorkers.ts,
// which imports SendCampaignService from the services barrel - which would
// pull in this very file again mid-initialization.
import { scheduleCampaignDispatch, cancelCampaignDispatch } from "../queues/CampaignDispatch";

/** Campaign statuses whose `start_time` can still be (re)scheduled. */
const SCHEDULABLE_STATUSES: (CampaignStatus | null)[] = ["draft", "scheduled", null];

/** Update fields that make `update` re-check the From address: the sender settings themselves, and the schedule (a campaign is checked before it can be queued to send). */
const SENDER_CHECK_FIELDS = ["identity_id", "from_local_part", "from_name", "start_time"] as const;

/** The transaction handle `db.transaction` passes its callback, so helpers can join the caller's transaction. */
type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** The sender fields a create or update may carry, before they're tidied. */
type SenderFields = { from_local_part?: string | null; from_name?: string | null };

/**
 * Tidies the sender fields of a create/update body in place: trims them, and
 * turns an empty string into `null`, so a cleared form field means "unset"
 * rather than an empty address or name. Fields the body leaves out stay out,
 * so a partial update doesn't touch them.
 *
 * @param data - The create/update input to tidy.
 */
const normalizeSenderFields = (data: SenderFields): void => {
    // Each field is tidied only when the caller actually sent it.
    for (const field of ["from_local_part", "from_name"] as const) {
        if (!(field in data)) continue;
        // Trim off stray spaces; a value that's then empty counts as unset.
        const value = data[field]?.trim();
        data[field] = value ? value : null;
    }
};

/** Fields accepted when creating a new campaign row. */
export interface CreateCampaignInput {
    name?: string;
    subject?: string;
    logo_key?: string;
    logo_bucket?: string;
    start_time?: Date;
    normalized_name?: string;
    description?: string;
    status?: CampaignStatus;
    identity_id?: string;
    /** Part before the @ of the From address; only for a domain identity. */
    from_local_part?: string | null;
    /** Display name inboxes show for the sender. */
    from_name?: string | null;
}

/** Fields accepted when partially updating an existing campaign row. */
export interface UpdateCampaignInput {
    name?: string;
    subject?: string;
    logo_key?: string;
    logo_bucket?: string;
    start_time?: Date | null;
    normalized_name?: string;
    description?: string;
    status?: CampaignStatus;
    identity_id?: string;
    /** Part before the @ of the From address; only for a domain identity. */
    from_local_part?: string | null;
    /** Display name inboxes show for the sender. */
    from_name?: string | null;
    failure_reason?: string;
}

/**
 * Data-access layer for `campaign` rows. Wraps `campaignTable` (Drizzle)
 * and adds structured logging around every operation: `info` logs marking
 * method start/end, `debug` logs of the request params and response
 * payload, `warn` if no matching row is found, and `error` (with the full
 * stack via the pino `err` serializer) if the underlying query throws.
 */
export class CampaignService {

    /**
     * Creates a new campaign row.
     *
     * @param data - Fields for the new campaign.
     * @returns The created campaign row.
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async create(data: CreateCampaignInput) {
        logger.info(`Start method: ${this.constructor.name}.${this.create.name}`);
        logger.debug({ data }, `Request:`);

        try {
            // Empty sender fields from a form mean "unset", not an empty address.
            normalizeSenderFields(data);

            // Wrapped in a transaction so that if scheduling fails (e.g. no
            // identity_id yet), the insert rolls back too, rather than
            // leaving behind a campaign row the caller was told didn't get created.
            const campaign = await db.transaction(async (tx) => {
                const [inserted] = await tx.insert(campaignTable).values(data).returning();

                // An invalid From address throws here, which rolls the insert back.
                await this.assertValidSender(tx, inserted!);

                if (inserted!.start_time) {
                    await scheduleCampaignDispatch(inserted!);
                    const [scheduled] = await tx.update(campaignTable).set({ status: "scheduled" }).where(eq(campaignTable.id, inserted!.id)).returning();
                    return scheduled!;
                }

                return inserted!;
            });

            logger.debug({ campaignId: campaign.id }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.create.name}`);

            return campaign;
        } catch (error) {
            logger.error({ err: error, data }, `Exception in ${this.constructor.name}.${this.create.name}: Failed to create campaign`);
            throw error;
        }
    }

    /**
     * Fetches a single campaign by id.
     *
     * @param campaignId - id of the campaign.
     * @returns The campaign row, or `null` if no match exists.
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async getById(campaignId: string) {
        logger.info(`Start method: ${this.constructor.name}.${this.getById.name}`);
        logger.debug({ campaignId }, `Request:`);

        try {
            const [campaign] = await db.select().from(campaignTable).where(eq(campaignTable.id, campaignId));

            if (!campaign) {
                logger.warn({ campaignId }, `${this.constructor.name}.${this.getById.name}: Campaign not found`);
                return null;
            }

            logger.debug({ campaignId }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.getById.name}`);

            return campaign;
        } catch (error) {
            logger.error({ err: error, campaignId }, `Exception in ${this.constructor.name}.${this.getById.name}: Failed to get campaign`);
            throw error;
        }
    }

    /**
     * Counts how a campaign's send went, from its `campaign_delivery`
     * rows: how many emails are pending, sent or failed, how many
     * subscribers opened one, clicked a link or unsubscribed (each counted once), and the
     * open and click rates as a fraction of the emails sent.
     *
     * @param campaignId - id of the campaign.
     * @returns The campaign's stats (all zeros before it has been sent), or `null` if the campaign doesn't exist.
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async getStats(campaignId: string) {
        logger.info(`Start method: ${this.constructor.name}.${this.getStats.name}`);
        logger.debug({ campaignId }, `Request:`);

        try {
            const [campaign] = await db.select({ id: campaignTable.id }).from(campaignTable).where(eq(campaignTable.id, campaignId));

            if (!campaign) {
                logger.warn({ campaignId }, `${this.constructor.name}.${this.getStats.name}: Campaign not found`);
                return null;
            }

            // `count(x)` skips nulls, so `count(case when ... then 1 end)` counts the matching rows.
            const [counts] = await db.select({
                total: count(),
                pending: count(sql`case when ${campaignDeliveryTable.status} = 'pending' then 1 end`),
                sent: count(sql`case when ${campaignDeliveryTable.status} = 'sent' then 1 end`),
                failed: count(sql`case when ${campaignDeliveryTable.status} = 'failed' then 1 end`),
                opened: count(campaignDeliveryTable.opened_at),
                clicked: count(campaignDeliveryTable.clicked_at),
                unsubscribed: count(campaignDeliveryTable.unsubscribed_at),
            }).from(campaignDeliveryTable).where(eq(campaignDeliveryTable.campaign_id, campaignId));

            const stats = {
                ...counts!,
                open_rate: counts!.sent > 0 ? counts!.opened / counts!.sent : 0,
                click_rate: counts!.sent > 0 ? counts!.clicked / counts!.sent : 0,
            };

            logger.debug({ campaignId, stats }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.getStats.name}`);

            return stats;
        } catch (error) {
            logger.error({ err: error, campaignId }, `Exception in ${this.constructor.name}.${this.getStats.name}: Failed to get campaign stats`);
            throw error;
        }
    }

    /**
     * Lists every campaign, ordered by `id` ascending.
     *
     * @param options.status - optional filter on the `status` column.
     * @param options.limit - max number of rows to return.
     * @param options.offset - number of rows to skip before returning results.
     * @returns Array of matching campaign rows (empty if none exist).
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async getAll(options?: PaginationOptions & { status?: CampaignStatus }) {
        logger.info(`Start method: ${this.constructor.name}.${this.getAll.name}`);
        logger.debug({ options }, `Request:`);

        try {
            const conditions: SQL[] = [];
            if (options?.status !== undefined) conditions.push(eq(campaignTable.status, options.status));

            const campaigns = await db.select().from(campaignTable).where(and(...conditions)).orderBy(asc(campaignTable.id))
                .limit(options?.limit ?? DEFAULT_PAGE_SIZE)
                .offset(options?.offset ?? 0);

            logger.debug({ count: campaigns.length }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.getAll.name}`);

            return campaigns;
        } catch (error) {
            logger.error({ err: error, options }, `Exception in ${this.constructor.name}.${this.getAll.name}: Failed to get campaigns`);
            throw error;
        }
    }

    /**
     * Partially updates a campaign row.
     *
     * @param campaignId - id of the campaign to update.
     * @param data - Fields to update.
     * @returns The updated campaign row, or `null` if no match exists.
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async update(campaignId: string, data: UpdateCampaignInput) {
        logger.info(`Start method: ${this.constructor.name}.${this.update.name}`);
        logger.debug({ campaignId, data }, `Request:`);

        try {
            // Scheduling only reacts to `start_time` being explicitly
            // touched (present in `data`, even as `null` to clear it), and
            // only while the campaign's status *before* this update was
            // still schedulable - once a send has started/finished, editing
            // start_time updates the column for record-keeping only, and
            // must never re-trigger a second full send.
            // Empty sender fields from a form mean "unset", not an empty address.
            normalizeSenderFields(data);

            const campaign = await db.transaction(async (tx) => {
                const [before] = await tx.select().from(campaignTable).where(eq(campaignTable.id, campaignId));
                if (!before) return null;

                // Switching to an email identity makes a local part left over
                // from a domain identity meaningless (the identity is the
                // address), so it's dropped - unless the caller sent one
                // explicitly, which the check below then rejects.
                if (data.identity_id && !("from_local_part" in data)) {
                    if (await this.getIdentityType(tx, data.identity_id) === "email") data.from_local_part = null;
                }

                const [updated] = await tx.update(campaignTable).set(data).where(eq(campaignTable.id, campaignId)).returning();

                // Checked only when the update touches the sender or the
                // schedule: a status-only update (the send pipeline marking a
                // campaign sent/failed) must never fail over sender settings,
                // or the campaign would be stuck in `sending`. Judged on the
                // row as it now stands, so a partial update is checked
                // together with the fields it left alone; throwing rolls it back.
                if (SENDER_CHECK_FIELDS.some((field) => field in data)) {
                    await this.assertValidSender(tx, updated!);
                }

                if ("start_time" in data && SCHEDULABLE_STATUSES.includes(before.status)) {
                    if (updated!.start_time) {
                        await scheduleCampaignDispatch(updated!);
                        const [scheduled] = await tx.update(campaignTable).set({ status: "scheduled" }).where(eq(campaignTable.id, campaignId)).returning();
                        return scheduled!;
                    } else {
                        await cancelCampaignDispatch(campaignId);
                        const [drafted] = await tx.update(campaignTable).set({ status: "draft" }).where(eq(campaignTable.id, campaignId)).returning();
                        return drafted!;
                    }
                }

                return updated!;
            });

            if (!campaign) {
                logger.warn({ campaignId }, `${this.constructor.name}.${this.update.name}: Campaign not found`);
                return null;
            }

            logger.debug({ campaignId }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.update.name}`);

            return campaign;
        } catch (error) {
            logger.error({ err: error, campaignId, data }, `Exception in ${this.constructor.name}.${this.update.name}: Failed to update campaign`);
            throw error;
        }
    }

    /**
     * Deletes a campaign and cancels its queued send.
     *
     * In one transaction it unlinks the campaign's templates, groups and
     * subscribers (they stay, with `campaign_id` cleared, so they can be
     * reused), drops its per-subscriber send history, and deletes the row.
     * Only after that commits is the pending dispatch job removed. If that
     * removal fails, the dispatch worker still skips a campaign that no
     * longer exists, so nothing is sent.
     *
     * @param campaignId - id of the campaign to delete.
     * @returns The deleted campaign row, or `null` if no match exists.
     * @throws {ValidationError} If the campaign is mid-send - its chunk jobs
     * are already in flight and would keep writing results for it.
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async delete(campaignId: string) {
        logger.info(`Start method: ${this.constructor.name}.${this.delete.name}`);
        logger.debug({ campaignId }, `Request:`);

        try {
            const campaign = await db.transaction(async (tx) => {
                const [before] = await tx.select().from(campaignTable).where(eq(campaignTable.id, campaignId));
                if (!before) return null;

                if (before.status === "sending") {
                    throw new ValidationError("This campaign is sending right now. Wait for the send to finish before deleting it.");
                }

                // Rows that point at the campaign would otherwise block the delete (no ON DELETE on these FKs).
                await tx.update(templateTable).set({ campaign_id: null }).where(eq(templateTable.campaign_id, campaignId));
                await tx.update(groupTable).set({ campaign_id: null }).where(eq(groupTable.campaign_id, campaignId));
                await tx.update(subscribersTable).set({ campaign_id: null }).where(eq(subscribersTable.campaign_id, campaignId));
                // Send history only means something alongside its campaign.
                await tx.delete(campaignDeliveryTable).where(eq(campaignDeliveryTable.campaign_id, campaignId));

                const [deleted] = await tx.delete(campaignTable).where(eq(campaignTable.id, campaignId)).returning();
                return deleted!;
            });

            if (!campaign) {
                logger.warn({ campaignId }, `${this.constructor.name}.${this.delete.name}: Campaign not found`);
                return null;
            }

            try {
                // No-op unless a dispatch job is still pending (scheduled, not yet fired).
                await cancelCampaignDispatch(campaignId);
            } catch (error) {
                // The row is already gone, so the worker will skip this job if it ever fires.
                logger.warn({ err: error, campaignId }, `${this.constructor.name}.${this.delete.name}: Failed to cancel dispatch job`);
            }

            logger.debug({ campaignId }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.delete.name}`);

            return campaign;
        } catch (error) {
            logger.error({ err: error, campaignId }, `Exception in ${this.constructor.name}.${this.delete.name}: Failed to delete campaign`);
            throw error;
        }
    }

    /**
     * Looks up the type of a sending identity.
     *
     * @param tx - The caller's transaction.
     * @param identityId - id of the identity.
     * @returns `email` or `domain`, or `null` if no such identity exists.
     */
    private async getIdentityType(tx: Transaction, identityId: string): Promise<IdentityType | null> {
        // Only the type matters to the sender rules, so only it is fetched.
        const [identity] = await tx.select({ type: identityTable.type }).from(identityTable).where(eq(identityTable.id, identityId));
        return identity?.type ?? null;
    }

    /**
     * Checks a campaign's From address settings against its identity: a
     * domain identity needs a valid `from_local_part`, an email identity
     * must not have one, and `from_name` must fit in a mail header (see
     * `senderProblem` in @mail-rocket/shared). A campaign with no identity
     * yet has nothing to check - it can't be scheduled until it has one.
     *
     * @param tx - The caller's transaction, so a failure rolls back its write.
     * @param campaign - The campaign row as just written.
     * @throws {ValidationError} If the identity doesn't exist or the sender settings don't fit it.
     */
    private async assertValidSender(tx: Transaction, campaign: ICampaign): Promise<void> {
        // No identity chosen yet, so there's no From address to judge.
        if (!campaign.identity_id) return;

        const type = await this.getIdentityType(tx, campaign.identity_id);
        // The foreign key normally prevents this, but a clear 400 beats a bare constraint error.
        if (!type) throw new ValidationError(`Identity ${campaign.identity_id} not found`);

        const problem = senderProblem(type, campaign.from_local_part, campaign.from_name);
        if (problem) throw new ValidationError(problem);
    }
}
