import { Hono } from "hono";
import { githubAuth } from "@hono/oauth-providers/github";
import { AuthController } from "../controllers";
import { UserService } from "../services";
import { config } from "../../config";

// Wired up once per process; Hono handlers are bound instance methods, so a
// single shared controller/service pair is safe to reuse across requests.
const userService = new UserService();
const authController = new AuthController(userService);

/**
 * Routes for GitHub-based authentication.
 *
 * - GET /github - starts the GitHub App user-authorization flow. GitHub
 *   redirects back to this exact same URL with `?code&state` appended (the
 *   `githubAuth` middleware infers `redirect_uri` from the current request
 *   URL), at which point it exchanges the code, fetches the profile, and
 *   `authController.githubCallback` upserts the user and issues a session JWT.
 *
 * `oauthApp: false` because this targets a GitHub App, not a classic OAuth
 * App - GitHub Apps don't accept a `scope` query param at login; granted
 * permissions are fixed in the app's settings on GitHub's side instead.
 * Repository access (a separate "Install App" + installation-token flow)
 * is not implemented yet - this only authenticates/identifies the user.
 */
export const authRoute = new Hono()
    .get(
        '/github',
        githubAuth({
            client_id: config.githubClientId,
            client_secret: config.githubClientSecret,
            oauthApp: false,
        }),
        authController.githubCallback
    );
