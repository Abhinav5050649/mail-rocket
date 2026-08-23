import { and, asc, eq } from "drizzle-orm";
import { db, logger, DEFAULT_PAGE_SIZE, type PaginationOptions } from "../libs";
import { campaignTable, type CampaignStatus } from "../models";
// Imported directly from CampaignDispatch (not the `../queues` barrel) to
// avoid a circular import: the barrel also re-exports CampaignWorkers.ts,
// which imports SendCampaignService from the services barrel - which would
// pull in this very file again mid-initialization.
import { scheduleCampaignDispatch, cancelCampaignDispatch } from "../queues/CampaignDispatch";

/** Campaign statuses whose `start_time` can still be (re)scheduled. */
const SCHEDULABLE_STATUSES: (CampaignStatus | null)[] = ["draft", "scheduled", null];

/** Fields accepted when creating a new campaign row. */
export interface CreateCampaignInput {
    name?: string;
    subject?: string;
    logo_key?: string;
    logo_bucket?: string;
    organization_id?: string;
    start_time?: Date;
    organizer_id?: string;
    normalized_name?: string;
    description?: string;
    status?: CampaignStatus;
    identity_id?: string;
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
    send_failure_reason?: string;
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
            // Wrapped in a transaction so that if scheduling fails (e.g. no
            // identity_id yet), the insert rolls back too, rather than
            // leaving behind a campaign row the caller was told didn't get created.
            const campaign = await db.transaction(async (tx) => {
                const [inserted] = await tx.insert(campaignTable).values(data).returning();

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
     * Lists every campaign belonging to a given organization, ordered by `id` ascending.
     *
     * @param organizationId - id of the organization.
     * @param options.status - optional filter on the `status` column.
     * @param options.limit - max number of rows to return.
     * @param options.offset - number of rows to skip before returning results.
     * @returns Array of matching campaign rows (empty if none exist).
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async getByOrganization(organizationId: string, options?: PaginationOptions & { status?: CampaignStatus }) {
        logger.info(`Start method: ${this.constructor.name}.${this.getByOrganization.name}`);
        logger.debug({ organizationId, options }, `Request:`);

        try {
            const conditions = [eq(campaignTable.organization_id, organizationId)];
            if (options?.status !== undefined) conditions.push(eq(campaignTable.status, options.status));

            const campaigns = await db.select().from(campaignTable).where(and(...conditions)).orderBy(asc(campaignTable.id))
                .limit(options?.limit ?? DEFAULT_PAGE_SIZE)
                .offset(options?.offset ?? 0);

            logger.debug({ organizationId, count: campaigns.length }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.getByOrganization.name}`);

            return campaigns;
        } catch (error) {
            logger.error({ err: error, organizationId, options }, `Exception in ${this.constructor.name}.${this.getByOrganization.name}: Failed to get campaigns for organization`);
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
            const campaign = await db.transaction(async (tx) => {
                const [before] = await tx.select().from(campaignTable).where(eq(campaignTable.id, campaignId));
                if (!before) return null;

                const [updated] = await tx.update(campaignTable).set(data).where(eq(campaignTable.id, campaignId)).returning();

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
     * Deletes a campaign row.
     *
     * @param campaignId - id of the campaign to delete.
     * @returns The deleted campaign row, or `null` if no match exists.
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async delete(campaignId: string) {
        logger.info(`Start method: ${this.constructor.name}.${this.delete.name}`);
        logger.debug({ campaignId }, `Request:`);

        try {
            const [campaign] = await db.delete(campaignTable).where(eq(campaignTable.id, campaignId)).returning();

            if (!campaign) {
                logger.warn({ campaignId }, `${this.constructor.name}.${this.delete.name}: Campaign not found`);
                return null;
            }

            logger.debug({ campaignId }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.delete.name}`);

            return campaign;
        } catch (error) {
            logger.error({ err: error, campaignId }, `Exception in ${this.constructor.name}.${this.delete.name}: Failed to delete campaign`);
            throw error;
        }
    }
}
