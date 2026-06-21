import { Hono } from "hono";
import { UserController } from "../controllers";
import { UserService } from "../services";

// Wired up once per process; Hono handlers are bound instance methods, so a
// single shared controller/service pair is safe to reuse across requests.
const userService = new UserService();
const userController = new UserController(userService);

/**
 * Routes for the `/users` resource.
 *
 * - GET /:id - fetch a single user by id.
 */
export const userRoute = new Hono()
    .get('/:id', userController.get)
