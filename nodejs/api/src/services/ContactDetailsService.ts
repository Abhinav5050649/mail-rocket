import { eq } from "drizzle-orm";
import { db, logger } from "../libs";
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
 * (Drizzle) and adds structured logging around every operation: an `info`
 * log when the operation starts, `info`/`warn` on completion depending on
 * whether a row was found, and `error` (with the full stack via the pino
 * `err` serializer) if the underlying query throws.
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
        try {
            logger.info({ data }, `${this.constructor.name}.${this.create.name}: Creating contact details`);

            const [contactDetails] = await db.insert(contactDetailsTable).values(data).returning();

            logger.info({ contactDetailsId: contactDetails!.id }, `${this.constructor.name}.${this.create.name}: Contact details created`);

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
        try {
            logger.info({ contactDetailsId }, `${this.constructor.name}.${this.getById.name}: Fetching contact details`);

            const [contactDetails] = await db.select().from(contactDetailsTable).where(eq(contactDetailsTable.id, contactDetailsId));

            if (!contactDetails) {
                logger.warn({ contactDetailsId }, `${this.constructor.name}.${this.getById.name}: Contact details not found`);
                return null;
            }

            logger.info({ contactDetailsId }, `${this.constructor.name}.${this.getById.name}: Contact details fetched`);

            return contactDetails;
        } catch (error) {
            logger.error({ err: error, contactDetailsId }, `Exception in ${this.constructor.name}.${this.getById.name}: Failed to get contact details`);
            throw error;
        }
    }

    /**
     * Lists every contact_details row belonging to a given user.
     *
     * @param userId - id of the user.
     * @returns Array of matching contact_details rows (empty if none exist).
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async getByUser(userId: string) {
        try {
            logger.info({ userId }, `${this.constructor.name}.${this.getByUser.name}: Fetching contact details for user`);

            const contactDetails = await db.select().from(contactDetailsTable).where(eq(contactDetailsTable.user_id, userId));

            logger.info({ userId, count: contactDetails.length }, `${this.constructor.name}.${this.getByUser.name}: Fetched contact details for user`);

            return contactDetails;
        } catch (error) {
            logger.error({ err: error, userId }, `Exception in ${this.constructor.name}.${this.getByUser.name}: Failed to get contact details for user`);
            throw error;
        }
    }

    /**
     * Lists every contact_details row belonging to a given organization.
     *
     * @param organizationId - id of the organization.
     * @param options.limit - max number of rows to return.
     * @param options.offset - number of rows to skip, for pagination.
     * @returns Array of matching contact_details rows (empty if none exist).
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async getByOrganization(organizationId: string, options?: { limit?: number; offset?: number }) {
        try {
            logger.info({ organizationId, options }, `${this.constructor.name}.${this.getByOrganization.name}: Fetching contact details for organization`);

            let query = db.select().from(contactDetailsTable).where(eq(contactDetailsTable.organization_id, organizationId)).$dynamic();
            if (options?.limit !== undefined) query = query.limit(options.limit);
            if (options?.offset !== undefined) query = query.offset(options.offset);

            const contactDetails = await query;

            logger.info({ organizationId, count: contactDetails.length }, `${this.constructor.name}.${this.getByOrganization.name}: Fetched contact details for organization`);

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
        try {
            logger.info({ contactDetailsId, data }, `${this.constructor.name}.${this.update.name}: Updating contact details`);

            const [contactDetails] = await db.update(contactDetailsTable).set(data).where(eq(contactDetailsTable.id, contactDetailsId)).returning();

            if (!contactDetails) {
                logger.warn({ contactDetailsId }, `${this.constructor.name}.${this.update.name}: Contact details not found`);
                return null;
            }

            logger.info({ contactDetailsId }, `${this.constructor.name}.${this.update.name}: Contact details updated`);

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
        try {
            logger.info({ contactDetailsId }, `${this.constructor.name}.${this.delete.name}: Deleting contact details`);

            const [contactDetails] = await db.delete(contactDetailsTable).where(eq(contactDetailsTable.id, contactDetailsId)).returning();

            if (!contactDetails) {
                logger.warn({ contactDetailsId }, `${this.constructor.name}.${this.delete.name}: Contact details not found`);
                return null;
            }

            logger.info({ contactDetailsId }, `${this.constructor.name}.${this.delete.name}: Contact details deleted`);

            return contactDetails;
        } catch (error) {
            logger.error({ err: error, contactDetailsId }, `Exception in ${this.constructor.name}.${this.delete.name}: Failed to delete contact details`);
            throw error;
        }
    }
}
