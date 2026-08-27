import { asc, eq } from "drizzle-orm";
import { db, logger, DEFAULT_PAGE_SIZE, type PaginationOptions } from "../libs";
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
 * operation: `info` logs marking method start/end, `debug` logs of the
 * request params and response payload, `warn` if no matching row is
 * found, and `error` (with the full stack via the pino `err` serializer)
 * if the underlying query throws.
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
        logger.info(`Start method: ${this.constructor.name}.${this.create.name}`);
        logger.debug({ data }, `Request:`);

        try {
            const [organization] = await db.insert(organizationTable).values(data).returning();

            logger.debug({ organizationId: organization!.id }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.create.name}`);

            return organization!;
        } catch (error) {
            logger.error({ err: error, data }, `Exception in ${this.constructor.name}.${this.create.name}: Failed to create organization`);
            throw error;
        }
    }

    /**
     * Lists organizations, ordered by `id` ascending.
     *
     * @param options.limit - max number of rows to return; defaults to
     * {@link DEFAULT_PAGE_SIZE}.
     * @param options.offset - number of rows to skip before returning results.
     * @returns Array of organization rows (empty if none exist).
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async getAll(options?: PaginationOptions) {
        logger.info(`Start method: ${this.constructor.name}.${this.getAll.name}`);
        logger.debug({ options }, `Request:`);

        try {
            const organizations = await db.select().from(organizationTable)
                .orderBy(asc(organizationTable.id))
                .limit(options?.limit ?? DEFAULT_PAGE_SIZE)
                .offset(options?.offset ?? 0);

            logger.debug({ count: organizations.length }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.getAll.name}`);

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
        logger.info(`Start method: ${this.constructor.name}.${this.getById.name}`);
        logger.debug({ organizationId }, `Request:`);

        try {
            const [organization] = await db.select().from(organizationTable).where(eq(organizationTable.id, organizationId));

            if (!organization) {
                logger.warn({ organizationId }, `${this.constructor.name}.${this.getById.name}: Organization not found`);
                return null;
            }

            logger.debug({ organizationId }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.getById.name}`);

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
        logger.info(`Start method: ${this.constructor.name}.${this.update.name}`);
        logger.debug({ organizationId, data }, `Request:`);

        try {
            const [organization] = await db.update(organizationTable).set(data).where(eq(organizationTable.id, organizationId)).returning();

            if (!organization) {
                logger.warn({ organizationId }, `${this.constructor.name}.${this.update.name}: Organization not found`);
                return null;
            }

            logger.debug({ organizationId }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.update.name}`);

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
        logger.info(`Start method: ${this.constructor.name}.${this.delete.name}`);
        logger.debug({ organizationId }, `Request:`);

        try {
            const [organization] = await db.delete(organizationTable).where(eq(organizationTable.id, organizationId)).returning();

            if (!organization) {
                logger.warn({ organizationId }, `${this.constructor.name}.${this.delete.name}: Organization not found`);
                return null;
            }

            logger.debug({ organizationId }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.delete.name}`);

            return organization;
        } catch (error) {
            logger.error({ err: error, organizationId }, `Exception in ${this.constructor.name}.${this.delete.name}: Failed to delete organization`);
            throw error;
        }
    }
}
