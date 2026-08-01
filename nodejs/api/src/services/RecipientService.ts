import { asc, eq } from "drizzle-orm";
import { db, logger, DEFAULT_PAGE_SIZE, type PaginationOptions } from "../libs";
import { recipientsTable } from "../models";

/** Fields accepted when creating a new recipient row. */
export interface CreateRecipientInput {
    first_name?: string;
    last_name?: string;
    normalized_name?: string;
    email_id?: string;
    group_id?: string;
    campaign_id?: string;
    organization_id?: string;
    description?: string;
}

/** Fields accepted when partially updating an existing recipient row. */
export interface UpdateRecipientInput {
    first_name?: string;
    last_name?: string;
    normalized_name?: string;
    email_id?: string;
    description?: string;
}

/**
 * Data-access layer for `recipients` rows (people targeted by a
 * campaign/group). Wraps `recipientsTable` (Drizzle) and adds structured
 * logging around every operation: `info` logs marking method start/end,
 * `debug` logs of the request params and response payload, `warn` if no
 * matching row is found, and `error` (with the full stack via the pino
 * `err` serializer) if the underlying query throws.
 */
export class RecipientService {

    /**
     * Creates a new recipient row.
     *
     * @param data - Fields for the new recipient.
     * @returns The created recipient row.
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async create(data: CreateRecipientInput) {
        logger.info(`Start method: ${this.constructor.name}.${this.create.name}`);
        logger.debug({ data }, `Request:`);

        try {
            const [recipient] = await db.insert(recipientsTable).values(data).returning();

            logger.debug({ recipientId: recipient!.id }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.create.name}`);

            return recipient!;
        } catch (error) {
            logger.error({ err: error, data }, `Exception in ${this.constructor.name}.${this.create.name}: Failed to create recipient`);
            throw error;
        }
    }

    /**
     * Fetches a single recipient by id.
     *
     * @param recipientId - id of the recipient.
     * @returns The recipient row, or `null` if no match exists.
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async getById(recipientId: string) {
        logger.info(`Start method: ${this.constructor.name}.${this.getById.name}`);
        logger.debug({ recipientId }, `Request:`);

        try {
            const [recipient] = await db.select().from(recipientsTable).where(eq(recipientsTable.id, recipientId));

            if (!recipient) {
                logger.warn({ recipientId }, `${this.constructor.name}.${this.getById.name}: Recipient not found`);
                return null;
            }

            logger.debug({ recipientId }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.getById.name}`);

            return recipient;
        } catch (error) {
            logger.error({ err: error, recipientId }, `Exception in ${this.constructor.name}.${this.getById.name}: Failed to get recipient`);
            throw error;
        }
    }

    /**
     * Lists every recipient belonging to a given group, ordered by `id` ascending.
     *
     * @param groupId - id of the group.
     * @param options.limit - max number of rows to return.
     * @param options.offset - number of rows to skip before returning results.
     * @returns Array of matching recipient rows (empty if none exist).
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async getByGroup(groupId: string, options?: PaginationOptions) {
        logger.info(`Start method: ${this.constructor.name}.${this.getByGroup.name}`);
        logger.debug({ groupId, options }, `Request:`);

        try {
            const recipients = await db.select().from(recipientsTable).where(eq(recipientsTable.group_id, groupId)).orderBy(asc(recipientsTable.id))
                .limit(options?.limit ?? DEFAULT_PAGE_SIZE)
                .offset(options?.offset ?? 0);

            logger.debug({ groupId, count: recipients.length }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.getByGroup.name}`);

            return recipients;
        } catch (error) {
            logger.error({ err: error, groupId, options }, `Exception in ${this.constructor.name}.${this.getByGroup.name}: Failed to get recipients for group`);
            throw error;
        }
    }

    /**
     * Lists every recipient belonging to a given organization, ordered by `id` ascending.
     *
     * @param organizationId - id of the organization.
     * @param options.limit - max number of rows to return.
     * @param options.offset - number of rows to skip before returning results.
     * @returns Array of matching recipient rows (empty if none exist).
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async getByOrganization(organizationId: string, options?: PaginationOptions) {
        logger.info(`Start method: ${this.constructor.name}.${this.getByOrganization.name}`);
        logger.debug({ organizationId, options }, `Request:`);

        try {
            const recipients = await db.select().from(recipientsTable).where(eq(recipientsTable.organization_id, organizationId)).orderBy(asc(recipientsTable.id))
                .limit(options?.limit ?? DEFAULT_PAGE_SIZE)
                .offset(options?.offset ?? 0);

            logger.debug({ organizationId, count: recipients.length }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.getByOrganization.name}`);

            return recipients;
        } catch (error) {
            logger.error({ err: error, organizationId, options }, `Exception in ${this.constructor.name}.${this.getByOrganization.name}: Failed to get recipients for organization`);
            throw error;
        }
    }

    /**
     * Lists every recipient belonging to a given campaign, ordered by `id` ascending.
     *
     * @param campaignId - id of the campaign.
     * @param options.limit - max number of rows to return.
     * @param options.offset - number of rows to skip before returning results.
     * @returns Array of matching recipient rows (empty if none exist).
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async getByCampaign(campaignId: string, options?: PaginationOptions) {
        logger.info(`Start method: ${this.constructor.name}.${this.getByCampaign.name}`);
        logger.debug({ campaignId, options }, `Request:`);

        try {
            const recipients = await db.select().from(recipientsTable).where(eq(recipientsTable.campaign_id, campaignId)).orderBy(asc(recipientsTable.id))
                .limit(options?.limit ?? DEFAULT_PAGE_SIZE)
                .offset(options?.offset ?? 0);

            logger.debug({ campaignId, count: recipients.length }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.getByCampaign.name}`);

            return recipients;
        } catch (error) {
            logger.error({ err: error, campaignId, options }, `Exception in ${this.constructor.name}.${this.getByCampaign.name}: Failed to get recipients for campaign`);
            throw error;
        }
    }

    /**
     * Partially updates a recipient row.
     *
     * @param recipientId - id of the recipient to update.
     * @param data - Fields to update.
     * @returns The updated recipient row, or `null` if no match exists.
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async update(recipientId: string, data: UpdateRecipientInput) {
        logger.info(`Start method: ${this.constructor.name}.${this.update.name}`);
        logger.debug({ recipientId, data }, `Request:`);

        try {
            const [recipient] = await db.update(recipientsTable).set(data).where(eq(recipientsTable.id, recipientId)).returning();

            if (!recipient) {
                logger.warn({ recipientId }, `${this.constructor.name}.${this.update.name}: Recipient not found`);
                return null;
            }

            logger.debug({ recipientId }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.update.name}`);

            return recipient;
        } catch (error) {
            logger.error({ err: error, recipientId, data }, `Exception in ${this.constructor.name}.${this.update.name}: Failed to update recipient`);
            throw error;
        }
    }

    /**
     * Deletes a recipient row.
     *
     * @param recipientId - id of the recipient to delete.
     * @returns The deleted recipient row, or `null` if no match exists.
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async delete(recipientId: string) {
        logger.info(`Start method: ${this.constructor.name}.${this.delete.name}`);
        logger.debug({ recipientId }, `Request:`);

        try {
            const [recipient] = await db.delete(recipientsTable).where(eq(recipientsTable.id, recipientId)).returning();

            if (!recipient) {
                logger.warn({ recipientId }, `${this.constructor.name}.${this.delete.name}: Recipient not found`);
                return null;
            }

            logger.debug({ recipientId }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.delete.name}`);

            return recipient;
        } catch (error) {
            logger.error({ err: error, recipientId }, `Exception in ${this.constructor.name}.${this.delete.name}: Failed to delete recipient`);
            throw error;
        }
    }
}
