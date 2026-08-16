import { eq } from "drizzle-orm";
import { db, logger } from "../libs";
import { userTable, type IUser } from "../models";

/** Fields accepted when creating a new user row. */
export interface CreateUserInput {
    /** Login identity - required, must be unique. */
    email: string;
    /** Bcrypt hash of the user's password; omitted/null for an invited-but-not-yet-activated user. */
    password_hash?: string | null;
    first_name?: string;
    last_name?: string;
    description?: string;
    normalized_name?: string;
}

/** Fields accepted when partially updating an existing user row. */
export interface UpdateUserInput {
    email?: string;
    password_hash?: string | null;
    first_name?: string;
    last_name?: string;
    description?: string;
    normalized_name?: string;
}

/**
 * Strips `password_hash` off a user row before it's serialized to JSON - a
 * bcrypt hash should never round-trip over HTTP, even though it's not
 * usable to an attacker on its own. Every controller that returns a user
 * (directly, or spread into a larger response object) must pass it through
 * this first.
 *
 * @param user - The full user row, as returned by this service.
 * @returns The same row with `password_hash` removed.
 */
export function toPublicUser(user: IUser): Omit<IUser, "password_hash"> {
    const { password_hash, ...publicUser } = user;
    return publicUser;
}

/**
 * Data-access layer for `user` rows. A user's identity is
 * organization-independent - which organizations they belong to, and what
 * role they hold in each, is `OrganizationUserService`'s job. Wraps
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
     * Fetches a single user by email. Used by signup (to detect an existing
     * or invited account) and signin (to look up credentials).
     *
     * @param email - email of the user.
     * @returns The user row, or `null` if no match exists.
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async getByEmail(email: string) {
        logger.info(`Start method: ${this.constructor.name}.${this.getByEmail.name}`);
        logger.debug({ email }, `Request:`);

        try {
            const [user] = await db.select().from(userTable).where(eq(userTable.email, email));

            if (!user) {
                logger.warn({ email }, `${this.constructor.name}.${this.getByEmail.name}: User not found`);
                return null;
            }

            logger.debug({ userId: user.id }, `Response:`);
            logger.info(`End method: ${this.constructor.name}.${this.getByEmail.name}`);

            return user;
        } catch (error) {
            logger.error({ err: error, email }, `Exception in ${this.constructor.name}.${this.getByEmail.name}: Failed to get user by email`);
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
