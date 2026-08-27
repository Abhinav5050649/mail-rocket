import { sign, verify } from "hono/jwt";
import { config } from "../../config";

/** Signing algorithm used for every token this API issues/verifies. */
const ALGORITHM = "HS256";

/**
 * Shape of the payload encoded into every auth token this API issues. The
 * index signature is required by `hono/jwt`'s `JWTPayload` type.
 */
export interface AuthTokenPayload {
    [key: string]: unknown;
    /** Subject - the authenticated user's id. */
    sub: string;
    /** The user's email, included so callers don't need a lookup just to display it. */
    email: string;
    /** Unix timestamp (seconds) after which the token is no longer valid. */
    exp: number;
}

/**
 * Signs a new auth token for a user, valid for `config.jwtExpiresInSeconds`
 * from now. Callers receive this token from signup/signin and must send it
 * back as `Authorization: Bearer <token>` on every subsequent request.
 *
 * @param userId - id of the authenticated user.
 * @param email - email of the authenticated user.
 * @returns A signed JWT string.
 */
export async function signAuthToken(userId: string, email: string): Promise<string> {
    const payload: AuthTokenPayload = {
        sub: userId,
        email,
        exp: Math.floor(Date.now() / 1000) + config.jwtExpiresInSeconds,
    };

    return sign(payload, config.jwtSecret, ALGORITHM);
}

/**
 * Verifies an auth token's signature and expiry.
 *
 * @param token - The raw JWT string (without the `Bearer ` prefix).
 * @returns The decoded payload.
 * @throws If the token's signature is invalid or it has expired.
 */
export async function verifyAuthToken(token: string): Promise<AuthTokenPayload> {
    const payload = await verify(token, config.jwtSecret, ALGORITHM);
    return payload as AuthTokenPayload;
}
