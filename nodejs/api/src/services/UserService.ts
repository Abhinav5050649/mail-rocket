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
 * operation: an `info` log when the operation starts, `info`/`warn` on
 * completion depending on whether a row was found, and `error` (with the
 * full stack via the pino `err` serializer) if the underlying query throws.
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
        try {
            logger.info({ data }, `${this.constructor.name}.${this.create.name}: Creating user`);

            const [user] = await db.insert(userTable).values(data).returning();

            logger.info({ userId: user!.id }, `${this.constructor.name}.${this.create.name}: User created`);

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
        try {
            logger.info({ userId }, `${this.constructor.name}.${this.getById.name}: Fetching user`);

            const [user] = await db.select().from(userTable).where(eq(userTable.id, userId));

            if (!user) {
                logger.warn({ userId }, `${this.constructor.name}.${this.getById.name}: User not found`);
                return null;
            }

            logger.info({ userId }, `${this.constructor.name}.${this.getById.name}: User fetched`);

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
        try {
            logger.info({ organizationId, options }, `${this.constructor.name}.${this.getByOrganization.name}: Fetching users for organization`);

            const conditions = [eq(userTable.organization_id, organizationId)];
            if (options?.pageToken) conditions.push(gt(userTable.id, options.pageToken));

            const users = await db.select().from(userTable).where(and(...conditions)).orderBy(asc(userTable.id))
                .limit(options?.count ?? DEFAULT_PAGE_SIZE);

            logger.info({ organizationId, count: users.length }, `${this.constructor.name}.${this.getByOrganization.name}: Fetched users for organization`);

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
        try {
            logger.info({ userId, data }, `${this.constructor.name}.${this.update.name}: Updating user`);

            const [user] = await db.update(userTable).set(data).where(eq(userTable.id, userId)).returning();

            if (!user) {
                logger.warn({ userId }, `${this.constructor.name}.${this.update.name}: User not found`);
                return null;
            }

            logger.info({ userId }, `${this.constructor.name}.${this.update.name}: User updated`);

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
        try {
            logger.info({ userId }, `${this.constructor.name}.${this.delete.name}: Deleting user`);

            const [user] = await db.delete(userTable).where(eq(userTable.id, userId)).returning();

            if (!user) {
                logger.warn({ userId }, `${this.constructor.name}.${this.delete.name}: User not found`);
                return null;
            }

            logger.info({ userId }, `${this.constructor.name}.${this.delete.name}: User deleted`);

            return user;
        } catch (error) {
            logger.error({ err: error, userId }, `Exception in ${this.constructor.name}.${this.delete.name}: Failed to delete user`);
            throw error;
        }
    }
}
