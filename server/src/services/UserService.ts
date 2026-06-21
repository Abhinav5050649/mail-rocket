import { logger } from "../libs";
import { UserModel } from "../models";

/** Fields accepted when creating a new user document. */
export interface CreateUserInput {
    github_id: number;
    username: string;
    name?: string;
    email?: string;
    avatar_url?: string;
}

/** Fields accepted when partially updating an existing user document. */
export interface UpdateUserInput {
    username?: string;
    name?: string;
    email?: string;
    avatar_url?: string;
    last_login_at?: Date;
}

/**
 * Data-access layer for `User` documents. Wraps `UserModel` (Mongoose) and
 * adds structured logging around every operation: an `info` log when the
 * operation starts, `info`/`warn` on completion depending on whether a
 * document was found, and `error` (with the full stack via the pino `err`
 * serializer) if the underlying query throws.
 */
export class UserService {

    /**
     * Creates a new user document.
     *
     * @param data - Fields for the new user.
     * @returns The created user document.
     * @throws Re-throws any error from the underlying Mongoose call (e.g. a
     *   duplicate-key error on `github_id`), after logging it.
     */
    async create(data: CreateUserInput) {
        try {
            logger.info({ data }, `${this.constructor.name}.${this.create.name}: Creating user`);

            const user = await UserModel.create(data);

            logger.info({ userId: user.id }, `${this.constructor.name}.${this.create.name}: User created`);

            return user;
        } catch (error) {
            logger.error({ err: error, data }, `Exception in ${this.constructor.name}.${this.create.name}: Failed to create user`);
            throw error;
        }
    }

    /**
     * Fetches a single user by Mongo `_id`.
     *
     * @param userId - Mongo `_id` of the user.
     * @returns The user document, or `null` if no match exists.
     * @throws Re-throws any error from the underlying Mongoose call (e.g. a
     *   malformed `_id`), after logging it.
     */
    async getById(userId: string) {
        try {
            logger.info({ userId }, `${this.constructor.name}.${this.getById.name}: Fetching user`);

            const user = await UserModel.findById(userId);

            if (!user) {
                logger.warn({ userId }, `${this.constructor.name}.${this.getById.name}: User not found`);
                return user;
            }

            logger.info({ userId }, `${this.constructor.name}.${this.getById.name}: User fetched`);

            return user;
        } catch (error) {
            logger.error({ err: error, userId }, `Exception in ${this.constructor.name}.${this.getById.name}: Failed to get user`);
            throw error;
        }
    }

    /**
     * Partially updates a user document.
     *
     * @param userId - Mongo `_id` of the user to update.
     * @param data - Fields to update.
     * @returns The updated user document, or `null` if no match exists.
     * @throws Re-throws any error from the underlying Mongoose call, after logging it.
     */
    async update(userId: string, data: UpdateUserInput) {
        try {
            logger.info({ userId, data }, `${this.constructor.name}.${this.update.name}: Updating user`);

            const user = await UserModel.findByIdAndUpdate(userId, data, { new: true });

            if (!user) {
                logger.warn({ userId }, `${this.constructor.name}.${this.update.name}: User not found`);
                return user;
            }

            logger.info({ userId }, `${this.constructor.name}.${this.update.name}: User updated`);

            return user;
        } catch (error) {
            logger.error({ err: error, userId, data }, `Exception in ${this.constructor.name}.${this.update.name}: Failed to update user`);
            throw error;
        }
    }

    /**
     * Finds the user matching a GitHub profile, creating one if this is
     * their first login, and refreshes their cached profile fields
     * (username/name/email/avatar can all change on GitHub's side between
     * logins) plus `last_login_at` either way.
     *
     * Implemented as a single atomic `findOneAndUpdate` with `upsert: true`
     * rather than a separate find-then-create/update, so two simultaneous
     * logins from the same new GitHub account can't race into a duplicate
     * `github_id`.
     *
     * @param profile - Profile fields read from GitHub's `/user` endpoint.
     * @returns The matched or newly created user document.
     * @throws Re-throws any error from the underlying Mongoose call, after logging it.
     */
    async findOrCreateFromGithub(profile: CreateUserInput) {
        try {
            logger.info({ githubId: profile.github_id }, `${this.constructor.name}.${this.findOrCreateFromGithub.name}: Upserting user from GitHub profile`);

            const user = await UserModel.findOneAndUpdate(
                { github_id: profile.github_id },
                {
                    $set: {
                        username: profile.username,
                        name: profile.name,
                        email: profile.email,
                        avatar_url: profile.avatar_url,
                        last_login_at: new Date(),
                    },
                },
                { new: true, upsert: true }
            );

            logger.info({ userId: user.id, githubId: profile.github_id }, `${this.constructor.name}.${this.findOrCreateFromGithub.name}: User upserted`);

            return user;
        } catch (error) {
            logger.error({ err: error, profile }, `Exception in ${this.constructor.name}.${this.findOrCreateFromGithub.name}: Failed to upsert user from GitHub profile`);
            throw error;
        }
    }

    /**
     * Deletes a user document.
     *
     * @param userId - Mongo `_id` of the user to delete.
     * @returns The deleted user document, or `null` if no match exists.
     * @throws Re-throws any error from the underlying Mongoose call, after logging it.
     */
    async delete(userId: string) {
        try {
            logger.info({ userId }, `${this.constructor.name}.${this.delete.name}: Deleting user`);

            const user = await UserModel.findByIdAndDelete(userId);

            if (!user) {
                logger.warn({ userId }, `${this.constructor.name}.${this.delete.name}: User not found`);
                return user;
            }

            logger.info({ userId }, `${this.constructor.name}.${this.delete.name}: User deleted`);

            return user;
        } catch (error) {
            logger.error({ err: error, userId }, `Exception in ${this.constructor.name}.${this.delete.name}: Failed to delete user`);
            throw error;
        }
    }
}
