import { eq } from "drizzle-orm";
import { db, logger } from "../libs";
import { campaignTable } from "../models";

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
}

/** Fields accepted when partially updating an existing campaign row. */
export interface UpdateCampaignInput {
    name?: string;
    subject?: string;
    logo_key?: string;
    logo_bucket?: string;
    start_time?: Date;
    normalized_name?: string;
    description?: string;
}

/**
 * Data-access layer for `campaign` rows. Wraps `campaignTable` (Drizzle)
 * and adds structured logging around every operation: an `info` log when
 * the operation starts, `info`/`warn` on completion depending on whether a
 * row was found, and `error` (with the full stack via the pino `err`
 * serializer) if the underlying query throws.
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
        try {
            logger.info({ data }, `${this.constructor.name}.${this.create.name}: Creating campaign`);

            const [campaign] = await db.insert(campaignTable).values(data).returning();

            logger.info({ campaignId: campaign!.id }, `${this.constructor.name}.${this.create.name}: Campaign created`);

            return campaign!;
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
        try {
            logger.info({ campaignId }, `${this.constructor.name}.${this.getById.name}: Fetching campaign`);

            const [campaign] = await db.select().from(campaignTable).where(eq(campaignTable.id, campaignId));

            if (!campaign) {
                logger.warn({ campaignId }, `${this.constructor.name}.${this.getById.name}: Campaign not found`);
                return null;
            }

            logger.info({ campaignId }, `${this.constructor.name}.${this.getById.name}: Campaign fetched`);

            return campaign;
        } catch (error) {
            logger.error({ err: error, campaignId }, `Exception in ${this.constructor.name}.${this.getById.name}: Failed to get campaign`);
            throw error;
        }
    }

    /**
     * Lists every campaign belonging to a given organization.
     *
     * @param organizationId - id of the organization.
     * @returns Array of matching campaign rows (empty if none exist).
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async getByOrganization(organizationId: string) {
        try {
            logger.info({ organizationId }, `${this.constructor.name}.${this.getByOrganization.name}: Fetching campaigns for organization`);

            const campaigns = await db.select().from(campaignTable).where(eq(campaignTable.organization_id, organizationId));

            logger.info({ organizationId, count: campaigns.length }, `${this.constructor.name}.${this.getByOrganization.name}: Fetched campaigns for organization`);

            return campaigns;
        } catch (error) {
            logger.error({ err: error, organizationId }, `Exception in ${this.constructor.name}.${this.getByOrganization.name}: Failed to get campaigns for organization`);
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
        try {
            logger.info({ campaignId, data }, `${this.constructor.name}.${this.update.name}: Updating campaign`);

            const [campaign] = await db.update(campaignTable).set(data).where(eq(campaignTable.id, campaignId)).returning();

            if (!campaign) {
                logger.warn({ campaignId }, `${this.constructor.name}.${this.update.name}: Campaign not found`);
                return null;
            }

            logger.info({ campaignId }, `${this.constructor.name}.${this.update.name}: Campaign updated`);

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
        try {
            logger.info({ campaignId }, `${this.constructor.name}.${this.delete.name}: Deleting campaign`);

            const [campaign] = await db.delete(campaignTable).where(eq(campaignTable.id, campaignId)).returning();

            if (!campaign) {
                logger.warn({ campaignId }, `${this.constructor.name}.${this.delete.name}: Campaign not found`);
                return null;
            }

            logger.info({ campaignId }, `${this.constructor.name}.${this.delete.name}: Campaign deleted`);

            return campaign;
        } catch (error) {
            logger.error({ err: error, campaignId }, `Exception in ${this.constructor.name}.${this.delete.name}: Failed to delete campaign`);
            throw error;
        }
    }
}
