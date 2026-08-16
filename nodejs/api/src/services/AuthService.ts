import { logger, hashPassword, verifyPassword, signAuthToken } from "../libs";
import { UserService, toPublicUser } from "./UserService";

/** Fields accepted by signup. */
export interface SignupInput {
    email: string;
    password: string;
    first_name?: string;
    last_name?: string;
}

/** Fields accepted by signin. */
export interface SigninInput {
    email: string;
    password: string;
}

/**
 * Business logic for password-based authentication. Wraps `UserService`
 * (data access) plus the password/JWT libs (hashing, signing) with
 * structured logging around every operation, matching the rest of the
 * service layer.
 */
export class AuthService {
    constructor(private userService: UserService) {
    }

    /**
     * Creates credentials for `input.email`.
     *
     * - If no user exists yet for that email, creates a brand new account.
     * - If a user exists but has never set a password (`password_hash` is
     *   null - e.g. an org admin invited them by email only), attaches
     *   credentials to that existing row instead of creating a duplicate.
     *   This is the invite-activation flow.
     * - If a user already has an active password, signup is refused - this
     *   is not a "forgot password" flow, and letting an anonymous caller
     *   overwrite an existing account's credentials just by knowing its
     *   email would be an account-takeover hole.
     *
     * @param input - email/password (and optional profile fields, used
     * only when creating a brand new account).
     * @returns `{ user, token }` on success, or `null` if the email
     * already belongs to an activated account.
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async signup(input: SignupInput) {
        logger.info(`Start method: ${this.constructor.name}.${this.signup.name}`);
        logger.debug({ email: input.email }, `Request:`);

        const existing = await this.userService.getByEmail(input.email);

        if (existing && existing.password_hash) {
            logger.warn({ email: input.email }, `${this.constructor.name}.${this.signup.name}: Email already registered`);
            return null;
        }

        const password_hash = await hashPassword(input.password);

        const user = existing
            // Invited-but-uncredentialed row: only attach credentials, leave
            // the rest of the profile (set at invite time) untouched.
            ? await this.userService.update(existing.id, { password_hash })
            : await this.userService.create({
                email: input.email,
                password_hash,
                first_name: input.first_name,
                last_name: input.last_name,
            });

        const token = await signAuthToken(user!.id, user!.email);

        logger.debug({ userId: user!.id }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.signup.name}`);

        return { user: toPublicUser(user!), token };
    }

    /**
     * Verifies credentials and issues an auth token.
     *
     * @param input - email/password to verify.
     * @returns `{ user, token }` if the credentials are valid, or `null` if
     * the email doesn't exist, has no password set yet (invited but not
     * activated), or the password doesn't match.
     * @throws Re-throws any error from the underlying query, after logging it.
     */
    async signin(input: SigninInput) {
        logger.info(`Start method: ${this.constructor.name}.${this.signin.name}`);
        logger.debug({ email: input.email }, `Request:`);

        const user = await this.userService.getByEmail(input.email);

        if (!user || !user.password_hash) {
            logger.warn({ email: input.email }, `${this.constructor.name}.${this.signin.name}: No active credentials for email`);
            return null;
        }

        const passwordMatches = await verifyPassword(input.password, user.password_hash);

        if (!passwordMatches) {
            logger.warn({ email: input.email }, `${this.constructor.name}.${this.signin.name}: Password mismatch`);
            return null;
        }

        const token = await signAuthToken(user.id, user.email);

        logger.debug({ userId: user.id }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.signin.name}`);

        return { user: toPublicUser(user), token };
    }
}
