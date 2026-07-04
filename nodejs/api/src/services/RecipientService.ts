import { eq } from "drizzle-orm";
import { db, logger } from "../libs";
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
 * logging around every operation: an `info` log when the operation
 * starts, `info`/`warn` on completion depending on whether a row was
 * found, and `error` (with the full stack via the pino `err` serializer)
 * if the underlying query throws.
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
        try {
            logger.info({ data }, `${this.constructor.name}.${this.create.name}: Creating recipient`);

            const [recipient] = await db.insert(recipientsTable).values(data).returning();

            logger.info({ recipientId: recipient!.id }, `${this.constructor.name}.${this.create.name}: Recipient created`);

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
        try {
            logger.info({ recipientId }, `${this.constructor.name}.${this.getById.name}: Fetching recipient`);

            const [recipient] = await db.select().from(recipientsTable).where(eq(recipientsTable.id, recipientId));

            if (!recipient) {
                logger.warn({ recipientId }, `${this.constructor.name}.${this.getById.name}: Recipient not found`);
                return null;
            }

            logger.info({ recipientId }, `${this.constructor.name}.${this.getById.name}: Recipient fetched`);

            return recipient;
        } catch (error) {
            logger.error({ err: error, recipientId }, `Exception in ${this.constructor.name}.${this.getById.name}: Failed to get recipient`);
            throw error;
        }
    }

    /**
     * Lists every recipient belonging to a given group.
     *
     * @param groupId - id of the group.
     * @returns Array of matching recipient rows (empty if none exist).
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async getByGroup(groupId: string) {
        try {
            logger.info({ groupId }, `${this.constructor.name}.${this.getByGroup.name}: Fetching recipients for group`);

            const recipients = await db.select().from(recipientsTable).where(eq(recipientsTable.group_id, groupId));

            logger.info({ groupId, count: recipients.length }, `${this.constructor.name}.${this.getByGroup.name}: Fetched recipients for group`);

            return recipients;
        } catch (error) {
            logger.error({ err: error, groupId }, `Exception in ${this.constructor.name}.${this.getByGroup.name}: Failed to get recipients for group`);
            throw error;
        }
    }

    /**
     * Lists every recipient belonging to a given campaign.
     *
     * @param campaignId - id of the campaign.
     * @returns Array of matching recipient rows (empty if none exist).
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async getByCampaign(campaignId: string) {
        try {
            logger.info({ campaignId }, `${this.constructor.name}.${this.getByCampaign.name}: Fetching recipients for campaign`);

            const recipients = await db.select().from(recipientsTable).where(eq(recipientsTable.campaign_id, campaignId));

            logger.info({ campaignId, count: recipients.length }, `${this.constructor.name}.${this.getByCampaign.name}: Fetched recipients for campaign`);

            return recipients;
        } catch (error) {
            logger.error({ err: error, campaignId }, `Exception in ${this.constructor.name}.${this.getByCampaign.name}: Failed to get recipients for campaign`);
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
        try {
            logger.info({ recipientId, data }, `${this.constructor.name}.${this.update.name}: Updating recipient`);

            const [recipient] = await db.update(recipientsTable).set(data).where(eq(recipientsTable.id, recipientId)).returning();

            if (!recipient) {
                logger.warn({ recipientId }, `${this.constructor.name}.${this.update.name}: Recipient not found`);
                return null;
            }

            logger.info({ recipientId }, `${this.constructor.name}.${this.update.name}: Recipient updated`);

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
        try {
            logger.info({ recipientId }, `${this.constructor.name}.${this.delete.name}: Deleting recipient`);

            const [recipient] = await db.delete(recipientsTable).where(eq(recipientsTable.id, recipientId)).returning();

            if (!recipient) {
                logger.warn({ recipientId }, `${this.constructor.name}.${this.delete.name}: Recipient not found`);
                return null;
            }

            logger.info({ recipientId }, `${this.constructor.name}.${this.delete.name}: Recipient deleted`);

            return recipient;
        } catch (error) {
            logger.error({ err: error, recipientId }, `Exception in ${this.constructor.name}.${this.delete.name}: Failed to delete recipient`);
            throw error;
        }
    }
}
