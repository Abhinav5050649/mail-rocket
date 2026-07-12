import { eq } from "drizzle-orm";
import { db, logger } from "../libs";
import { organizationTable } from "../models";

/** Fields accepted when creating a new organization row. */
export interface CreateOrganizationInput {
    name?: string;
    normalized_name?: string;
    description?: string;
}

/** Fields accepted when partially updating an existing organization row. */
export interface UpdateOrganizationInput {
    name?: string;
    normalized_name?: string;
    description?: string;
}

/**
 * Data-access layer for `organization` rows (tenants). Wraps
 * `organizationTable` (Drizzle) and adds structured logging around every
 * operation: an `info` log when the operation starts, `info`/`warn` on
 * completion depending on whether a row was found, and `error` (with the
 * full stack via the pino `err` serializer) if the underlying query throws.
 */
export class OrganizationService {

    /**
     * Creates a new organization row.
     *
     * @param data - Fields for the new organization.
     * @returns The created organization row.
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async create(data: CreateOrganizationInput) {
        try {
            logger.info({ data }, `${this.constructor.name}.${this.create.name}: Creating organization`);

            const [organization] = await db.insert(organizationTable).values(data).returning();

            logger.info({ organizationId: organization!.id }, `${this.constructor.name}.${this.create.name}: Organization created`);

            return organization!;
        } catch (error) {
            logger.error({ err: error, data }, `Exception in ${this.constructor.name}.${this.create.name}: Failed to create organization`);
            throw error;
        }
    }

    /**
     * Lists organizations.
     *
     * @param options.limit - max number of rows to return.
     * @param options.offset - number of rows to skip, for pagination.
     * @returns Array of organization rows (empty if none exist).
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async getAll(options?: { limit?: number; offset?: number }) {
        try {
            logger.info({ options }, `${this.constructor.name}.${this.getAll.name}: Fetching organizations`);

            let query = db.select().from(organizationTable).$dynamic();
            if (options?.limit !== undefined) query = query.limit(options.limit);
            if (options?.offset !== undefined) query = query.offset(options.offset);

            const organizations = await query;

            logger.info({ count: organizations.length }, `${this.constructor.name}.${this.getAll.name}: Fetched organizations`);

            return organizations;
        } catch (error) {
            logger.error({ err: error, options }, `Exception in ${this.constructor.name}.${this.getAll.name}: Failed to get organizations`);
            throw error;
        }
    }

    /**
     * Fetches a single organization by id.
     *
     * @param organizationId - id of the organization.
     * @returns The organization row, or `null` if no match exists.
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async getById(organizationId: string) {
        try {
            logger.info({ organizationId }, `${this.constructor.name}.${this.getById.name}: Fetching organization`);

            const [organization] = await db.select().from(organizationTable).where(eq(organizationTable.id, organizationId));

            if (!organization) {
                logger.warn({ organizationId }, `${this.constructor.name}.${this.getById.name}: Organization not found`);
                return null;
            }

            logger.info({ organizationId }, `${this.constructor.name}.${this.getById.name}: Organization fetched`);

            return organization;
        } catch (error) {
            logger.error({ err: error, organizationId }, `Exception in ${this.constructor.name}.${this.getById.name}: Failed to get organization`);
            throw error;
        }
    }

    /**
     * Partially updates an organization row.
     *
     * @param organizationId - id of the organization to update.
     * @param data - Fields to update.
     * @returns The updated organization row, or `null` if no match exists.
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async update(organizationId: string, data: UpdateOrganizationInput) {
        try {
            logger.info({ organizationId, data }, `${this.constructor.name}.${this.update.name}: Updating organization`);

            const [organization] = await db.update(organizationTable).set(data).where(eq(organizationTable.id, organizationId)).returning();

            if (!organization) {
                logger.warn({ organizationId }, `${this.constructor.name}.${this.update.name}: Organization not found`);
                return null;
            }

            logger.info({ organizationId }, `${this.constructor.name}.${this.update.name}: Organization updated`);

            return organization;
        } catch (error) {
            logger.error({ err: error, organizationId, data }, `Exception in ${this.constructor.name}.${this.update.name}: Failed to update organization`);
            throw error;
        }
    }

    /**
     * Deletes an organization row.
     *
     * @param organizationId - id of the organization to delete.
     * @returns The deleted organization row, or `null` if no match exists.
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async delete(organizationId: string) {
        try {
            logger.info({ organizationId }, `${this.constructor.name}.${this.delete.name}: Deleting organization`);

            const [organization] = await db.delete(organizationTable).where(eq(organizationTable.id, organizationId)).returning();

            if (!organization) {
                logger.warn({ organizationId }, `${this.constructor.name}.${this.delete.name}: Organization not found`);
                return null;
            }

            logger.info({ organizationId }, `${this.constructor.name}.${this.delete.name}: Organization deleted`);

            return organization;
        } catch (error) {
            logger.error({ err: error, organizationId }, `Exception in ${this.constructor.name}.${this.delete.name}: Failed to delete organization`);
            throw error;
        }
    }
}
