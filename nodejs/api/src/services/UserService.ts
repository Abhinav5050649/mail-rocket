import { and, asc, eq, gt } from "drizzle-orm";
import { db, logger, DEFAULT_PAGE_SIZE, type PaginationOptions } from "../libs";
import { userTable, type UserRole } from "../models";

/** Fields accepted when creating a new user row. */
export interface CreateUserInput {
    first_name?: string;
    last_name?: string;
    organization_id?: string;
    description?: string;
    normalized_name?: string;
    role?: UserRole;
}

/** Fields accepted when partially updating an existing user row. */
export interface UpdateUserInput {
    first_name?: string;
    last_name?: string;
    description?: string;
    normalized_name?: string;
    role?: UserRole;
}

/**
 * Data-access layer for `user` rows (organization members). Wraps
 * `userTable` (Drizzle) and adds structured logging around every
 * operation: `info` logs marking method start/end, `debug` logs of the
 * request params and response payload, `warn` if no matching row is found,
 * and `error` (with the full stack via the pino `err` serializer) if the
 * underlying query throws.
 */
export class UserService {

    /**
     * Creates a new user row.
     *
     * @param data - Fields for the new user.
     * @returns The created user row.
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async create(data: CreateUserInput) {
        logger.info(`Start method: ${this.constructor.name}.${this.create.name}`);
        logger.debug({ data }, `Request:`);

        try {
            const [user] = await db.insert(userTable).values(data).returning();

            logger.debug({ userId: user!.id }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.create.name}`);

            return user!;
        } catch (error) {
            logger.error({ err: error, data }, `Exception in ${this.constructor.name}.${this.create.name}: Failed to create user`);
            throw error;
        }
    }

    /**
     * Fetches a single user by id.
     *
     * @param userId - id of the user.
     * @returns The user row, or `null` if no match exists.
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async getById(userId: string) {
        logger.info(`Start method: ${this.constructor.name}.${this.getById.name}`);
        logger.debug({ userId }, `Request:`);

        try {
            const [user] = await db.select().from(userTable).where(eq(userTable.id, userId));

            if (!user) {
                logger.warn({ userId }, `${this.constructor.name}.${this.getById.name}: User not found`);
                return null;
            }

            logger.debug({ userId }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.getById.name}`);

            return user;
        } catch (error) {
            logger.error({ err: error, userId }, `Exception in ${this.constructor.name}.${this.getById.name}: Failed to get user`);
            throw error;
        }
    }

    /**
     * Lists every user belonging to a given organization, ordered by `id` ascending.
     *
     * @param organizationId - id of the organization.
     * @param options.count - max number of rows to return.
     * @param options.pageToken - id of the last row from the previous page;
     * rows are fetched starting strictly after it.
     * @returns Array of matching user rows (empty if none exist).
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async getByOrganization(organizationId: string, options?: PaginationOptions) {
        logger.info(`Start method: ${this.constructor.name}.${this.getByOrganization.name}`);
        logger.debug({ organizationId, options }, `Request:`);

        try {
            const conditions = [eq(userTable.organization_id, organizationId)];
            if (options?.pageToken) conditions.push(gt(userTable.id, options.pageToken));

            const users = await db.select().from(userTable).where(and(...conditions)).orderBy(asc(userTable.id))
                .limit(options?.count ?? DEFAULT_PAGE_SIZE);

            logger.debug({ organizationId, count: users.length }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.getByOrganization.name}`);

            return users;
        } catch (error) {
            logger.error({ err: error, organizationId, options }, `Exception in ${this.constructor.name}.${this.getByOrganization.name}: Failed to get users for organization`);
            throw error;
        }
    }

    /**
     * Partially updates a user row.
     *
     * @param userId - id of the user to update.
     * @param data - Fields to update.
     * @returns The updated user row, or `null` if no match exists.
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async update(userId: string, data: UpdateUserInput) {
        logger.info(`Start method: ${this.constructor.name}.${this.update.name}`);
        logger.debug({ userId, data }, `Request:`);

        try {
            const [user] = await db.update(userTable).set(data).where(eq(userTable.id, userId)).returning();

            if (!user) {
                logger.warn({ userId }, `${this.constructor.name}.${this.update.name}: User not found`);
                return null;
            }

            logger.debug({ userId }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.update.name}`);

            return user;
        } catch (error) {
            logger.error({ err: error, userId, data }, `Exception in ${this.constructor.name}.${this.update.name}: Failed to update user`);
            throw error;
        }
    }

    /**
     * Deletes a user row.
     *
     * @param userId - id of the user to delete.
     * @returns The deleted user row, or `null` if no match exists.
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async delete(userId: string) {
        logger.info(`Start method: ${this.constructor.name}.${this.delete.name}`);
        logger.debug({ userId }, `Request:`);

        try {
            const [user] = await db.delete(userTable).where(eq(userTable.id, userId)).returning();

            if (!user) {
                logger.warn({ userId }, `${this.constructor.name}.${this.delete.name}: User not found`);
                return null;
            }

            logger.debug({ userId }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.delete.name}`);

            return user;
        } catch (error) {
            logger.error({ err: error, userId }, `Exception in ${this.constructor.name}.${this.delete.name}: Failed to delete user`);
            throw error;
        }
    }
}
