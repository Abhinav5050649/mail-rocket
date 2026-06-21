import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { sign } from "hono/jwt";
import { logger } from "../libs";
import { UserService } from "../services";
import { config } from "../../config";

/** How long an issued session JWT stays valid for. */
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

/**
 * HTTP layer for authentication endpoints. Sits downstream of the
 * `githubAuth` middleware (see `AuthRoute.ts`), which has already exchanged
 * GitHub's OAuth code and populated `c.get('user-github')` by the time these
 * handlers run.
 */
export class AuthController {
    constructor(private userService: UserService) {
    }

    /**
     * GET /auth/github (post-`githubAuth` middleware)
     * Upserts the authenticated GitHub user and issues a session JWT.
     *
     * @param c - Hono request context; expects `user-github` to already be
     *   set by the `githubAuth` middleware.
     * @returns JSON response `{ user, token }`.
     * @throws {HTTPException} 400 if GitHub didn't return a usable profile.
     */
    githubCallback = async (c: Context) => {
        const githubUser = c.get('user-github');

        if (!githubUser || !githubUser.id || !githubUser.login) {
            throw new HTTPException(400, { message: "GitHub authentication failed" });
        }

        logger.info({ githubId: githubUser.id, username: githubUser.login }, `${this.constructor.name}.${this.githubCallback.name}: GitHub login`);

        const user = await this.userService.findOrCreateFromGithub({
            github_id: githubUser.id,
            username: githubUser.login,
            name: githubUser.name,
            email: githubUser.email ?? undefined,
            avatar_url: githubUser.avatar_url,
        });

        const token = await sign(
            { sub: user.id, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS },
            config.jwtSecret
        );

        logger.info({ userId: user.id }, `${this.constructor.name}.${this.githubCallback.name}: Issued session token`);

        return c.json({ user, token });
    }
}
