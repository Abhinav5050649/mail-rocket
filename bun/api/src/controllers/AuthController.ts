import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { logger } from "../libs";
import { AuthService } from "../services";

/** Minimal email shape check - good enough to catch typos, not full RFC 5322 validation. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Shortest password signup/signin will accept. */
const MIN_PASSWORD_LENGTH = 8;

/**
 * HTTP layer for password-based authentication (`/auth`). These are the
 * only endpoints in the API that don't require an `Authorization` header -
 * see `AppRoute` for how the public/protected split is wired up. There's no
 * validation library in this project, so request bodies are checked by
 * hand here, matching the terse style already used for missing route
 * params elsewhere.
 */
export class AuthController {
    constructor(private authService: AuthService) {
    }

    /**
     * POST /auth/signup
     * Creates credentials for an email - either a brand new account, or
     * (if the email belongs to a user invited by an org admin but never
     * activated) attaches a password to that existing row.
     *
     * @param c - Hono request context; expects a JSON body with `email`,
     * `password`, and optionally `first_name`/`last_name`.
     * @returns JSON response with `{ user, token }`.
     * @throws {HTTPException} 400 if `email`/`password` are missing or invalid.
     * @throws {HTTPException} 409 if the email already belongs to an active account.
     */
    signup = async (c: Context) => {
        logger.info(`Start method: ${this.constructor.name}.${this.signup.name}`);

        const { email, password, first_name, last_name } = await c.req.json();

        logger.debug({ email }, `Request:`);

        if (!email || !password) {
            throw new HTTPException(400, { message: "Missing Parameters: email, password" });
        }

        if (!EMAIL_PATTERN.test(email)) {
            throw new HTTPException(400, { message: "Invalid email format" });
        }

        if (password.length < MIN_PASSWORD_LENGTH) {
            throw new HTTPException(400, { message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` });
        }

        const result = await this.authService.signup({ email, password, first_name, last_name });

        if (!result) {
            throw new HTTPException(409, { message: "Email already registered" });
        }

        logger.debug({ userId: result.user.id }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.signup.name}`);

        return c.json(result, 201);
    }

    /**
     * POST /auth/signin
     * Verifies credentials and issues an auth token.
     *
     * @param c - Hono request context; expects a JSON body with `email`/`password`.
     * @returns JSON response with `{ user, token }`.
     * @throws {HTTPException} 400 if `email`/`password` are missing.
     * @throws {HTTPException} 401 if the credentials don't match an active account.
     */
    signin = async (c: Context) => {
        logger.info(`Start method: ${this.constructor.name}.${this.signin.name}`);

        const { email, password } = await c.req.json();

        logger.debug({ email }, `Request:`);

        if (!email || !password) {
            throw new HTTPException(400, { message: "Missing Parameters: email, password" });
        }

        const result = await this.authService.signin({ email, password });

        if (!result) {
            // Deliberately the same message whether the email doesn't exist,
            // was never activated, or the password is wrong - so the
            // response can't be used to enumerate registered emails.
            throw new HTTPException(401, { message: "Invalid email or password" });
        }

        logger.debug({ userId: result.user.id }, `Response:`);
        logger.info(`End method: ${this.constructor.name}.${this.signin.name}`);

        return c.json(result);
    }
}
