import { and, asc, eq } from "drizzle-orm";
import { db, logger, DEFAULT_PAGE_SIZE, type PaginationOptions } from "../libs";
import { organizationUserTable, organizationTable, userTable, type OrganizationUserRole } from "../models";

/** Fields accepted when adding a user to an organization. */
export interface CreateOrganizationUserInput {
    organization_id: string;
    user_id: string;
    role?: OrganizationUserRole;
    description?: string;
}

/** Fields accepted when partially updating an existing membership row. */
export interface UpdateOrganizationUserInput {
    role?: OrganizationUserRole;
    description?: string;
}

/**
 * Data-access layer for `organization_user` rows: the join table granting a
 * user membership (and a role) in an organization, which is what lets a
 * single user belong to multiple organizations. Wraps `organizationUserTable`
 * (Drizzle) and adds structured logging around every operation: `info` logs
 * marking method start/end, `debug` logs of the request params and response
 * payload, `warn` if no matching row is found, and `error` (with the full
 * stack via the pino `err` serializer) if the underlying query throws.
 */
export class OrganizationUserService {

    /**
     * Adds a user to an organization by creating a new membership row.
     *
     * @param data - Fields for the new membership.
     * @returns The created membership row.
     * @throws Re-throws any error from the underlying query (including a
     * unique-constraint violation if the user is already a member), after
     * logging it.
     */
    async create(data: CreateOrganizationUserInput) {
        logger.info(`Start method: ${this.constructor.name}.${this.create.name}`);
        logger.debug({ data }, `Request:`);

        try {
            const [organizationUser] = await db.insert(organizationUserTable).values(data).returning();

            logger.debug({ organizationUserId: organizationUser!.id }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.create.name}`);

            return organizationUser!;
        } catch (error) {
            logger.error({ err: error, data }, `Exception in ${this.constructor.name}.${this.create.name}: Failed to create membership`);
            throw error;
        }
    }

    /**
     * Fetches a single membership row by id.
     *
     * @param organizationUserId - id of the membership row.
     * @returns The membership row, or `null` if no match exists.
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async getById(organizationUserId: string) {
        logger.info(`Start method: ${this.constructor.name}.${this.getById.name}`);
        logger.debug({ organizationUserId }, `Request:`);

        try {
            const [organizationUser] = await db.select().from(organizationUserTable).where(eq(organizationUserTable.id, organizationUserId));

            if (!organizationUser) {
                logger.warn({ organizationUserId }, `${this.constructor.name}.${this.getById.name}: Membership not found`);
                return null;
            }

            logger.debug({ organizationUserId }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.getById.name}`);

            return organizationUser;
        } catch (error) {
            logger.error({ err: error, organizationUserId }, `Exception in ${this.constructor.name}.${this.getById.name}: Failed to get membership`);
            throw error;
        }
    }

    /**
     * Fetches a single membership row by its (organization, user) pair -
     * the natural way to address a specific user's membership from a
     * `/organizations/:organization_id/users/:user_id` route, without the
     * caller needing to know the membership row's own id.
     *
     * @param organizationId - id of the organization.
     * @param userId - id of the user.
     * @returns The membership row, or `null` if no match exists.
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async getByOrganizationAndUser(organizationId: string, userId: string) {
        logger.info(`Start method: ${this.constructor.name}.${this.getByOrganizationAndUser.name}`);
        logger.debug({ organizationId, userId }, `Request:`);

        try {
            const [organizationUser] = await db.select().from(organizationUserTable)
                .where(and(eq(organizationUserTable.organization_id, organizationId), eq(organizationUserTable.user_id, userId)));

            if (!organizationUser) {
                logger.warn({ organizationId, userId }, `${this.constructor.name}.${this.getByOrganizationAndUser.name}: Membership not found`);
                return null;
            }

            logger.debug({ organizationId, userId }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.getByOrganizationAndUser.name}`);

            return organizationUser;
        } catch (error) {
            logger.error({ err: error, organizationId, userId }, `Exception in ${this.constructor.name}.${this.getByOrganizationAndUser.name}: Failed to get membership`);
            throw error;
        }
    }

    /**
     * Lists every membership row for a given organization, ordered by `id` ascending.
     *
     * @param organizationId - id of the organization.
     * @param options.limit - max number of rows to return.
     * @param options.offset - number of rows to skip before returning results.
     * @returns Array of matching membership rows (empty if none exist).
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async getByOrganization(organizationId: string, options?: PaginationOptions) {
        logger.info(`Start method: ${this.constructor.name}.${this.getByOrganization.name}`);
        logger.debug({ organizationId, options }, `Request:`);

        try {
            const organizationUsers = await db.select().from(organizationUserTable).where(eq(organizationUserTable.organization_id, organizationId)).orderBy(asc(organizationUserTable.id))
                .limit(options?.limit ?? DEFAULT_PAGE_SIZE)
                .offset(options?.offset ?? 0);

            logger.debug({ organizationId, count: organizationUsers.length }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.getByOrganization.name}`);

            return organizationUsers;
        } catch (error) {
            logger.error({ err: error, organizationId, options }, `Exception in ${this.constructor.name}.${this.getByOrganization.name}: Failed to get memberships for organization`);
            throw error;
        }
    }

    /**
     * Lists every membership row for a given user, ordered by `id` ascending.
     *
     * @param userId - id of the user.
     * @param options.limit - max number of rows to return.
     * @param options.offset - number of rows to skip before returning results.
     * @returns Array of matching membership rows (empty if none exist).
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async getByUser(userId: string, options?: PaginationOptions) {
        logger.info(`Start method: ${this.constructor.name}.${this.getByUser.name}`);
        logger.debug({ userId, options }, `Request:`);

        try {
            const organizationUsers = await db.select().from(organizationUserTable).where(eq(organizationUserTable.user_id, userId)).orderBy(asc(organizationUserTable.id))
                .limit(options?.limit ?? DEFAULT_PAGE_SIZE)
                .offset(options?.offset ?? 0);

            logger.debug({ userId, count: organizationUsers.length }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.getByUser.name}`);

            return organizationUsers;
        } catch (error) {
            logger.error({ err: error, userId, options }, `Exception in ${this.constructor.name}.${this.getByUser.name}: Failed to get memberships for user`);
            throw error;
        }
    }

    /**
     * Lists the users belonging to an organization, each paired with their
     * membership row (which carries their `role`), ordered by the
     * membership's `id` ascending.
     *
     * @param organizationId - id of the organization.
     * @param options.limit - max number of rows to return.
     * @param options.offset - number of rows to skip before returning results.
     * @returns Array of `{ user, membership }` pairs (empty if none exist).
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async getUsersByOrganization(organizationId: string, options?: PaginationOptions) {
        logger.info(`Start method: ${this.constructor.name}.${this.getUsersByOrganization.name}`);
        logger.debug({ organizationId, options }, `Request:`);

        try {
            const rows = await db.select({ user: userTable, membership: organizationUserTable })
                .from(organizationUserTable)
                .innerJoin(userTable, eq(organizationUserTable.user_id, userTable.id))
                .where(eq(organizationUserTable.organization_id, organizationId))
                .orderBy(asc(organizationUserTable.id))
                .limit(options?.limit ?? DEFAULT_PAGE_SIZE)
                .offset(options?.offset ?? 0);

            logger.debug({ organizationId, count: rows.length }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.getUsersByOrganization.name}`);

            return rows;
        } catch (error) {
            logger.error({ err: error, organizationId, options }, `Exception in ${this.constructor.name}.${this.getUsersByOrganization.name}: Failed to get users for organization`);
            throw error;
        }
    }

    /**
     * Lists the organizations a user belongs to, each paired with their
     * membership row (which carries their `role`), ordered by the
     * membership's `id` ascending.
     *
     * @param userId - id of the user.
     * @param options.limit - max number of rows to return.
     * @param options.offset - number of rows to skip before returning results.
     * @returns Array of `{ organization, membership }` pairs (empty if none exist).
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async getOrganizationsByUser(userId: string, options?: PaginationOptions) {
        logger.info(`Start method: ${this.constructor.name}.${this.getOrganizationsByUser.name}`);
        logger.debug({ userId, options }, `Request:`);

        try {
            const rows = await db.select({ organization: organizationTable, membership: organizationUserTable })
                .from(organizationUserTable)
                .innerJoin(organizationTable, eq(organizationUserTable.organization_id, organizationTable.id))
                .where(eq(organizationUserTable.user_id, userId))
                .orderBy(asc(organizationUserTable.id))
                .limit(options?.limit ?? DEFAULT_PAGE_SIZE)
                .offset(options?.offset ?? 0);

            logger.debug({ userId, count: rows.length }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.getOrganizationsByUser.name}`);

            return rows;
        } catch (error) {
            logger.error({ err: error, userId, options }, `Exception in ${this.constructor.name}.${this.getOrganizationsByUser.name}: Failed to get organizations for user`);
            throw error;
        }
    }

    /**
     * Partially updates a membership row (e.g. to change the user's role).
     *
     * @param organizationUserId - id of the membership row to update.
     * @param data - Fields to update.
     * @returns The updated membership row, or `null` if no match exists.
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async update(organizationUserId: string, data: UpdateOrganizationUserInput) {
        logger.info(`Start method: ${this.constructor.name}.${this.update.name}`);
        logger.debug({ organizationUserId, data }, `Request:`);

        try {
            const [organizationUser] = await db.update(organizationUserTable).set(data).where(eq(organizationUserTable.id, organizationUserId)).returning();

            if (!organizationUser) {
                logger.warn({ organizationUserId }, `${this.constructor.name}.${this.update.name}: Membership not found`);
                return null;
            }

            logger.debug({ organizationUserId }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.update.name}`);

            return organizationUser;
        } catch (error) {
            logger.error({ err: error, organizationUserId, data }, `Exception in ${this.constructor.name}.${this.update.name}: Failed to update membership`);
            throw error;
        }
    }

    /**
     * Removes a user from an organization by deleting their membership row
     * (the user account itself is untouched).
     *
     * @param organizationUserId - id of the membership row to delete.
     * @returns The deleted membership row, or `null` if no match exists.
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async delete(organizationUserId: string) {
        logger.info(`Start method: ${this.constructor.name}.${this.delete.name}`);
        logger.debug({ organizationUserId }, `Request:`);

        try {
            const [organizationUser] = await db.delete(organizationUserTable).where(eq(organizationUserTable.id, organizationUserId)).returning();

            if (!organizationUser) {
                logger.warn({ organizationUserId }, `${this.constructor.name}.${this.delete.name}: Membership not found`);
                return null;
            }

            logger.debug({ organizationUserId }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.delete.name}`);

            return organizationUser;
        } catch (error) {
            logger.error({ err: error, organizationUserId }, `Exception in ${this.constructor.name}.${this.delete.name}: Failed to delete membership`);
            throw error;
        }
    }
}
