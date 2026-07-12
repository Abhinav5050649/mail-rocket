import { and, asc, eq, gt } from "drizzle-orm";
import { db, logger, DEFAULT_PAGE_SIZE, type PaginationOptions } from "../libs";
import { identityTable, type IdentityType, type IdentityStatus } from "../models";

/** Fields accepted when creating a new identity row. */
export interface CreateIdentityInput {
    type: IdentityType;
    identity: string;
    organization_id?: string;
    status?: IdentityStatus;
    description?: string;
}

/** Fields accepted when partially updating an existing identity row. */
export interface UpdateIdentityInput {
    type?: IdentityType;
    identity?: string;
    status?: IdentityStatus;
    description?: string;
}

/**
 * Data-access layer for `identity` rows (domains/email addresses an
 * organization sends from). Wraps `identityTable` (Drizzle) and adds
 * structured logging around every operation: an `info` log when the
 * operation starts, `info`/`warn` on completion depending on whether a row
 * was found, and `error` (with the full stack via the pino `err`
 * serializer) if the underlying query throws.
 */
export class IdentityService {

    /**
     * Creates a new identity row.
     *
     * @param data - Fields for the new identity.
     * @returns The created identity row.
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async create(data: CreateIdentityInput) {
        try {
            logger.info({ data }, `${this.constructor.name}.${this.create.name}: Creating identity`);

            const [identity] = await db.insert(identityTable).values(data).returning();

            logger.info({ identityId: identity!.id }, `${this.constructor.name}.${this.create.name}: Identity created`);

            return identity!;
        } catch (error) {
            logger.error({ err: error, data }, `Exception in ${this.constructor.name}.${this.create.name}: Failed to create identity`);
            throw error;
        }
    }

    /**
     * Fetches a single identity by id.
     *
     * @param identityId - id of the identity.
     * @returns The identity row, or `null` if no match exists.
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async getById(identityId: string) {
        try {
            logger.info({ identityId }, `${this.constructor.name}.${this.getById.name}: Fetching identity`);

            const [identity] = await db.select().from(identityTable).where(eq(identityTable.id, identityId));

            if (!identity) {
                logger.warn({ identityId }, `${this.constructor.name}.${this.getById.name}: Identity not found`);
                return null;
            }

            logger.info({ identityId }, `${this.constructor.name}.${this.getById.name}: Identity fetched`);

            return identity;
        } catch (error) {
            logger.error({ err: error, identityId }, `Exception in ${this.constructor.name}.${this.getById.name}: Failed to get identity`);
            throw error;
        }
    }

    /**
     * Lists every identity belonging to a given organization, ordered by `id` ascending.
     *
     * @param organizationId - id of the organization.
     * @param options.type - optional filter on the `type` column.
     * @param options.status - optional filter on the `status` column.
     * @param options.count - max number of rows to return.
     * @param options.pageToken - id of the last row from the previous page;
     * rows are fetched starting strictly after it.
     * @returns Array of matching identity rows (empty if none exist).
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async getByOrganization(organizationId: string, options?: PaginationOptions & { type?: IdentityType; status?: IdentityStatus }) {
        try {
            logger.info({ organizationId, options }, `${this.constructor.name}.${this.getByOrganization.name}: Fetching identities for organization`);

            const conditions = [eq(identityTable.organization_id, organizationId)];
            if (options?.type !== undefined) conditions.push(eq(identityTable.type, options.type));
            if (options?.status !== undefined) conditions.push(eq(identityTable.status, options.status));
            if (options?.pageToken) conditions.push(gt(identityTable.id, options.pageToken));

            const identities = await db.select().from(identityTable).where(and(...conditions)).orderBy(asc(identityTable.id))
                .limit(options?.count ?? DEFAULT_PAGE_SIZE);

            logger.info({ organizationId, count: identities.length }, `${this.constructor.name}.${this.getByOrganization.name}: Fetched identities for organization`);

            return identities;
        } catch (error) {
            logger.error({ err: error, organizationId, options }, `Exception in ${this.constructor.name}.${this.getByOrganization.name}: Failed to get identities for organization`);
            throw error;
        }
    }

    /**
     * Partially updates an identity row.
     *
     * @param identityId - id of the identity to update.
     * @param data - Fields to update.
     * @returns The updated identity row, or `null` if no match exists.
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async update(identityId: string, data: UpdateIdentityInput) {
        try {
            logger.info({ identityId, data }, `${this.constructor.name}.${this.update.name}: Updating identity`);

            const [identity] = await db.update(identityTable).set(data).where(eq(identityTable.id, identityId)).returning();

            if (!identity) {
                logger.warn({ identityId }, `${this.constructor.name}.${this.update.name}: Identity not found`);
                return null;
            }

            logger.info({ identityId }, `${this.constructor.name}.${this.update.name}: Identity updated`);

            return identity;
        } catch (error) {
            logger.error({ err: error, identityId, data }, `Exception in ${this.constructor.name}.${this.update.name}: Failed to update identity`);
            throw error;
        }
    }

    /**
     * Deletes an identity row.
     *
     * @param identityId - id of the identity to delete.
     * @returns The deleted identity row, or `null` if no match exists.
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async delete(identityId: string) {
        try {
            logger.info({ identityId }, `${this.constructor.name}.${this.delete.name}: Deleting identity`);

            const [identity] = await db.delete(identityTable).where(eq(identityTable.id, identityId)).returning();

            if (!identity) {
                logger.warn({ identityId }, `${this.constructor.name}.${this.delete.name}: Identity not found`);
                return null;
            }

            logger.info({ identityId }, `${this.constructor.name}.${this.delete.name}: Identity deleted`);

            return identity;
        } catch (error) {
            logger.error({ err: error, identityId }, `Exception in ${this.constructor.name}.${this.delete.name}: Failed to delete identity`);
            throw error;
        }
    }
}
