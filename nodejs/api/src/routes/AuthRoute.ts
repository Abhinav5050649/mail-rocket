import { Hono } from "hono";
import { AuthController } from "../controllers";
import { AuthService, UserService } from "../services";

// Wired up once per process; Hono handlers are bound instance methods, so a
// single shared controller/service pair is safe to reuse across requests.
const userService = new UserService();
const authService = new AuthService(userService);
const authController = new AuthController(authService);

/**
 * Routes for the `/auth` resource - the only endpoints in the API that
 * don't require an `Authorization` header (see `AppRoute`'s public/protected
 * split).
 *
 * - POST /signup - create credentials for an email (new account, or activating an invite).
 * - POST /signin - verify credentials and receive an auth token.
 */
export const authRoute = new Hono()
    .post('/signup', authController.signup)
    .post('/signin', authController.signin)
