import { and, asc, eq, gt } from "drizzle-orm";
import { db, logger, DEFAULT_PAGE_SIZE, type PaginationOptions } from "../libs";
import { contactDetailsTable } from "../models";

/** Fields accepted when creating a new contact_details row. */
export interface CreateContactDetailsInput {
    email_id?: string;
    country_code?: string;
    phone_number?: string;
    organization_id?: string;
    user_id?: string;
    description?: string;
}

/** Fields accepted when partially updating an existing contact_details row. */
export interface UpdateContactDetailsInput {
    email_id?: string;
    country_code?: string;
    phone_number?: string;
    description?: string;
}

/**
 * Data-access layer for `contact_details` rows. Wraps `contactDetailsTable`
 * (Drizzle) and adds structured logging around every operation: `info`
 * logs marking method start/end, `debug` logs of the request params and
 * response payload, `warn` if no matching row is found, and `error` (with
 * the full stack via the pino `err` serializer) if the underlying query
 * throws.
 */
export class ContactDetailsService {

    /**
     * Creates a new contact_details row.
     *
     * @param data - Fields for the new contact details.
     * @returns The created contact_details row.
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async create(data: CreateContactDetailsInput) {
        logger.info(`Start method: ${this.constructor.name}.${this.create.name}`);
        logger.debug({ data }, `Request:`);

        try {
            const [contactDetails] = await db.insert(contactDetailsTable).values(data).returning();

            logger.debug({ contactDetailsId: contactDetails!.id }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.create.name}`);

            return contactDetails!;
        } catch (error) {
            logger.error({ err: error, data }, `Exception in ${this.constructor.name}.${this.create.name}: Failed to create contact details`);
            throw error;
        }
    }

    /**
     * Fetches a single contact_details row by id.
     *
     * @param contactDetailsId - id of the contact details row.
     * @returns The contact_details row, or `null` if no match exists.
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async getById(contactDetailsId: string) {
        logger.info(`Start method: ${this.constructor.name}.${this.getById.name}`);
        logger.debug({ contactDetailsId }, `Request:`);

        try {
            const [contactDetails] = await db.select().from(contactDetailsTable).where(eq(contactDetailsTable.id, contactDetailsId));

            if (!contactDetails) {
                logger.warn({ contactDetailsId }, `${this.constructor.name}.${this.getById.name}: Contact details not found`);
                return null;
            }

            logger.debug({ contactDetailsId }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.getById.name}`);

            return contactDetails;
        } catch (error) {
            logger.error({ err: error, contactDetailsId }, `Exception in ${this.constructor.name}.${this.getById.name}: Failed to get contact details`);
            throw error;
        }
    }

    /**
     * Lists every contact_details row belonging to a given user, ordered by `id` ascending.
     *
     * @param userId - id of the user.
     * @param options.count - max number of rows to return.
     * @param options.pageToken - id of the last row from the previous page;
     * rows are fetched starting strictly after it.
     * @returns Array of matching contact_details rows (empty if none exist).
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async getByUser(userId: string, options?: PaginationOptions) {
        logger.info(`Start method: ${this.constructor.name}.${this.getByUser.name}`);
        logger.debug({ userId, options }, `Request:`);

        try {
            const conditions = [eq(contactDetailsTable.user_id, userId)];
            if (options?.pageToken) conditions.push(gt(contactDetailsTable.id, options.pageToken));

            const contactDetails = await db.select().from(contactDetailsTable).where(and(...conditions)).orderBy(asc(contactDetailsTable.id))
                .limit(options?.count ?? DEFAULT_PAGE_SIZE);

            logger.debug({ userId, count: contactDetails.length }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.getByUser.name}`);

            return contactDetails;
        } catch (error) {
            logger.error({ err: error, userId, options }, `Exception in ${this.constructor.name}.${this.getByUser.name}: Failed to get contact details for user`);
            throw error;
        }
    }

    /**
     * Lists every contact_details row belonging to a given organization, ordered by `id` ascending.
     *
     * @param organizationId - id of the organization.
     * @param options.count - max number of rows to return.
     * @param options.pageToken - id of the last row from the previous page;
     * rows are fetched starting strictly after it.
     * @returns Array of matching contact_details rows (empty if none exist).
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async getByOrganization(organizationId: string, options?: PaginationOptions) {
        logger.info(`Start method: ${this.constructor.name}.${this.getByOrganization.name}`);
        logger.debug({ organizationId, options }, `Request:`);

        try {
            const conditions = [eq(contactDetailsTable.organization_id, organizationId)];
            if (options?.pageToken) conditions.push(gt(contactDetailsTable.id, options.pageToken));

            const contactDetails = await db.select().from(contactDetailsTable).where(and(...conditions)).orderBy(asc(contactDetailsTable.id))
                .limit(options?.count ?? DEFAULT_PAGE_SIZE);

            logger.debug({ organizationId, count: contactDetails.length }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.getByOrganization.name}`);

            return contactDetails;
        } catch (error) {
            logger.error({ err: error, organizationId, options }, `Exception in ${this.constructor.name}.${this.getByOrganization.name}: Failed to get contact details for organization`);
            throw error;
        }
    }

    /**
     * Partially updates a contact_details row.
     *
     * @param contactDetailsId - id of the contact details row to update.
     * @param data - Fields to update.
     * @returns The updated contact_details row, or `null` if no match exists.
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async update(contactDetailsId: string, data: UpdateContactDetailsInput) {
        logger.info(`Start method: ${this.constructor.name}.${this.update.name}`);
        logger.debug({ contactDetailsId, data }, `Request:`);

        try {
            const [contactDetails] = await db.update(contactDetailsTable).set(data).where(eq(contactDetailsTable.id, contactDetailsId)).returning();

            if (!contactDetails) {
                logger.warn({ contactDetailsId }, `${this.constructor.name}.${this.update.name}: Contact details not found`);
                return null;
            }

            logger.debug({ contactDetailsId }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.update.name}`);

            return contactDetails;
        } catch (error) {
            logger.error({ err: error, contactDetailsId, data }, `Exception in ${this.constructor.name}.${this.update.name}: Failed to update contact details`);
            throw error;
        }
    }

    /**
     * Deletes a contact_details row.
     *
     * @param contactDetailsId - id of the contact details row to delete.
     * @returns The deleted contact_details row, or `null` if no match exists.
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async delete(contactDetailsId: string) {
        logger.info(`Start method: ${this.constructor.name}.${this.delete.name}`);
        logger.debug({ contactDetailsId }, `Request:`);

        try {
            const [contactDetails] = await db.delete(contactDetailsTable).where(eq(contactDetailsTable.id, contactDetailsId)).returning();

            if (!contactDetails) {
                logger.warn({ contactDetailsId }, `${this.constructor.name}.${this.delete.name}: Contact details not found`);
                return null;
            }

            logger.debug({ contactDetailsId }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.delete.name}`);

            return contactDetails;
        } catch (error) {
            logger.error({ err: error, contactDetailsId }, `Exception in ${this.constructor.name}.${this.delete.name}: Failed to delete contact details`);
            throw error;
        }
    }
}
